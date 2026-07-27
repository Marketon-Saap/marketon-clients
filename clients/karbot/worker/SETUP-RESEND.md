# Setup Resend · Notificaciones email de leads

Los leads del landing se guardan siempre en D1 (safety net Cloudflare · lees con `wrangler d1 execute karbot-leads --remote --command "SELECT * FROM leads ORDER BY id DESC LIMIT 20"`). Pero para que Isabel/Chucho/Diego/Alejandro reciban el correo con cada demo agendada, necesitamos Resend.

**Tiempo total**: ~15 min (5 min tu parte · 10 min propagación DNS).

---

## Paso 1 · Crear cuenta Resend (5 min, tú)

1. Abre https://resend.com/signup
2. Signup con `chucho@marketon.mx` (o el email que prefieras · queda como owner)
3. Verifica tu email (link que te llega)

---

## Paso 2 · Agregar dominio + verificarlo (Cloudflare DNS · te ayudo si quieres)

**Recomendación**: usar `karbot.mx` — el `from` de los emails será `Karbot Landing <no-reply@karbot.mx>`. Es natural para un lead que agenda demo Karbot.

1. En Resend → **Domains** → **Add Domain** → ingresa `karbot.mx`
2. Resend te da 3-4 DNS records (típicamente `SPF`, `DKIM` CNAME/TXT, y `MX` opcional para tracking)
3. **Opción A · agrego yo**: pásame captura de la pantalla con los records o los valores, y los agrego en tu Cloudflare DNS (karbot.mx está en Cloudflare nameservers).
4. **Opción B · agregas tú**: entra a https://dash.cloudflare.com/ → selecciona `karbot.mx` → DNS → Records → Add record por cada uno de los que dio Resend.
5. En Resend click **Verify Domain** · propagación 5-15 min típicamente (Cloudflare es rápido).

Cuando verifique aparece ✓ verde junto al dominio.

---

## Paso 3 · Generar API key (30 seg, tú)

1. En Resend → **API Keys** → **Create API Key**
2. Nombre: `karbot-landing-worker`
3. Permission: `Sending access` (no full access · solo mandar)
4. Domain: `karbot.mx` (el que verificaste)
5. Copia el token que te da (empieza con `re_...`) · **se muestra una sola vez**
6. Pásamelo por WhatsApp

---

## Paso 4 · Yo lo configuro en el Worker (1 min)

Cuando me pases el token corro:

```bash
cd clients/karbot/worker
echo "re_TU_TOKEN_AQUI" | wrangler secret put RESEND_API_KEY
wrangler deploy
```

Y hacemos un test submit desde la landing para verificar que llegan los 4 correos.

---

## Costos

- Free tier: 100 emails/día · 3,000/mes · para siempre
- Si excedes: $20/mes por 50k emails
- Muy por debajo del volumen esperado

---

## Fallback (mientras Resend no está)

**Todos los leads se guardan igual en D1** — no se pierde ninguno. Puedes revisarlos con:

```bash
cd clients/karbot/worker
wrangler d1 execute karbot-leads --remote --command "SELECT id, created_at, nombre, empresa, email, phone, slot_start FROM leads ORDER BY id DESC LIMIT 20"
```

O te armo un endpoint `/leads` con token de auth después, si quieres consultarlo desde un dashboard web.
