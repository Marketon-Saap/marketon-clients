# Setup Email Notifications · Gmail API

Los leads del landing se guardan siempre en D1 (safety net Cloudflare) y se envía un correo notification a cada nuevo lead a los 4 destinatarios:
- `isabel@karlo.io`
- `chucho@marketon.mx`
- `diego@karlo.io`
- `alejandro@karlo.io`

El `from` es `Karbot Landing <chucho@marketon.mx>`. Los emails llegan en BCC (los 4 destinatarios no ven los otros correos).

**Estado**: LIVE. Autorización de Chucho hecha 2026-07-26.

---

## Cómo funciona

1. Usuario envía el form del landing
2. Cloudflare Worker (`karbot-landing-api`) recibe POST /book
3. **Safety net D1**: INSERT en tabla `leads` (siempre, primero — si D1 falla, el request 500-ea)
4. **Google Calendar**: si hay `GOOGLE_CALENDAR_REFRESH_TOKEN` (Isabel autorizada), crea evento con Google Meet auto
5. **Gmail API**: usando `GOOGLE_GMAIL_REFRESH_TOKEN` (Chucho autorizado), manda email a los 4 destinatarios desde `chucho@marketon.mx`
6. Actualiza el row del lead en D1 con `event_id`, `meet_link`, `email_sent` status
7. Devuelve al frontend `{ok, leadId, meetLink, mock, ...}` — el frontend muestra success card

Los pasos 4 y 5 son **soft-fail**: si Gmail falla, el lead se guarda de todas formas y `emailError` se logea en D1 para revisión posterior.

---

## Consulta leads guardados

```bash
cd clients/karbot/worker
wrangler d1 execute karbot-leads --remote --command "SELECT id, created_at, nombre, empresa, email, phone, agencias, rol, slot_start, mock, email_sent, email_error FROM leads ORDER BY id DESC LIMIT 20"
```

Todos los leads con `email_sent = 0` y `email_error != NULL` son notificaciones que fallaron — requieren atención manual.

---

## Re-autorizar Chucho (si el refresh_token expira o se revoca)

Chucho puede revocar el acceso desde https://myaccount.google.com/permissions (busca "grupo-plasencia-automotriz.workers.dev" → Remove access).

Para re-autorizar:
1. Chucho visita https://karbot-landing-api.grupo-plasencia-automotriz.workers.dev/oauth/start?service=gmail
2. Loguea con `chucho@marketon.mx`
3. Click **Permitir** en "Enviar correo electrónico en tu nombre"
4. El callback muestra un bloque `wrangler secret put GOOGLE_GMAIL_REFRESH_TOKEN` con el nuevo token
5. Copiar y correr ese comando:
   ```bash
   cd clients/karbot/worker
   echo "1//NUEVO_TOKEN_AQUI" | wrangler secret put GOOGLE_GMAIL_REFRESH_TOKEN
   ```
6. Verificar con un POST test:
   ```bash
   curl -s -X POST 'https://karbot-landing-api.grupo-plasencia-automotriz.workers.dev/book' \
     -H 'Content-Type: application/json' \
     -d '{"nombre":"Test","empresa":"Test","email":"chucho@marketon.mx","start":"2026-08-01T16:00:00.000Z","end":"2026-08-01T16:30:00.000Z"}' \
     | python3 -m json.tool
   ```
   Debe devolver `"emailSent": true`.

---

## Costos

- **Gmail API**: gratis (dentro de límites Gmail Workspace, ~2000 mensajes/día en cuentas standard, con 3s rate limit — muy por encima del volumen de leads Karbot)
- **Google Cloud Project (Marketon-SaaP)**: sin costos adicionales, solo uso de APIs gratuitas
- **Cloudflare Worker + D1**: free tier suficiente (100k req/día Worker, 5M reads/día D1)

**Cero costos externos.** Todo aprovecha infra ya existente de Chucho.

---

## Arquitectura de los 2 OAuth refresh_tokens

El mismo OAuth Client `karbot-landing-worker` sirve para 2 servicios distintos:

| Secret | Autoriza | Scope | Uso |
|---|---|---|---|
| `GOOGLE_CALENDAR_REFRESH_TOKEN` | Isabel (`isabel@karlo.io`) | `calendar.events` + `calendar.readonly` | freebusy.query + events.insert en calendar de Isabel |
| `GOOGLE_GMAIL_REFRESH_TOKEN` | Chucho (`chucho@marketon.mx`) | `gmail.send` | mandar notificaciones de leads |

Los flows OAuth están en 2 URLs:
- `/oauth/start?service=calendar` → Isabel
- `/oauth/start?service=gmail` → Chucho

El callback `/oauth/callback` recibe `?state=calendar` o `?state=gmail` y muestra el comando `wrangler secret put` correspondiente.

---

## Emails no llegan · troubleshooting

1. **Verifica que emailSent=true en el response**: `curl POST /book ...`. Si `emailSent=false`, mira `emailError`.
2. **Revisa D1 para historial**:
   ```bash
   wrangler d1 execute karbot-leads --remote --command "SELECT id, created_at, email_sent, email_error FROM leads WHERE email_sent = 0 ORDER BY id DESC"
   ```
3. **Revisa Gmail de Chucho** carpeta "Enviados" — cada notification aparece ahí como email self-sent con BCC a los 4. Puedes crear un filter Gmail para mover automáticamente a un label "Karbot Leads" y evitar ruido en Enviados.
4. **Errores comunes**:
   - `no_gmail_refresh_token` → El secret no está subido o expiró · re-autoriza (arriba)
   - `oauth_refresh_failed` → El refresh_token fue revocado · re-autoriza
   - `gmail_403` → Scope insufficient o dominio no permitido · verificar OAuth consent screen tiene `gmail.send` scope
