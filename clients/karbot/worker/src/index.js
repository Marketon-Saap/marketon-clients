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

// -------------------- utils --------------------
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
