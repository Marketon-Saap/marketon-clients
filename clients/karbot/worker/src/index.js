/**
 * Karbot Landing · Backend API (Cloudflare Worker)
 *
 * 2 endpoints:
 * - GET  /availability?days=14   → slots libres de Isabel next N days
 * - POST /book                   → crea evento en calendar de Isabel con Google Meet
 *
 * Env vars requeridas (secrets):
 *   GOOGLE_CLIENT_ID       — OAuth client de Google Cloud Console
 *   GOOGLE_CLIENT_SECRET   — OAuth client secret
 *   GOOGLE_REFRESH_TOKEN   — Refresh token de Isabel (una autorización, dura hasta revoke)
 *   ISABEL_CALENDAR_ID     — "primary" o el email si prefieres
 *   ALLOWED_ORIGIN         — https://mktgrupoplasenciaautomotriz.github.io (o custom domain)
 *
 * Config Isabel (booking rules):
 *   BUSINESS_HOURS_START   — hora inicio (24h format, ej "10")
 *   BUSINESS_HOURS_END     — hora fin (ej "18")
 *   SLOT_MINUTES           — duración de cada demo (ej "30")
 *   BUFFER_MINUTES         — buffer entre demos (ej "15")
 *   TIMEZONE               — "America/Mexico_City"
 *   DAYS_OF_WEEK           — "1,2,3,4,5" (lunes a viernes)
 */

const CORS_HEADERS = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = CORS_HEADERS(env.ALLOWED_ORIGIN || origin);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    try {
      if (url.pathname === '/availability' && request.method === 'GET') {
        return await handleAvailability(url, env, cors);
      }
      if (url.pathname === '/book' && request.method === 'POST') {
        return await handleBook(request, env, cors);
      }
      // OAuth setup flow · one-time · Isabel autoriza con 1 click
      if (url.pathname === '/oauth/start' && request.method === 'GET') {
        return handleOAuthStart(url, env);
      }
      if (url.pathname === '/oauth/callback' && request.method === 'GET') {
        return await handleOAuthCallback(url, env);
      }
      if (url.pathname === '/' || url.pathname === '/health') {
        return json({ status: 'ok', name: 'karbot-landing-api', endpoints: ['/availability', '/book', '/oauth/start', '/oauth/callback'] }, 200, cors);
      }
      return json({ error: 'not_found' }, 404, cors);
    } catch (err) {
      return json({ error: 'server_error', message: err.message }, 500, cors);
    }
  },
};

