# Setup · Karbot Landing API

Backend Cloudflare Worker que expone 2 endpoints para la landing:
- `GET /availability?days=14` — slots libres de Isabel próximos N días (lee `freebusy.query` de Google Calendar API)
- `POST /book` — crea evento en el calendar de Isabel con Google Meet auto-generado

## Qué se necesita antes de correr esto

### 1 · Google Cloud Project (5 min · lo hace Chucho o Marketon admin)

**No** desde la cuenta de Google Calendar de Isabel. Desde **Google Cloud Console** (`console.cloud.google.com`) con una cuenta admin de Marketon (ej. `chucho@marketon.mx`).

1. Ir a https://console.cloud.google.com/projectcreate
2. Crear proyecto `karbot-landing` (o el nombre que quieras)
3. En el proyecto, ir a **APIs & Services → Library**
4. Habilitar 2 APIs:
   - **Google Calendar API**
   - **Google Meet API** (para links de Meet auto-generados)
5. Ir a **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - App name: `Karbot Landing`
   - User support email: `chucho@marketon.mx`
   - Scopes: agregar `https://www.googleapis.com/auth/calendar.events` (create/edit events) + `https://www.googleapis.com/auth/calendar.readonly` (freebusy)
   - **Test users:** agregar `isabel@karlo.io` — clave para que Isabel pueda autorizar mientras la app esté en modo test
6. Ir a **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**
   - Name: `karbot-landing-worker`
   - Authorized redirect URIs: agregar `https://developers.google.com/oauthplayground` (temporal, para obtener refresh token)
7. Al crear, Google te da:
   - **Client ID** (guardarlo)
   - **Client Secret** (guardarlo)

### 2 · Isabel autoriza acceso (5 min · lo hace Isabel una sola vez)

Con Client ID y Client Secret arriba, sacamos el **refresh token** de Isabel usando OAuth Playground:

1. Isabel abre https://developers.google.com/oauthplayground (con su cuenta `isabel@karlo.io`)
2. Click en el engranaje ⚙️ arriba a la derecha → marcar "Use your own OAuth credentials" → pegar Client ID + Client Secret
3. En "Step 1 · Select & authorize APIs" → escribir manual los 2 scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
4. Click **Authorize APIs** → Isabel loguea con `isabel@karlo.io` y acepta
5. En "Step 2" → click **Exchange authorization code for tokens**
6. **Copiar el `refresh_token`** que aparece. Es la llave que el Worker usa para renovar acceso a Google Calendar de Isabel sin volver a pedir permisos.

### 3 · Setup del Worker (2 min · Chucho + Claude)

```bash
cd clients/karbot/worker
npm install
wrangler login   # una vez, autentica con Cloudflare

# Guardar los 3 secrets (uno a uno, pega el valor cuando pida)
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REFRESH_TOKEN

# Deploy
wrangler deploy
```

Después del deploy, `wrangler` da la URL del worker (algo tipo `https://karbot-landing-api.chucho-workers.workers.dev`). Esa URL es la que la landing llama en `/availability` y `/book`.

### 4 · Actualizar la landing (1 min)

En `clients/karbot/index.html` cambiar la constante `WORKER_URL` (arriba del script principal) por la URL real del Worker que dio `wrangler deploy`.

Después del cambio, commit + push · GitHub Pages redespliega solo.

## Variables editables sin redeploy

En `wrangler.toml` sección `[vars]` se pueden cambiar sin re-deploy de secrets:
- `BUSINESS_HOURS_START` / `BUSINESS_HOURS_END` — ventana horaria diaria (Isabel)
- `SLOT_MINUTES` — duración de cada demo (default 30 min)
- `BUFFER_MINUTES` — buffer entre demos (default 15 min)
- `TIMEZONE` — default `America/Mexico_City`
- `DAYS_OF_WEEK` — default `1,2,3,4,5` (lunes a viernes)
- `ISABEL_CALENDAR_ID` — `primary` funciona; para calendars secundarios usar el email del calendar

Después de editar `[vars]`: `wrangler deploy` re-empuja solo la config sin tocar secrets.

## Costos

- **Cloudflare Worker:** free tier · 100,000 requests/día · más que suficiente para landing
- **Google Calendar API:** gratis · quota generosa (1M requests/día)

## Cuando quieras revocar acceso

Isabel puede revocar el acceso del Worker en cualquier momento desde https://myaccount.google.com/permissions → busca "Karbot Landing" → Remove access. El Worker deja de funcionar hasta que se re-autorice (se rehace paso 2).

## Publicar la OAuth app (si sale de "modo test")

Mientras la app esté en modo test en Google Cloud, solo los `test users` autorizados (Isabel) pueden loguear. Si en algún momento quieres agregar más usuarios (ej. otro comercial), o publicar de verdad:
1. **Opción rápida:** agregar más test users en OAuth consent screen (max 100)
2. **Opción producción:** botón "Publish App" en OAuth consent screen → Google pide verification si usas scopes sensitive (Calendar sí es sensitive). Puede tardar 4-6 semanas. Solo necesario si quieres muchos usuarios.

Para el caso de Karbot (solo Isabel), modo test es suficiente hasta que Karbot escale a más comerciales.
