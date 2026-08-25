#!/usr/bin/env python3
"""
Vigilancia diaria del sistema de adquisicion de APTO.

Existe por una razon concreta: en agosto 2026 el formulario de la landing estuvo
17 dias sin registrar en HubSpot y nadie se entero hasta que alguien lo reviso a
mano. Este script convierte esa falla silenciosa en una alerta al dia siguiente.

Que revisa, sin crear ningun registro:
  1. Flujo de leads. Si con campanas activas no entra ni un lead en varios dias,
     algo se rompio. Es la senal que faltaba en agosto.
  2. Salud de los envios. Que HubSpot y Meta CAPI no esten fallando en los que si entran.
  3. Integridad del contenedor GTM en vivo. Que sigan ahi los dos generate_lead,
     el advanced matching del Pixel y los 15 CTAs medidos.
  4. Integridad del formulario de la landing. Que sigan sus campos y su endpoint.

Uso:   python3 reconciliar-leads.py
Salida: codigo 1 si hay algo que revisar, para que un cron lo detecte.
"""
import json, re, subprocess, sys, urllib.request

WORKER_DIR = "/Users/JPEREZ/Documents/marketon-clients/clients/apto/worker"
GTM = "https://www.googletagmanager.com/gtm.js?id=GTM-K7J6MQ8"
LANDING = "https://landing.apto.mx/"
DIAS_SIN_LEADS_ALERTA = 4

problemas, avisos = [], []


def d1(sql):
    p = subprocess.run(["npx", "wrangler", "d1", "execute", "apto-leads", "--remote",
                        "--json", "--command", sql], cwd=WORKER_DIR, capture_output=True, text=True)
    return json.loads(p.stdout)[0]["results"]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 apto-monitor"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")


print("Vigilancia sistema de adquisicion APTO\n" + "=" * 48)

# 1 y 2 · flujo y salud de los leads
print("\n[1] Flujo de leads")
r = d1("""SELECT
   (SELECT COUNT(*) FROM leads WHERE created_at >= datetime('now','-7 days')) AS landing_7d,
   (SELECT COUNT(*) FROM leads WHERE created_at >= datetime('now','-30 days')) AS landing_30d,
   (SELECT MAX(created_at) FROM leads) AS ultimo_landing,
   (SELECT COUNT(*) FROM webhook_events WHERE processed_status='deal_created'
      AND created_at >= datetime('now','-7 days')) AS principal_7d,
   (SELECT MAX(created_at) FROM webhook_events WHERE processed_status='deal_created') AS ultimo_principal;""")[0]

print(f"  landing.apto.mx  · 7d: {r['landing_7d']:>3} · 30d: {r['landing_30d']:>3} · ultimo: {r['ultimo_landing']}")
print(f"  apto.mx          · 7d: {r['principal_7d']:>3} · ultimo: {r['ultimo_principal']}")

# Por sitio, no combinado: si apto.mx trae leads y la landing no, el promedio
# lo tapa. En agosto la landing estuvo rota mientras el sitio principal seguia
# entrando leads, que es justo como pasa desapercibido.
for etiqueta, sql in [
    ("landing.apto.mx", "SELECT CAST(julianday('now') - julianday(MAX(created_at)) AS INT) AS d FROM leads;"),
    ("apto.mx", "SELECT CAST(julianday('now') - julianday(MAX(created_at)) AS INT) AS d FROM webhook_events WHERE processed_status='deal_created';"),
]:
    d = d1(sql)[0]["d"]
    if d is None:
        problemas.append(f"{etiqueta}: ningun lead registrado nunca")
    elif d >= DIAS_SIN_LEADS_ALERTA:
        problemas.append(f"{etiqueta}: {d} dias sin un solo lead")
    else:
        print(f"  {etiqueta}: ultimo lead hace {d} dia(s) · ok")

print("\n[2] Salud de los envios (ultimos 30 dias)")
for fila in d1("""SELECT hubspot_status, meta_capi_status, COUNT(*) AS n FROM leads
                  WHERE created_at >= datetime('now','-30 days')
                  GROUP BY hubspot_status, meta_capi_status;"""):
    print(f"  hubspot={fila['hubspot_status']} meta={fila['meta_capi_status']} → {fila['n']}")
    if fila["hubspot_status"] != "success":
        problemas.append(f"{fila['n']} lead(s) con hubspot_status={fila['hubspot_status']}")
    if fila["meta_capi_status"] not in ("success", "skipped"):
        avisos.append(f"{fila['n']} lead(s) con meta_capi_status={fila['meta_capi_status']}")

# 3 · integridad del contenedor GTM en vivo
print("\n[3] Contenedor GTM en vivo")
gtm = get(GTM)
checks = [
    ("dos tags generate_lead (landing + apto.mx)", len(re.findall(r'vtp_eventName":"generate_lead"', gtm)) == 2),
    ("origen distinguible (landing_apto_mx + apto_mx_web)", "landing_apto_mx" in gtm and "apto_mx_web" in gtm),
    ("advanced matching del Pixel en los dos sitios", len(re.findall(r"fbq\('init','721335916342252'", gtm)) == 2),
    ("los 15 CTAs que abren el formulario, medidos", "skip_link_form_click" in gtm and "sticky_cta_click" in gtm),
    ("sin duplicado landing_page_form_submit", "landing_page_form_submit" not in gtm),
    ("eventID determinista para dedup con CAPI", "apto-main-" in gtm),
]
for nombre, ok in checks:
    print(f"  {'ok  ' if ok else 'FALLA'} {nombre}")
    if not ok:
        problemas.append("GTM: " + nombre)

# 4 · integridad del formulario de la landing
print("\n[4] Formulario de la landing")
html = get(LANDING)
campos = ["f-firstname", "f-lastname", "f-email", "f-company", "f-phone_number", "f-privacy_consent"]
faltan = [c for c in campos if f'id="{c}"' not in html]
print(f"  {'ok  ' if not faltan else 'FALLA'} campos del formulario" + (f" · faltan {faltan}" if faltan else ""))
if faltan:
    problemas.append(f"Landing: faltan campos {faltan}")
ep = "apto-landing-api" in html or "workers.dev" in html
print(f"  {'ok  ' if ep else 'FALLA'} endpoint del Worker presente")
if not ep:
    problemas.append("Landing: no se encontro el endpoint del Worker")

print("\n" + "=" * 48)
if problemas:
    print("HAY QUE REVISAR:")
    for p in problemas:
        print("  ·", p)
if avisos:
    print("Avisos:")
    for a in avisos:
        print("  ·", a)
if not problemas:
    print("Todo en orden." + (" (con avisos)" if avisos else ""))
sys.exit(1 if problemas else 0)
