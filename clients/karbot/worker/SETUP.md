# Setup · Karbot Landing API

Backend Cloudflare Worker que expone endpoints para la landing:
- `GET /availability?days=14` — slots libres de Isabel próximos N días
- `POST /book` — crea evento con Google Meet auto-generado
- `GET /oauth/start` — inicia autorización (1 sola vez, Isabel)
- `GET /oauth/callback` — captura refresh_token (1 sola vez)

**Tiempo total setup:** ~20 min (10 min tú + 5 min Isabel + 5 min deploy).

---

## Paso 1 · Google Cloud Project (tú · 5-10 min)

### Opción A · CLI express (recomendada si tienes `gcloud` instalado)

```bash
# Instalar gcloud si no lo tienes (macOS):
# brew install --cask google-cloud-sdk

# Login con tu cuenta chucho@marketon.mx
gcloud auth login

# Crear proyecto
export PROJECT_ID="karbot-landing-$(date +%s | tail -c 5)"
gcloud projects create $PROJECT_ID --name="Karbot Landing"
gcloud config set project $PROJECT_ID

# Habilitar las 2 APIs necesarias
gcloud services enable calendar-json.googleapis.com
gcloud services enable meet.googleapis.com

echo "PROJECT_ID=$PROJECT_ID"
```

Guarda el `PROJECT_ID` que te devuelve.

**Lo que sigue (OAuth consent screen + OAuth Client ID) NO tiene CLI viable · se hace en la consola web:**

### Opción B · Manual en Cloud Console (5 min)

1. `console.cloud.google.com/projectcreate` → proyecto `karbot-landing` con tu cuenta `chucho@marketon.mx`
2. En el proyecto: **APIs & Services → Library** → habilita
   - **Google Calendar API**
   - **Google Meet API**

---

## Paso 2 · OAuth consent screen + Client ID (tú · 3-5 min · solo consola web)

Esta parte no tiene CLI · se hace en Cloud Console con tu cuenta.

1. **APIs & Services → OAuth consent screen**
   - User Type: **External** → Create
   - App name: `Karbot Landing`
   - User support email: `chucho@marketon.mx`
   - Developer contact: `chucho@marketon.mx`
   - Save and continue
   - **Scopes:** click "Add or Remove Scopes" → busca y agrega:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
   - **Test users:** agrega el email de Isabel (`isabel@karbot.mx` y/o `isabel@karlo.io` — ambos por si acaso)
   - Save
2. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Name: `karbot-landing-worker`
   - Authorized redirect URIs: agrega `https://karbot-landing-api.TU-NAMESPACE.workers.dev/oauth/callback`
     (temporalmente pon `https://example.com/callback` · lo actualizamos después de deployar el Worker)
   - Create
3. Google te da **Client ID** y **Client Secret**. Guárdalos.

---

## Paso 3 · Deploy Worker (2 min · Chucho o yo con tu wrangler login)

```bash
cd clients/karbot/worker
npm install
wrangler login   # una vez · autentica con Cloudflare

# Guardar Client ID y Client Secret como secrets
wrangler secret put GOOGLE_CLIENT_ID
# pega el Client ID cuando pida

wrangler secret put GOOGLE_CLIENT_SECRET
# pega el Client Secret cuando pida

# Deploy (aún sin refresh_token · el flow /oauth/* funciona sin él)
wrangler deploy
```

Wrangler te devuelve la URL final del Worker (ej. `https://karbot-landing-api.chucho.workers.dev`).

**Ahora vuelve al Cloud Console y actualiza el redirect URI del OAuth Client:**
- Credentials → click en `karbot-landing-worker` → Authorized redirect URIs → cambia por la URL real:
  `https://karbot-landing-api.chucho.workers.dev/oauth/callback`
- Save

---

## Paso 4 · Isabel autoriza (5 min · una sola vez)

Mándale a Isabel este link (reemplaza con tu URL real de Worker):

```
https://karbot-landing-api.chucho.workers.dev/oauth/start
```

Ella hace click, loguea con `isabel@karbot.mx` (o `isabel@karlo.io`, la cuenta donde tiene el calendar de demos), y autoriza los scopes.

**Verá una pantalla de Google** que dice *"Karbot Landing wants to access your Google Account"* con un warning *"Google hasn't verified this app"*. Es normal en modo test. Isabel debe hacer click en:
1. **Advanced** (link abajo)
2. **Go to Karbot Landing (unsafe)**
3. **Allow** para cada scope

Al terminar, la landing del callback le muestra el `refresh_token`. Le pide **copiar el bloque completo** (que empieza con `wrangler secret put GOOGLE_REFRESH_TOKEN` y sigue con el token) y **mandártelo a ti** por Discord.

---

## Paso 5 · Guardar refresh_token + activar (tú · 1 min)

```bash
cd clients/karbot/worker
wrangler secret put GOOGLE_REFRESH_TOKEN
# pega el refresh_token de Isabel cuando pida
```

Después edita `../index.html` y cambia:
```js
const WORKER_URL = 'https://karbot-landing-api.TU-URL.workers.dev';
const WORKER_ENABLED = true;
```

Commit + push a `karbot` + merge a `main` · Pages redespliega solo · **la landing empieza a mostrar slots reales de Isabel y crea eventos en su calendar sin UI de Google.**

---

## Config editable sin re-deploy secrets

En `wrangler.toml` sección `[vars]` (edición directa · `wrangler deploy` re-empuja config sin tocar secrets):

- `BUSINESS_HOURS_START` / `BUSINESS_HOURS_END` — ventana horaria diaria (default 10-18)
- `SLOT_MINUTES` — duración demo (default 30)
- `BUFFER_MINUTES` — buffer entre demos (default 15)
- `TIMEZONE` — default `America/Mexico_City`
- `DAYS_OF_WEEK` — default `1,2,3,4,5` (lunes-viernes · 0=domingo)
- `ISABEL_CALENDAR_ID` — `primary` funciona · para calendars secundarios usar email del calendar
- `ALLOWED_ORIGIN` — dominio de la landing (por CORS)

---

## Cuando quieras re-autorizar (Isabel cambió cuenta, etc.)

1. Isabel revoca acceso en `myaccount.google.com/permissions` → busca "Karbot Landing" → Remove access
2. Isabel visita de nuevo `/oauth/start` → autoriza → copia nuevo refresh_token
3. Tú: `wrangler secret put GOOGLE_REFRESH_TOKEN` con el nuevo valor
4. `wrangler deploy` (para forzar refresh de cache)

---

## Costos

- **Cloudflare Worker:** free tier · 100k requests/día
- **Google Calendar API:** gratis · quota 1M/día

---

## Producción real (opcional, cuando escales)

Mientras la app esté en **modo test** en Google Cloud, solo los emails en "Test users" pueden autorizar (max 100). Para el caso Karbot con solo Isabel, modo test es indefinidamente suficiente.

Si en algún momento agregas más comerciales que necesiten autorizar (ej. Erika, otro asesor), agrégalos como test users en OAuth consent screen — sin necesidad de publicar la app.

Publicar la app (botón **Publish App** en OAuth consent screen) solo se necesita si quieres autorización pública abierta a cualquier email · Google hace verification que tarda 4-6 semanas por scopes sensitive de Calendar. Normalmente no lo necesitas.