// -------------------- Google OAuth · access token from refresh token --------------------
async function getAccessToken(env) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`oauth_refresh_failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// -------------------- GET /availability --------------------
async function handleAvailability(url, env, cors) {
  const days = Math.min(30, parseInt(url.searchParams.get('days') || '14', 10));
  const tz = env.TIMEZONE || 'America/Mexico_City';
  const startHour = parseInt(env.BUSINESS_HOURS_START || '10', 10);
  const endHour = parseInt(env.BUSINESS_HOURS_END || '18', 10);
  const slotMin = parseInt(env.SLOT_MINUTES || '30', 10);
  const bufferMin = parseInt(env.BUFFER_MINUTES || '15', 10);
  const daysOfWeek = (env.DAYS_OF_WEEK || '1,2,3,4,5').split(',').map((n) => parseInt(n.trim(), 10));

  const accessToken = await getAccessToken(env);

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  // freebusy.query
  const fb = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: tz,
      items: [{ id: env.ISABEL_CALENDAR_ID || 'primary' }],
    }),
  });
  if (!fb.ok) throw new Error(`freebusy_failed: ${await fb.text()}`);
  const fbData = await fb.json();
  const busy = (fbData.calendars[env.ISABEL_CALENDAR_ID || 'primary']?.busy || []).map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));

  // Generate potential slots
  const slots = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(now.getTime() + d * 86400000);
    if (!daysOfWeek.includes(day.getDay())) continue; // skip if not workday
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMin) {
        const slotStart = new Date(day);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + slotMin * 60000);
        // No slots in the past
        if (slotStart <= now) continue;
        // Check overlap with busy (including buffer)
        const overlaps = busy.some((b) => {
          const bufStart = new Date(b.start.getTime() - bufferMin * 60000);
          const bufEnd = new Date(b.end.getTime() + bufferMin * 60000);
          return slotStart < bufEnd && slotEnd > bufStart;
        });
        if (!overlaps) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            label: slotStart.toLocaleString('es-MX', {
              timeZone: tz,
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
          });
        }
      }
    }
  }

  return json({ slots: slots.slice(0, 60), timezone: tz }, 200, cors);
}

// -------------------- POST /book --------------------
async function handleBook(request, env, cors) {
  const body = await request.json();
  const { nombre, empresa, agencias, rol, email, phone, start, end } = body;

  if (!nombre || !empresa || !start || !end) {
    return json({ error: 'missing_fields', required: ['nombre', 'empresa', 'start', 'end'] }, 400, cors);
  }

  const accessToken = await getAccessToken(env);

  const tz = env.TIMEZONE || 'America/Mexico_City';
  const summary = `Demo Karbot · ${empresa}`;
  const description = [
    `Demo agendada desde landing automotive.`,
    ``,
    `Nombre: ${nombre}`,
    `Empresa: ${empresa}`,
    `Agencias: ${agencias || 'no especificado'}`,
    `Rol: ${rol || 'no especificado'}`,
    email ? `Email: ${email}` : null,
    phone ? `WhatsApp: ${phone}` : null,
    ``,
    `Fuente: https://mktgrupoplasenciaautomotriz.github.io/marketon-clients/clients/karbot/`,
  ].filter(Boolean).join('\n');

  const event = {
    summary,
    description,
    start: { dateTime: start, timeZone: tz },
    end: { dateTime: end, timeZone: tz },
    conferenceData: {
      createRequest: {
        requestId: `karbot-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    ...(email
      ? { attendees: [{ email, displayName: nombre, responseStatus: 'needsAction' }] }
      : {}),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const calendarId = encodeURIComponent(env.ISABEL_CALENDAR_ID || 'primary');
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`events_insert_failed: ${err}`);
  }
  const created = await res.json();

  return json(
    {
      ok: true,
      eventId: created.id,
      htmlLink: created.htmlLink,
      meetLink: created.hangoutLink,
      start: created.start.dateTime,
      end: created.end.dateTime,
    },
    200,
    cors
  );
}

// -------------------- OAuth setup flow · one-time --------------------
// Isabel visita /oauth/start · autoriza · el callback muestra su refresh_token
// para que Chucho lo guarde con `wrangler secret put GOOGLE_REFRESH_TOKEN`.
// Después de guardar el secret, este flow se puede desactivar comentando las rutas.

function handleOAuthStart(url, env) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/oauth/callback`,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent', // fuerza refresh_token cada vez (necesario en re-autorizaciones)
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ].join(' '),
    state: 'karbot-oauth-setup',
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(authUrl, 302);
}

async function handleOAuthCallback(url, env) {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return htmlPage(
      'Error de autorización',
      `<h2 style="color:#DC2626">Error: ${error}</h2>
       <p>Isabel canceló la autorización o Google rechazó la petición.</p>
       <p>Vuelve a intentar visitando <a href="/oauth/start">/oauth/start</a>.</p>`
    );
  }
  if (!code) {
    return htmlPage(
      'Sin código',
      `<h2 style="color:#DC2626">No llegó el código de autorización</h2>
       <p>Vuelve a arrancar el flow en <a href="/oauth/start">/oauth/start</a>.</p>`
    );
  }

  // Intercambio de code por tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/oauth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    return htmlPage(
      'Token exchange failed',
      `<h2 style="color:#DC2626">Google rechazó el intercambio</h2>
       <pre style="background:#f5f5f5;padding:16px;overflow:auto;border-radius:6px;font-size:12px;">${errText}</pre>
       <p>Vuelve a arrancar el flow en <a href="/oauth/start">/oauth/start</a>.</p>`
    );
  }

  const tokens = await tokenRes.json();
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    return htmlPage(
      'Sin refresh_token',
      `<h2 style="color:#F59E0B">Google no devolvió refresh_token</h2>
       <p>Esto pasa si Isabel ya había autorizado antes. Isabel debe primero <b>revocar el acceso</b> en <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> (busca "Karbot Landing" → Remove access) y luego volver a visitar <a href="/oauth/start">/oauth/start</a>.</p>
       <pre style="background:#f5f5f5;padding:16px;overflow:auto;border-radius:6px;font-size:12px;">${JSON.stringify(tokens, null, 2)}</pre>`
    );
  }

  // Éxito · mostrar el refresh_token para copiar
  return htmlPage(
    'Autorización lista ✓',
    `<h2 style="color:#10B981">✓ Isabel autorizó · refresh_token generado</h2>
     <p>Copia el token de abajo y guárdalo como secret en Cloudflare con:</p>
     <pre style="background:#0F172A;color:#93BBFC;padding:16px;overflow:auto;border-radius:8px;font-size:12px;font-family:monospace;">wrangler secret put GOOGLE_REFRESH_TOKEN
# cuando pida el valor, pega:
${refreshToken}</pre>
     <p>Después de guardar el secret, este flow ya no se necesita — puedes borrar las rutas <code>/oauth/*</code> del Worker si quieres.</p>
     <p style="margin-top:24px;color:#64748B;font-size:13px;">access_token válido hasta: ${new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()}</p>`
  );
}

function htmlPage(title, body) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:60px auto;padding:0 24px;line-height:1.6;color:#0F172A;}
  h2{margin-bottom:16px;}pre{white-space:pre-wrap;word-break:break-all;}
  a{color:#2563EB;}</style></head><body>${body}</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// -------------------- utils --------------------
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
