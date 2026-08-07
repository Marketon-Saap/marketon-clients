/**
 * Karbot Landing · Backend API (Cloudflare Worker)
 *
 * 2 endpoints:
 * - GET  /availability?days=14   → slots libres de Isabel next N days
 * - POST /book                   → crea evento en calendar de Isabel con Google Meet
 *
 * Env vars requeridas (secrets):
 *   GOOGLE_CLIENT_ID              — OAuth client de Google Cloud Console
 *   GOOGLE_CLIENT_SECRET          — OAuth client secret
 *   GOOGLE_CALENDAR_REFRESH_TOKEN — Isabel autoriza · scope calendar.* · /oauth/start?service=calendar
 *   GOOGLE_GMAIL_REFRESH_TOKEN    — Chucho autoriza · scope gmail.send · /oauth/start?service=gmail
 *   ISABEL_CALENDAR_ID            — "primary" o el email si prefieres
 *   ALLOWED_ORIGIN                — https://mktgrupoplasenciaautomotriz.github.io (o custom domain)
 *   NOTIFY_EMAILS                 — csv de emails receptor de notifications
 *   NOTIFY_FROM                   — from header (debe coincidir con cuenta gmail que autorizó)
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
// 2 servicios, 2 refresh_tokens · mismo OAuth Client:
//   GOOGLE_CALENDAR_REFRESH_TOKEN  → Isabel autorizó (isabel@karlo.io)   · scope calendar.*
//   GOOGLE_GMAIL_REFRESH_TOKEN     → Chucho autorizó (chucho@marketon.mx) · scope gmail.send
async function getAccessTokenFor(refreshToken, env) {
  if (!refreshToken) throw new Error('missing_refresh_token');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`oauth_refresh_failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

function calendarRefreshToken(env) {
  return env.GOOGLE_CALENDAR_REFRESH_TOKEN || env.GOOGLE_REFRESH_TOKEN || null;
}
function gmailRefreshToken(env) {
  return env.GOOGLE_GMAIL_REFRESH_TOKEN || null;
}

// -------------------- helpers --------------------
function getBookingConfig(env) {
  return {
    tz: env.TIMEZONE || 'America/Mexico_City',
    startHour: parseInt(env.BUSINESS_HOURS_START || '10', 10),
    endHour: parseInt(env.BUSINESS_HOURS_END || '18', 10),
    slotMin: parseInt(env.SLOT_MINUTES || '30', 10),
    bufferMin: parseInt(env.BUFFER_MINUTES || '15', 10),
    daysOfWeek: (env.DAYS_OF_WEEK || '1,2,3,4,5').split(',').map((n) => parseInt(n.trim(), 10)),
  };
}

// MX Central Time es UTC-6 fijo (sin DST desde octubre 2022).
// Si México regresa DST en el futuro, ajustar esta constante o migrar a librería tz.
const MX_OFFSET_HOURS = 6;
const DOW_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function dowInMX(date, tz) {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return DOW_MAP[short];
}

function generateSlots(days, cfg, busy, now = new Date()) {
  const slots = [];
  for (let d = 0; d < days; d++) {
    const day = new Date(now.getTime() + d * 86400000);
    if (!cfg.daysOfWeek.includes(dowInMX(day, cfg.tz))) continue;
    // Extraer YYYY-MM-DD del día en MX time (evita que UTC 00:00 caiga en día anterior MX)
    const dateStr = day.toLocaleDateString('en-CA', { timeZone: cfg.tz });
    const [y, mo, dd] = dateStr.split('-').map(Number);
    for (let h = cfg.startHour; h < cfg.endHour; h++) {
      for (let m = 0; m < 60; m += cfg.slotMin) {
        // Hora local MX → UTC: sumar offset (MX es UTC-6)
        const slotStart = new Date(Date.UTC(y, mo - 1, dd, h + MX_OFFSET_HOURS, m));
        const slotEnd = new Date(slotStart.getTime() + cfg.slotMin * 60000);
        if (slotStart <= now) continue;
        const overlaps = busy.some((b) => {
          const bufStart = new Date(b.start.getTime() - cfg.bufferMin * 60000);
          const bufEnd = new Date(b.end.getTime() + cfg.bufferMin * 60000);
          return slotStart < bufEnd && slotEnd > bufStart;
        });
        if (overlaps) continue;
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          label: slotStart.toLocaleString('es-MX', {
            timeZone: cfg.tz,
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
  return slots;
}

// -------------------- GET /availability --------------------
async function handleAvailability(url, env, cors) {
  const days = Math.min(30, parseInt(url.searchParams.get('days') || '14', 10));
  const cfg = getBookingConfig(env);

  // Modo mock: sin refresh_token, devolvemos slots como si el calendar estuviera vacío
  // (permite iterar UI hoy · cuando Isabel autorice, este branch se salta solo)
  if (!calendarRefreshToken(env)) {
    return json({
      slots: generateSlots(days, cfg, []),
      timezone: cfg.tz,
      mock: true,
    }, 200, cors);
  }

  try {
    const accessToken = await getAccessTokenFor(calendarRefreshToken(env), env);
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const fb = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: cfg.tz,
        items: [{ id: env.ISABEL_CALENDAR_ID || 'primary' }],
      }),
    });
    if (!fb.ok) throw new Error(`freebusy_failed: ${await fb.text()}`);
    const fbData = await fb.json();
    const busy = (fbData.calendars[env.ISABEL_CALENDAR_ID || 'primary']?.busy || []).map((b) => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));

    return json({ slots: generateSlots(days, cfg, busy, now), timezone: cfg.tz }, 200, cors);
  } catch (err) {
    // Fallback silencioso a mock si Google falla · así el UI nunca se rompe
    return json({
      slots: generateSlots(days, cfg, []),
      timezone: cfg.tz,
      mock: true,
      note: err.message,
    }, 200, cors);
  }
}

// -------------------- POST /book --------------------
// Flujo garantizado (safety net):
// 1) Insert en D1 SIEMPRE (si falla D1 → 500 al cliente, único hard fail)
// 2) Crear evento Google Calendar si hay refresh_token (soft-fail, log en D1)
// 3) Enviar email notification vía Resend a NOTIFY_EMAILS (soft-fail, log en D1)
// 4) Return con lead_id + status de cada paso
async function handleBook(request, env, cors) {
  const body = await request.json();
  const {
    nombre, empresa, agencias, rol, email, phone, start, end,
    phone_country_code, phone_number,
    privacy_accepted, privacy_accepted_at, privacy_notice_url,
  } = body;

  // Required fields
  if (!nombre || !empresa || !email || !phone || !agencias || !rol || !start || !end) {
    return json({ error: 'missing_fields', required: ['nombre','empresa','email','phone','agencias','rol','start','end'] }, 400, cors);
  }
  // Field validations (server-side gate mirror del client)
  if (!/^[A-ZÁÉÍÓÚÑÜ ]{5,60}$/.test(nombre)) {
    return json({ error: 'invalid_nombre', message: 'Solo mayúsculas, sin caracteres especiales, 5-60 chars.' }, 400, cors);
  }
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return json({ error: 'invalid_email' }, 400, cors);
  }
  if (phone_number && !/^[0-9]{10}$/.test(phone_number)) {
    return json({ error: 'invalid_phone', message: 'Teléfono debe ser 10 dígitos.' }, 400, cors);
  }
  if (privacy_accepted !== true) {
    return json({ error: 'privacy_not_accepted', message: 'Debes aceptar el Aviso de privacidad.' }, 400, cors);
  }

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  const userAgent = request.headers.get('User-Agent') || '';
  const referrer = request.headers.get('Referer') || '';
  const country = (request.headers.get('CF-IPCountry') || '').toLowerCase() || null; // Cloudflare geo IP · 2 letters ISO
  const isMock = !calendarRefreshToken(env);

  // Enrichment del cliente (attribution + hashed PII para Enhanced Conversions/CAPI server-side futuro)
  const enrichment = body.enrichment || {};
  const attributionJson = JSON.stringify(enrichment);
  const privacyAcceptedAtIso = privacy_accepted_at || new Date().toISOString();
  const privacyNoticeUrlVal = privacy_notice_url || 'https://karbot.mx/aviso-privacidad';

  // ---------- 1) D1 insert · safety net ----------
  let leadId = null;
  try {
    // Attempt full insert (con columnas nuevas). Si falla por columnas inexistentes, fallback legacy.
    let insertRes;
    try {
      insertRes = await env.karbot_leads
        .prepare(
          `INSERT INTO leads (nombre, empresa, email, phone, phone_country_code, phone_number, agencias, rol, slot_start, slot_end, mock, user_agent, ip, country, referrer, attribution_json, privacy_accepted, privacy_accepted_at, privacy_notice_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          nombre, empresa, email, phone,
          phone_country_code || null, phone_number || null,
          agencias, rol, start, end,
          isMock ? 1 : 0, userAgent, ip, country, referrer, attributionJson,
          privacy_accepted ? 1 : 0, privacyAcceptedAtIso, privacyNoticeUrlVal,
        )
        .run();
    } catch (schemaErr) {
      // Fallback legacy schema (sin columnas nuevas) — persistimos igual en attribution_json
      const legacyAttr = JSON.stringify({
        ...enrichment,
        _v2_fields: {
          phone_country_code, phone_number,
          privacy_accepted, privacy_accepted_at: privacyAcceptedAtIso, privacy_notice_url: privacyNoticeUrlVal,
        },
      });
      insertRes = await env.karbot_leads
        .prepare(
          `INSERT INTO leads (nombre, empresa, email, phone, agencias, rol, slot_start, slot_end, mock, user_agent, ip, country, referrer, attribution_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(nombre, empresa, email, phone, agencias, rol, start, end, isMock ? 1 : 0, userAgent, ip, country, referrer, legacyAttr)
        .run();
    }
    leadId = insertRes.meta.last_row_id;
  } catch (err) {
    return json({ error: 'db_insert_failed', message: err.message }, 500, cors);
  }

  // ---------- 2) Google Calendar event · si hay refresh_token ----------
  let eventId = null;
  let meetLink = null;
  let htmlLink = null;
  let calendarError = null;

  if (!isMock) {
    try {
      const accessToken = await getAccessTokenFor(calendarRefreshToken(env), env);
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
        `Lead ID (D1): ${leadId}`,
        `Fuente: https://mktgrupoplasenciaautomotriz.github.io/marketon-clients/clients/karbot/`,
      ].filter(Boolean).join('\n');

      const event = {
        summary,
        description,
        start: { dateTime: start, timeZone: tz },
        end: { dateTime: end, timeZone: tz },
        conferenceData: {
          createRequest: {
            requestId: `karbot-${leadId}-${Date.now()}`,
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
      if (!res.ok) throw new Error(`events_insert_failed: ${await res.text()}`);
      const created = await res.json();
      eventId = created.id;
      meetLink = created.hangoutLink;
      htmlLink = created.htmlLink;

      await env.karbot_leads
        .prepare(`UPDATE leads SET event_id = ?, meet_link = ? WHERE id = ?`)
        .bind(eventId, meetLink, leadId)
        .run();
    } catch (err) {
      calendarError = err.message;
    }
  }

  // ---------- 3) Email notification vía Resend · soft-fail ----------
  let emailSent = false;
  let emailError = null;
  try {
    const result = await sendLeadNotification(env, {
      leadId, nombre, empresa, email, phone, agencias, rol,
      phone_country_code, phone_number,
      privacy_accepted, privacy_accepted_at: privacyAcceptedAtIso, privacy_notice_url: privacyNoticeUrlVal,
      start, end, isMock, eventId, meetLink, htmlLink, calendarError,
      country, ip, referrer, enrichment,
    });
    emailSent = result.sent;
    emailError = result.error;
  } catch (err) {
    emailError = err.message;
  }

  await env.karbot_leads
    .prepare(`UPDATE leads SET email_sent = ?, email_error = ? WHERE id = ?`)
    .bind(emailSent ? 1 : 0, emailError, leadId)
    .run()
    .catch(() => {}); // no bloquear si falla update

  // ---------- 4) Notion sync · Datasource KARBOT · soft-fail ----------
  let notionPageId = null;
  let notionError = null;
  try {
    const result = await createNotionDealPage(env, {
      leadId, nombre, empresa, email, phone, agencias, rol,
      phone_country_code, phone_number,
      privacy_accepted, privacy_accepted_at: privacyAcceptedAtIso, privacy_notice_url: privacyNoticeUrlVal,
      start, end, isMock, eventId, meetLink, htmlLink, calendarError,
      country, ip, referrer, enrichment,
    });
    notionPageId = result.pageId;
    notionError = result.error;
  } catch (err) {
    notionError = err.message;
  }

  await env.karbot_leads
    .prepare(`UPDATE leads SET notion_page_id = ?, notion_error = ? WHERE id = ?`)
    .bind(notionPageId, notionError, leadId)
    .run()
    .catch(() => {});

  // ---------- 5) Response ----------
  return json({
    ok: true,
    leadId,
    mock: isMock,
    eventId,
    meetLink,
    htmlLink,
    emailSent,
    emailError,
    calendarError,
    notionPageId,
    notionError,
    start,
    end,
  }, 200, cors);
}

// -------------------- Notion · create deal page in Datasource KARBOT --------------------
// Crea 1 row en el pipeline canónico Karbot con Origen "Landing - CRO" · Funnel "Demo".
// Sin nuevas etapas · respeta el schema existente del equipo Karbot.
async function createNotionDealPage(env, ctx) {
  if (!env.NOTION_TOKEN) return { pageId: null, error: 'no_notion_token' };
  const dsId = env.NOTION_DATA_SOURCE_ID;
  if (!dsId) return { pageId: null, error: 'no_notion_data_source_id' };

  const enrich = ctx.enrichment || {};
  const value = enrich.value || 0;
  const tier = enrich.tier || 'starter';
  const labelByTier = { enterprise: 'Alta', mid_market: 'Alta', smb: 'Media', starter: 'Baja' };
  const tz = env.TIMEZONE || 'America/Mexico_City';
  const whenLabel = ctx.start ? new Date(ctx.start).toLocaleString('es-MX', {
    timeZone: tz, weekday: 'long', day: '2-digit', month: 'long',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }) : '—';

  // Título del row: usamos empresa como Negocio (title field)
  const title = ctx.empresa || 'Lead sin empresa';

  // Bloque de detalles con toda la info del lead
  const clickIds = enrich.click_ids || {};
  const utm = enrich.utm || {};
  const phoneDisplay = ctx.phone_country_code && ctx.phone_number
    ? `${ctx.phone_country_code} ${ctx.phone_number}`
    : (ctx.phone || '—');
  const privacyLine = ctx.privacy_accepted
    ? `✓ Aviso de privacidad aceptado · ${ctx.privacy_accepted_at || '—'} · ${ctx.privacy_notice_url || 'https://karbot.mx/aviso-privacidad'}`
    : '⚠ Aviso de privacidad NO aceptado';

  const detailsLines = [
    `Contacto: ${ctx.nombre}`,
    `Email: ${ctx.email || '—'}`,
    `WhatsApp: ${phoneDisplay}`,
    `Código país: ${ctx.phone_country_code || '—'}`,
    `Rol: ${ctx.rol || '—'}`,
    `Agencias: ${ctx.agencias || '—'}`,
    `Slot demo: ${whenLabel}`,
    `Tier estimado: ${tier} · $${value.toLocaleString('es-MX')} MXN`,
    `País (geo IP): ${(ctx.country || '—').toUpperCase()}`,
    privacyLine,
    `Lead ID (D1): ${ctx.leadId}`,
    ctx.meetLink ? `Google Meet: ${ctx.meetLink}` : null,
    ctx.htmlLink ? `Calendar event: ${ctx.htmlLink}` : null,
    Object.keys(utm).length ? `UTM: ${Object.entries(utm).filter(([,v])=>v).map(([k,v])=>`${k}=${v}`).join(' · ')}` : null,
    Object.keys(clickIds).length ? `Click IDs: ${Object.entries(clickIds).map(([k,v])=>`${k}=${String(v).slice(0,20)}…`).join(' · ')}` : null,
    ctx.isMock ? '⚠ MOCK · pendiente OAuth Isabel · agendar manualmente' : null,
  ].filter(Boolean);

  const body = {
    parent: { type: 'data_source_id', data_source_id: dsId },
    properties: {
      'Negocio': { title: [{ type: 'text', text: { content: title.slice(0, 200) } }] },
      'Origen del lead': { select: { name: 'Landing - CRO' } },
      'Funnel': { status: { name: 'Demo' } },
      'Implementación‼️': { select: { name: 'Nuevo' } },
      'Label': { select: { name: labelByTier[tier] || 'Media' } },
      'Fecha Creación Deal': { date: { start: new Date().toISOString().slice(0, 10) } },
      'Detalles': { rich_text: [{ type: 'text', text: { content: detailsLines.join('\n').slice(0, 2000) } }] },
      ...(ctx.email ? { 'Correo cliente 3': { email: ctx.email } } : {}),
      ...(ctx.phone ? { 'Tel. pagos': { phone_number: ctx.phone } } : {}),
    },
    children: [
      { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '📥 Lead capturado desde landing' } }] } },
      { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: detailsLines.join('\n') } }] } },
    ],
  };

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      return { pageId: null, error: `notion_${res.status}: ${err.slice(0, 300)}` };
    }
    const data = await res.json();
    return { pageId: data.id, error: null };
  } catch (err) {
    return { pageId: null, error: `notion_fetch_failed: ${err.message}` };
  }
}

// -------------------- Gmail API · email notification --------------------
// Envía desde chucho@marketon.mx (Chucho autorizó con scope gmail.send).
// Un mensaje multipart/alternative con text + html a NOTIFY_EMAILS (BCC = privacy).
async function sendLeadNotification(env, ctx) {
  const refreshToken = gmailRefreshToken(env);
  if (!refreshToken) {
    return { sent: false, error: 'no_gmail_refresh_token' };
  }
  const to = (env.NOTIFY_EMAILS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (to.length === 0) return { sent: false, error: 'no_notify_emails' };

  const from = env.NOTIFY_FROM || 'Karbot Landing <chucho@marketon.mx>';
  const tz = env.TIMEZONE || 'America/Mexico_City';
  const whenLabel = new Date(ctx.start).toLocaleString('es-MX', {
    timeZone: tz, weekday: 'long', day: '2-digit', month: 'long',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const subject = ctx.isMock
    ? `[Karbot Landing · MOCK] Nuevo lead · ${ctx.empresa} · ${whenLabel}`
    : `[Karbot Landing] Demo agendada · ${ctx.empresa} · ${whenLabel}`;

  const enrich = ctx.enrichment || {};
  const clickIds = enrich.click_ids || {};
  const utm = enrich.utm || {};
  const clickIdsLabel = ['gclid','fbclid','msclkid','ttclid','li_fat_id']
    .filter(k => clickIds[k]).map(k => `${k}=${clickIds[k].slice(0,20)}…`).join(' · ') || '—';
  const utmLabel = ['utm_source','utm_medium','utm_campaign']
    .filter(k => utm[k]).map(k => `${k}=${utm[k]}`).join(' · ') || '—';

  const rows = [
    ['Empresa', ctx.empresa],
    ['Contacto', ctx.nombre],
    ['Email', ctx.email || '—'],
    ['WhatsApp', ctx.phone || '—'],
    ['Rol', ctx.rol || '—'],
    ['Agencias', ctx.agencias || '—'],
    ['Slot', whenLabel],
    ['Lead ID', ctx.leadId],
    ['Tier estimado', enrich.tier ? `${enrich.tier} · $${(enrich.value||0).toLocaleString('es-MX')} MXN` : '—'],
    ['País (geo IP)', (ctx.country || '—').toUpperCase()],
    ['Fuente (UTM)', utmLabel],
    ['Click IDs ads', clickIdsLabel],
    ['Referrer', enrich.referrer || ctx.referrer || 'directo'],
    ['Landing', enrich.landing_path || '/'],
    ['Modo', ctx.isMock ? '⚠ MOCK · pendiente OAuth Isabel · agendar manualmente' : '✓ Evento creado en Calendar'],
  ];
  if (ctx.meetLink) rows.push(['Google Meet', ctx.meetLink]);
  if (ctx.htmlLink) rows.push(['Calendar event', ctx.htmlLink]);
  if (ctx.calendarError) rows.push(['⚠ Calendar error', ctx.calendarError]);

  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0F172A;line-height:1.5;">
  <h2 style="color:#444CE7;margin:0 0 16px;">${ctx.isMock ? '⚠ Lead MOCK ' : '✓ Demo agendada '}· Karbot Landing</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    ${rows.map(([k, v]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#5F6C7B;width:140px;font-weight:600;">${escapeHtml(k)}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${escapeHtml(String(v))}</td></tr>`).join('')}
  </table>
  ${ctx.isMock ? '<p style="margin-top:20px;padding:12px;background:#FFF3CD;border-radius:8px;color:#92400E;font-size:13px;">Modo MOCK activo · Isabel debe completar el OAuth flow para que se creen eventos automáticamente en su calendar. Mientras, agenda manualmente y responde al lead.</p>' : ''}
  <p style="margin-top:24px;color:#94A3B8;font-size:12px;">Karbot Landing API · Cloudflare Worker + D1</p>
</body></html>`;

  const text = [
    (ctx.isMock ? '[MOCK] ' : '') + 'Lead nuevo · Karbot Landing',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    ctx.isMock ? '⚠ Modo MOCK · agendar manualmente' : '',
  ].filter(Boolean).join('\n');

  const raw = buildMimeMessage({
    from,
    to,          // usamos BCC para todos (privacy · no ver los emails uno del otro)
    subject,
    text,
    html,
    replyTo: ctx.email || undefined,
  });

  try {
    const accessToken = await getAccessTokenFor(refreshToken, env);
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64UrlEncode(raw) }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { sent: false, error: `gmail_${res.status}: ${err.slice(0, 200)}` };
    }
    return { sent: true, error: null };
  } catch (err) {
    return { sent: false, error: `gmail_send_failed: ${err.message}` };
  }
}

// Construye un mensaje MIME multipart/alternative RFC 5322
// destinatarios en BCC para privacidad entre miembros del equipo
function buildMimeMessage({ from, to, subject, text, html, replyTo }) {
  const boundary = '==KARBOT_BOUNDARY_' + Math.floor(Date.now()).toString(36) + '==';
  const bccList = to.join(', ');
  const headers = [
    `From: ${from}`,
    `To: ${from}`, // self-to (no revela destinatarios) · reales van en BCC
    `Bcc: ${bccList}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);
  const body = [
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`,
  ];
  return headers.join('\r\n') + '\r\n' + body.join('\r\n');
}

// Encode subject con RFC 2047 si contiene non-ASCII (acentos, emojis)
function encodeSubject(subject) {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  const b64 = base64UrlEncode(subject).replace(/-/g, '+').replace(/_/g, '/');
  return `=?UTF-8?B?${b64}?=`;
}

function base64UrlEncode(input) {
  // Convertir string UTF-8 → base64url (Gmail API espera base64url, no base64 estándar)
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// -------------------- OAuth setup flow · dispatch por ?service= --------------------
// Servicios soportados:
//   ?service=calendar  → Isabel autoriza · scopes calendar.* · guarda GOOGLE_CALENDAR_REFRESH_TOKEN
//   ?service=gmail     → Chucho autoriza · scope gmail.send   · guarda GOOGLE_GMAIL_REFRESH_TOKEN

const OAUTH_SERVICES = {
  calendar: {
    label: 'Google Calendar (Isabel)',
    secretName: 'GOOGLE_CALENDAR_REFRESH_TOKEN',
    who: 'Isabel',
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
  },
  gmail: {
    label: 'Gmail (Chucho · para notificaciones de leads)',
    secretName: 'GOOGLE_GMAIL_REFRESH_TOKEN',
    who: 'Chucho',
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
  },
};

function handleOAuthStart(url, env) {
  const service = (url.searchParams.get('service') || 'calendar').toLowerCase();
  const cfg = OAUTH_SERVICES[service];
  if (!cfg) {
    return htmlPage('Servicio inválido',
      `<h2 style="color:#DC2626">?service inválido</h2>
       <p>Usa <a href="/oauth/start?service=calendar">/oauth/start?service=calendar</a> o <a href="/oauth/start?service=gmail">/oauth/start?service=gmail</a>.</p>`);
  }
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/oauth/callback`,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: cfg.scopes.join(' '),
    state: service, // pasamos el service via state, lo leemos en callback
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(authUrl, 302);
}

async function handleOAuthCallback(url, env) {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state') || 'calendar';
  const cfg = OAUTH_SERVICES[state] || OAUTH_SERVICES.calendar;

  if (error) {
    return htmlPage(
      'Error de autorización',
      `<h2 style="color:#DC2626">Error: ${escapeHtml(error)}</h2>
       <p>${escapeHtml(cfg.who)} canceló la autorización o Google rechazó la petición.</p>
       <p>Vuelve a intentar en <a href="/oauth/start?service=${state}">/oauth/start?service=${escapeHtml(state)}</a>.</p>`
    );
  }
  if (!code) {
    return htmlPage(
      'Sin código',
      `<h2 style="color:#DC2626">No llegó el código de autorización</h2>
       <p>Vuelve a arrancar en <a href="/oauth/start?service=${state}">/oauth/start?service=${escapeHtml(state)}</a>.</p>`
    );
  }

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
       <pre style="background:#f5f5f5;padding:16px;overflow:auto;border-radius:6px;font-size:12px;">${escapeHtml(errText)}</pre>
       <p>Vuelve a arrancar en <a href="/oauth/start?service=${state}">/oauth/start?service=${escapeHtml(state)}</a>.</p>`
    );
  }

  const tokens = await tokenRes.json();
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    return htmlPage(
      'Sin refresh_token',
      `<h2 style="color:#F59E0B">Google no devolvió refresh_token</h2>
       <p>Esto pasa si ${escapeHtml(cfg.who)} ya había autorizado antes. Debe primero <b>revocar el acceso</b> en <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> (busca "Karbot Landing" → Remove access) y luego volver a visitar <a href="/oauth/start?service=${state}">/oauth/start?service=${escapeHtml(state)}</a>.</p>
       <pre style="background:#f5f5f5;padding:16px;overflow:auto;border-radius:6px;font-size:12px;">${escapeHtml(JSON.stringify(tokens, null, 2))}</pre>`
    );
  }

  return htmlPage(
    'Autorización lista ✓',
    `<h2 style="color:#10B981">✓ ${escapeHtml(cfg.who)} autorizó · ${escapeHtml(cfg.label)}</h2>
     <p style="font-size:15px;">Tu token de acceso está listo. Click en el botón para copiarlo sin errores y mándaselo a Chucho:</p>
     <div style="margin:20px 0;">
       <input id="tk" type="text" readonly value="${escapeHtml(refreshToken)}"
              style="width:100%;padding:14px;font-family:monospace;font-size:13px;border:1.5px solid #E5E7EB;border-radius:8px;background:#F8FAFC;color:#0F172A;box-sizing:border-box;">
     </div>
     <div style="display:flex;gap:12px;flex-wrap:wrap;">
       <button id="copyBtn" onclick="copyToken()"
               style="padding:14px 28px;background:#10B981;color:white;font-size:15px;font-weight:600;border:none;border-radius:10px;cursor:pointer;font-family:inherit;">
         📋 Copiar token
       </button>
       <button id="dlBtn" onclick="downloadToken()"
               style="padding:14px 28px;background:#2563EB;color:white;font-size:15px;font-weight:600;border:none;border-radius:10px;cursor:pointer;font-family:inherit;">
         📥 Descargar como .txt
       </button>
     </div>
     <p id="status" style="margin-top:14px;color:#10B981;font-weight:600;min-height:20px;"></p>
     <p style="margin-top:20px;padding:14px;background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:6px;color:#92400E;font-size:13.5px;line-height:1.5;">
       <strong>Mejor descarga el .txt y mándalo por WhatsApp como archivo adjunto.</strong>
       Copiar y pegar el texto puede meter caracteres invisibles que rompen el token.
     </p>
     <script>
       function copyToken() {
         var input = document.getElementById('tk');
         input.select();
         input.setSelectionRange(0, 99999);
         try {
           navigator.clipboard.writeText(input.value).then(function(){
             document.getElementById('status').textContent = '✓ Copiado ('+input.value.length+' caracteres)';
             document.getElementById('copyBtn').textContent = '✓ Copiado';
             document.getElementById('copyBtn').style.background = '#0F172A';
           });
         } catch(e) {
           document.execCommand('copy');
           document.getElementById('status').textContent = '✓ Copiado ('+input.value.length+' caracteres)';
         }
       }
       function downloadToken() {
         var input = document.getElementById('tk');
         var blob = new Blob([input.value], {type: 'text/plain'});
         var a = document.createElement('a');
         a.href = URL.createObjectURL(blob);
         a.download = 'karbot-token-${cfg.secretName}.txt';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         document.getElementById('status').textContent = '✓ Descargado karbot-token-${cfg.secretName}.txt ('+input.value.length+' caracteres) · mándalo por WhatsApp como archivo adjunto';
         document.getElementById('dlBtn').textContent = '✓ Descargado';
         document.getElementById('dlBtn').style.background = '#0F172A';
       }
     </script>
     <hr style="margin:32px 0 20px;border:none;border-top:1px solid #E5E7EB;">
     <details>
       <summary style="cursor:pointer;color:#64748B;font-size:13px;">Ver comando técnico (solo para Chucho)</summary>
       <pre style="background:#0F172A;color:#93BBFC;padding:16px;overflow:auto;border-radius:8px;font-size:12px;font-family:monospace;white-space:pre-wrap;word-break:break-all;margin-top:12px;">wrangler secret put ${cfg.secretName}
# cuando pida el valor, pega:
${escapeHtml(refreshToken)}</pre>
     </details>
     <p style="margin-top:24px;color:#94A3B8;font-size:12px;">Token length: ${refreshToken.length} chars · access_token válido hasta ${new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()}</p>`
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
