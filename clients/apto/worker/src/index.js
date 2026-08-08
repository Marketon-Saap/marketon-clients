/**
 * APTO Landing Madre · Backend Marketon Orchestrator (Cloudflare Worker)
 *
 * v2.0 (2026-07-27):
 *  - Cloudflare D1 lead persistence · safety net (nunca se pierde un lead)
 *  - Multi-recipient email notifications (5 destinatarios APTO+Marketon)
 *  - Admin endpoint /admin/leads con Basic Auth para query
 *
 * Endpoints:
 *   POST /submit         · form submission handler (orquesta todo)
 *   GET  /health         · health check + integration status
 *   GET  /admin/leads    · lista los últimos N leads (protegido con Basic Auth)
 *
 * Flow on /submit:
 *   1. Validate + normalize payload
 *   2. INSERT INTO leads (D1) · safety net PRIMERO (nunca perdemos un lead)
 *   3. HubSpot Contact upsert (crm/v3/objects/contacts)
 *   4. HubSpot Deal create en pipeline Marketon
 *   5. Association Contact↔Deal
 *   6. UPDATE leads SET hubspot_contact_id, hubspot_deal_id, hubspot_status
 *   7. Meta CAPI + GA4 + Resend (non-blocking, waitUntil)
 *   8. Return {ok, contactId, dealId, leadId}
 *
 * Env vars (vars):
 *   ALLOWED_ORIGIN, HUBSPOT_PORTAL_ID, HUBSPOT_FORM_ID, HUBSPOT_PIPELINE_ID,
 *   HUBSPOT_DEAL_STAGE_NEW_LEAD, DEFAULT_LIFECYCLE_STAGE,
 *   NOTIFICATION_EMAIL_TO (comma-separated), NOTIFICATION_EMAIL_FROM
 *
 * Bindings:
 *   APTO_LEADS_DB (D1)
 *
 * Secrets (wrangler secret put):
 *   HUBSPOT_TOKEN            · required
 *   META_ACCESS_TOKEN        · optional (Pixel CAPI)
 *   META_TEST_EVENT_CODE     · optional
 *   GA4_MEASUREMENT_ID       · optional (G-XXXXXXX)
 *   GA4_API_SECRET           · optional
 *   RESEND_API_KEY           · optional (para notify email)
 *   ADMIN_BASIC_AUTH         · optional (formato "user:pass" base64) para /admin/leads
 */

const CORS_HEADERS = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
});

const HUBSPOT_API = 'https://api.hubapi.com';
const HUBSPOT_CONTACT_TO_DEAL_ASSOC_TYPE = 3;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    // Multi-origin support · ALLOWED_ORIGIN puede ser comma-separated list.
    // Reflejar el origen si está en la whitelist, si no usar el primero (fallback).
    const allowedList = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const matchedOrigin = allowedList.includes(origin) ? origin : (allowedList[0] || origin);
    const cors = CORS_HEADERS(matchedOrigin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    try {
      if (url.pathname === '/submit' && request.method === 'POST') {
        return await handleSubmit(request, env, cors, ctx);
      }
      if (url.pathname === '/webhooks/hubspot-lifecycle' && request.method === 'POST') {
        return await handleHubSpotLifecycleWebhook(request, env, cors, ctx);
      }
      if (url.pathname === '/admin/leads' && request.method === 'GET') {
        return await handleAdminLeads(request, env, url, cors);
      }
      if (url.pathname === '/health' || url.pathname === '/') {
        return await handleHealth(env, cors);
      }
      return json({ error: 'not_found' }, 404, cors);
    } catch (err) {
      // Log completo server-side; response al cliente sanitizada (evita leak de tokens,
      // stack traces, IDs internos, mensajes de upstream vendors al DataLayer/console).
      console.error('Unhandled error:', err.message, err.stack);
      return json({ error: 'server_error', message: 'internal_error' }, 500, cors);
    }
  },
};

/* ─── /health ────────────────────────────────────────────────────────────── */

async function handleHealth(env, cors) {
  // Health check ligero: cuenta leads en D1
  let leadsTotal = null;
  let leadsHubspotFailed = null;
  let dbError = null;
  try {
    const r1 = await env.APTO_LEADS_DB.prepare('SELECT COUNT(*) as c FROM leads').first();
    leadsTotal = r1?.c ?? 0;
    const r2 = await env.APTO_LEADS_DB.prepare("SELECT COUNT(*) as c FROM leads WHERE hubspot_status='failed'").first();
    leadsHubspotFailed = r2?.c ?? 0;
  } catch (e) {
    dbError = e.message;
  }

  return json(
    {
      status: 'ok',
      name: 'apto-landing-api',
      version: '2.0.0',
      endpoints: ['POST /submit', 'GET /admin/leads', 'GET /health'],
      hubspot: {
        portal: env.HUBSPOT_PORTAL_ID,
        pipeline: env.HUBSPOT_PIPELINE_ID,
        secretConfigured: !!env.HUBSPOT_TOKEN,
      },
      integrations: {
        meta_capi: !!env.META_ACCESS_TOKEN,
        ga4: !!env.GA4_MEASUREMENT_ID && !!env.GA4_API_SECRET,
        email_notify: !!env.RESEND_API_KEY,
      },
      d1: {
        binding: !!env.APTO_LEADS_DB,
        leads_total: leadsTotal,
        leads_hubspot_failed: leadsHubspotFailed,
        error: dbError,
      },
      notification_recipients: (env.NOTIFICATION_EMAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean),
    },
    200,
    cors
  );
}

/* ─── /admin/leads (basic auth) ──────────────────────────────────────────── */

async function handleAdminLeads(request, env, url, cors) {
  const auth = request.headers.get('Authorization') || '';
  const expected = env.ADMIN_BASIC_AUTH; // formato "Basic base64(user:pass)"
  if (!expected) {
    return json({ error: 'admin_disabled', hint: 'set ADMIN_BASIC_AUTH secret' }, 503, cors);
  }
  if (auth !== `Basic ${expected}`) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="APTO Admin"',
        ...cors,
      },
    });
  }
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);
  const rows = await env.APTO_LEADS_DB
    .prepare(
      `SELECT id, created_at, firstname, lastname, email, company, jobtitle, industry, company_size,
              hubspot_status, hubspot_contact_id, hubspot_deal_id, hubspot_error,
              meta_capi_status, ga4_status, resend_status
       FROM leads ORDER BY created_at DESC LIMIT ?`
    )
    .bind(limit)
    .all();
  return json({ count: rows?.results?.length ?? 0, leads: rows?.results ?? [] }, 200, cors);
}

/* ─── /webhooks/hubspot-lifecycle handler ────────────────────────────────── */
// Recibe webhooks de HubSpot Workflows cuando un Deal en pipeline Marketon
// cambia de stage. Mapea el stage al Meta event correspondiente + value
// escalado, y dispara CAPI server-side. Autenticado por header
// X-Marketon-Secret (== env.HUBSPOT_WEBHOOK_SECRET).
//
// HubSpot Workflow config:
//   Trigger: Deal properties · dealstage is any of [MQL, SQL, Opp, Won, Lost]
//   Filter: pipeline = 922134387 (Marketon · APTO Sales Pipeline 2026H2)
//   Action: Send webhook · POST https://apto-landing-api.../webhooks/hubspot-lifecycle
//     Headers: X-Marketon-Secret: <HUBSPOT_WEBHOOK_SECRET>
//     Body: {stageKey: "mql" | ..., dealId: "{{deal.hs_object_id}}"}
//
// Stage keys aceptados: new_lead · mql · sql · opportunity · deal_won · deal_lost

async function handleHubSpotLifecycleWebhook(request, env, cors, ctx) {
  // Read body raw (necesario para HMAC signature v3)
  const rawBody = await request.text();

  // Detectar formato: HubSpot native (array) vs manual test (object)
  let parsed;
  try { parsed = JSON.parse(rawBody); } catch { return json({ error: 'invalid_json' }, 400, cors); }
  const isHubSpotNative = Array.isArray(parsed);

  // Auth: dos modos aceptados
  //   1. Manual test → header X-Marketon-Secret (env.HUBSPOT_WEBHOOK_SECRET)
  //   2. HubSpot native → header X-HubSpot-Signature-v3 (HMAC-SHA256 con client_secret)
  if (isHubSpotNative) {
    if (!env.HUBSPOT_CLIENT_SECRET) {
      return json({ error: 'client_secret_missing', hint: 'set HUBSPOT_CLIENT_SECRET (Private App Autenticación tab)' }, 503, cors);
    }
    const signature = request.headers.get('X-HubSpot-Signature-v3');
    const timestamp = request.headers.get('X-HubSpot-Request-Timestamp');
    if (!signature || !timestamp) {
      return json({ error: 'missing_hubspot_signature_headers' }, 401, cors);
    }
    // Anti-replay: reject si el timestamp es >5 min de antigüedad
    if (Math.abs(Date.now() - parseInt(timestamp, 10)) > 5 * 60 * 1000) {
      return json({ error: 'timestamp_too_old' }, 401, cors);
    }
    const requestUrl = new URL(request.url).toString();
    const sourceString = request.method + requestUrl + rawBody + timestamp;
    const expected = await hmacSha256Base64(env.HUBSPOT_CLIENT_SECRET, sourceString);
    if (expected !== signature) {
      return json({ error: 'invalid_signature' }, 401, cors);
    }
  } else {
    // Manual test path (curl tests, etc.)
    const secret = request.headers.get('X-Marketon-Secret');
    if (!env.HUBSPOT_WEBHOOK_SECRET) {
      return json({ error: 'webhook_disabled', hint: 'set HUBSPOT_WEBHOOK_SECRET' }, 503, cors);
    }
    if (secret !== env.HUBSPOT_WEBHOOK_SECRET) {
      return json({ error: 'unauthorized' }, 401, cors);
    }
  }

  // Normalizar payload a array de eventos {stageId, dealId} independiente del formato
  let events = [];
  if (isHubSpotNative) {
    // HubSpot batch: array de {eventId, subscriptionType, objectId, propertyName, propertyValue, ...}
    events = parsed
      .filter(e => e.subscriptionType === 'deal.propertyChange' && e.propertyName === 'dealstage')
      .map(e => ({ stageId: String(e.propertyValue), dealId: String(e.objectId), hubspotEventId: e.eventId }));
    if (!events.length) {
      return json({ ok: true, skipped: 'no_relevant_events', received: parsed.length }, 200, cors);
    }
  } else {
    // Manual test: single event {stageKey|stageId, dealId}
    const { stageKey, stageId, dealId } = parsed;
    events = [{ stageKey, stageId, dealId }];
  }

  // Procesar cada evento (max 100 típicamente por webhook batch HubSpot)
  const results = await Promise.all(events.map(async (ev) => {
    try {
      const result = await processLifecycleEvent(env, ev);
      return { ok: true, ...ev, ...result };
    } catch (e) {
      console.error('Lifecycle event failed:', ev, e.message);
      return { ok: false, ...ev, error: e.message };
    }
  }));

  const succeeded = results.filter(r => r.ok).length;
  return json({ ok: true, processed: results.length, succeeded, results }, 200, cors);
}

async function processLifecycleEvent(env, { stageKey, stageId, dealId }) {
  // Resolve stageKey
  if (!stageKey && stageId) {
    stageKey = HUBSPOT_STAGE_ID_TO_KEY[String(stageId)];
    if (!stageKey) throw new Error(`unknown_stage_id: ${stageId}`);
  }
  if (!stageKey || !LIFECYCLE_STAGE_MAP[stageKey]) {
    throw new Error(`invalid_stage_key: ${stageKey}`);
  }
  if (!dealId) throw new Error('missing_dealId');

  const token = env.HUBSPOT_TOKEN;
  if (!token) throw new Error('hubspot_token_missing');

  // Deal detail + contact assoc
  const dealRes = await fetch(
    `${HUBSPOT_API}/crm/v3/objects/deals/${dealId}?properties=dealname,amount,dealstage,pipeline&associations=contacts`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!dealRes.ok) throw new Error(`deal_lookup_failed: ${dealRes.status}`);
  const deal = await dealRes.json();

  // Filter: solo procesar deals del pipeline Marketon (por seguridad · evita ruido de otros pipelines)
  if (deal.properties?.pipeline !== env.HUBSPOT_PIPELINE_ID) {
    return { skipped: 'wrong_pipeline', pipeline: deal.properties?.pipeline };
  }

  const contactAssocId = deal.associations?.contacts?.results?.[0]?.id;
  if (!contactAssocId) throw new Error('no_associated_contact');

  // Contact detail
  const contactRes = await fetch(
    `${HUBSPOT_API}/crm/v3/objects/contacts/${contactAssocId}?properties=email,phone,firstname,lastname,industry,jobtitle,company_size`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!contactRes.ok) throw new Error(`contact_lookup_failed: ${contactRes.status}`);
  const contact = await contactRes.json();
  const cp = contact.properties || {};

  // Enrich con fbp/fbc del D1 (persistidos al submit original) para Meta match quality
  let d1Enrich = { fbp: null, fbc: null };
  try {
    const r = await env.APTO_LEADS_DB
      .prepare('SELECT fbp, fbc FROM leads WHERE hubspot_contact_id = ? ORDER BY id DESC LIMIT 1')
      .bind(contactAssocId).first();
    if (r) d1Enrich = { fbp: r.fbp, fbc: r.fbc };
  } catch (e) {
    console.error('D1 enrich failed (non-fatal):', e.message);
  }

  // Dispatch a Meta CAPI
  const meta = await sendMetaCAPILifecycleEvent(env, {
    stageKey,
    contactData: {
      email: cp.email,
      phone: cp.phone,
      firstname: cp.firstname,
      lastname: cp.lastname,
      hubspot_contact_id: contactAssocId,
      industry: cp.industry,
      jobtitle: cp.jobtitle,
      company_size: cp.company_size,
      fbp: d1Enrich.fbp,
      fbc: d1Enrich.fbc,
    },
    dealData: {
      id: dealId,
      amount: deal.properties?.amount,
      name: deal.properties?.dealname,
      stage: deal.properties?.dealstage,
    },
  });
  return { stageKey, contactId: contactAssocId, meta };
}

// HubSpot Webhook v3 signature: HMAC-SHA256 base64 de (method + URL + body + timestamp)
async function hmacSha256Base64(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  // base64 encode
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/* ─── /submit handler ────────────────────────────────────────────────────── */

async function handleSubmit(request, env, cors, ctx) {
  const body = await request.json().catch(() => ({}));

  // Validate required
  const errors = validatePayload(body);
  if (errors.length) {
    return json({ error: 'validation_error', fields: errors }, 400, cors);
  }

  const contactProps = normalizeContactProps(body, env);
  const dealProps = normalizeDealProps(body, env);
  const context = body.context || {};
  // Backfill UTMs desde el pageUri si el frontend no los mandó (fallback determinístico)
  // Google Ads / Meta Ads / cualquier paid channel manda utms en la query string;
  // sin este parse, las columnas D1 utm_* quedan NULL aunque la data cruda esté en pageUri.
  if (context.pageUri) {
    try {
      const uri = new URL(context.pageUri);
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
        if (!context[k] && uri.searchParams.has(k)) {
          context[k] = uri.searchParams.get(k);
        }
      }
    } catch (_) { /* invalid URI · seguir */ }
  }
  const clientIp = request.headers.get('CF-Connecting-IP') || '';
  const userAgent = request.headers.get('User-Agent') || '';
  const referrer = request.headers.get('Referer') || '';

  // Step 1: INSERT INTO leads (safety net) · ANTES de HubSpot
  let leadId;
  try {
    leadId = await insertLead(env, body, contactProps, context, clientIp, userAgent, referrer);
  } catch (e) {
    console.error('D1 INSERT failed (non-fatal):', e.message);
    // No matamos el submit por D1 fail; seguimos con HubSpot
  }

  // Steps 2-4: HubSpot Contact + Deal + Association (path crítico)
  let hubspotResult;
  let hubspotError = null;
  try {
    hubspotResult = await createHubSpotContactAndDeal(env, contactProps, dealProps);
    // Update D1 con success
    if (leadId) {
      ctx.waitUntil(
        env.APTO_LEADS_DB
          .prepare(
            "UPDATE leads SET hubspot_status='success', hubspot_contact_id=?, hubspot_deal_id=?, updated_at=datetime('now') WHERE id=?"
          )
          .bind(hubspotResult.contactId, hubspotResult.dealId, leadId)
          .run()
          .catch((e) => console.error('D1 UPDATE fail:', e.message))
      );
    }
  } catch (err) {
    hubspotError = err.message;
    console.error('HubSpot failure (lead persisted in D1):', err.message);
    if (leadId) {
      ctx.waitUntil(
        env.APTO_LEADS_DB
          .prepare(
            "UPDATE leads SET hubspot_status='failed', hubspot_error=?, updated_at=datetime('now') WHERE id=?"
          )
          .bind(err.message, leadId)
          .run()
          .catch((e) => console.error('D1 UPDATE fail:', e.message))
      );
    }
    // Response al cliente sanitizado: mensaje genérico · detalle completo solo en logs
    // (evita leak de tokens HubSpot, portal IDs, rate-limit details al FE/DataLayer)
    return json(
      { error: 'hubspot_failure', message: 'upstream_error', leadId },
      500,
      cors
    );
  }

  // Step 5: HubSpot Forms API (analytics · non-blocking)
  ctx.waitUntil(
    submitToHubSpotFormsAPI(env, body).catch((err) =>
      console.error('Forms API non-critical failure:', err.message)
    )
  );

  // Steps 6-8: non-blocking side effects con status updates
  ctx.waitUntil(runSideEffects(env, contactProps, dealProps, context, request, hubspotResult, leadId));

  return json(
    {
      ok: true,
      contactId: hubspotResult.contactId,
      dealId: hubspotResult.dealId,
      dealName: hubspotResult.dealName,
      leadId,
    },
    200,
    cors
  );
}

async function runSideEffects(env, contactProps, dealProps, context, request, hubspotResult, leadId) {
  const updates = {};

  // Meta CAPI · Lead event (dedup con pixel client-side vía event_id)
  try {
    if (env.META_ACCESS_TOKEN) {
      await sendMetaCAPILeadEvent(env, contactProps, context, request, hubspotResult?.contactId);
      updates.meta_capi_status = 'success';
    } else {
      updates.meta_capi_status = 'skipped';
    }
  } catch (e) {
    console.error('Meta CAPI failed:', e.message);
    updates.meta_capi_status = 'failed';
    updates.meta_capi_error = e.message;
  }

  // GA4
  try {
    if (env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET) {
      await sendGA4GenerateLead(env, contactProps, context);
      updates.ga4_status = 'success';
    } else {
      updates.ga4_status = 'skipped';
    }
  } catch (e) {
    console.error('GA4 failed:', e.message);
    updates.ga4_status = 'failed';
    updates.ga4_error = e.message;
  }

  // Resend email (multi-recipient)
  try {
    if (env.RESEND_API_KEY) {
      await sendEmailNotification(env, contactProps, dealProps, hubspotResult);
      updates.resend_status = 'success';
    } else {
      updates.resend_status = 'skipped';
    }
  } catch (e) {
    console.error('Resend failed:', e.message);
    updates.resend_status = 'failed';
    updates.resend_error = e.message;
  }

  // Update D1 con status
  if (leadId) {
    try {
      await env.APTO_LEADS_DB
        .prepare(
          `UPDATE leads
           SET meta_capi_status=?, meta_capi_error=?, ga4_status=?, ga4_error=?, resend_status=?, resend_error=?, updated_at=datetime('now')
           WHERE id=?`
        )
        .bind(
          updates.meta_capi_status,
          updates.meta_capi_error || null,
          updates.ga4_status,
          updates.ga4_error || null,
          updates.resend_status,
          updates.resend_error || null,
          leadId
        )
        .run();
    } catch (e) {
      console.error('D1 side-effects UPDATE failed:', e.message);
    }
  }
}

/* ─── D1 · lead persistence ──────────────────────────────────────────────── */

async function insertLead(env, body, contactProps, context, clientIp, userAgent, referrer) {
  const stmt = env.APTO_LEADS_DB.prepare(
    `INSERT INTO leads (
      firstname, lastname, email, company, jobtitle, industry, company_size, message,
      privacy_consent, privacy_consent_ts, privacy_notice_url,
      page_uri, page_name, hutk, fbp, fbc, ga_client_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referrer, user_agent, client_ip, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = await stmt
    .bind(
      contactProps.firstname,
      contactProps.lastname || null,
      contactProps.email,
      contactProps.company,
      contactProps.jobtitle,
      contactProps.industry || null,
      contactProps.company_size || null,
      contactProps.message || null,
      body.privacy_consent === true ? 1 : 0,
      // Timestamp del server, no del cliente · prueba legal LFPDPPP defendible
      body.privacy_consent === true ? new Date().toISOString() : null,
      body.privacy_notice_url || null,
      context.pageUri || null,
      context.pageName || null,
      context.hutk || null,
      context.fbp || null,
      context.fbc || null,
      context.client_id || null,
      context.utm_source || null,
      context.utm_medium || null,
      context.utm_campaign || null,
      context.utm_content || null,
      context.utm_term || null,
      referrer,
      userAgent,
      clientIp,
      JSON.stringify(body)
    )
    .run();
  return result.meta?.last_row_id ?? null;
}

/* ─── Payload validation + normalization ─────────────────────────────────── */

function validatePayload(body) {
  const errors = [];
  const required = ['firstname', 'email', 'company', 'jobtitle'];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim().length < 2) {
      errors.push({ field, message: `${field} required (min 2 chars)` });
    }
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push({ field: 'email', message: 'invalid email format' });
  }
  if (body.privacy_consent !== true) {
    errors.push({ field: 'privacy_consent', message: 'privacy consent required' });
  }
  return errors;
}

function normalizeContactProps(body, env) {
  const props = {
    firstname: (body.firstname || '').trim(),
    email: (body.email || '').trim().toLowerCase(),
    company: (body.company || '').trim(),
    jobtitle: (body.jobtitle || '').trim(),
    lifecyclestage: env.DEFAULT_LIFECYCLE_STAGE || 'lead',
  };
  if (body.lastname) props.lastname = body.lastname.trim();
  if (body.phone) props.phone = body.phone.trim();     // Meta CAPI EMQ +3pts
  if (body.industry) props.industry = body.industry.trim();
  if (body.company_size) props.company_size = body.company_size.trim();
  if (body.message) props.message = body.message.trim();
  return props;
}

function normalizeDealProps(body, env) {
  // HubSpot dealname max 320 chars · truncar con elipsis para evitar 400 upstream
  const rawDealName = `${(body.firstname || '').trim()}${
    body.lastname ? ' ' + body.lastname.trim() : ''
  } · ${(body.company || '').trim()}`;
  const dealName = rawDealName.length > 300 ? rawDealName.slice(0, 297) + '…' : rawDealName;
  const props = {
    pipeline: env.HUBSPOT_PIPELINE_ID,
    dealstage: env.HUBSPOT_DEAL_STAGE_NEW_LEAD,
    dealname: dealName,
  };
  const parts = [];
  if (body.message) parts.push(body.message.trim());
  if (body.privacy_consent === true) {
    // Server-side timestamp · client-supplied ts NO se usa (evita predating manipulable)
    const ts = new Date().toISOString();
    const url = body.privacy_notice_url || '';
    parts.push(`\n---\nAviso de privacidad aceptado: ${ts}${url ? ' · ' + url : ''}`);
  }
  if (parts.length) props.description = parts.join('');
  return props;
}

/* ─── HubSpot Contact + Deal + Association ───────────────────────────────── */

async function createHubSpotContactAndDeal(env, contactProps, dealProps) {
  const token = env.HUBSPOT_TOKEN;
  if (!token) throw new Error('HUBSPOT_TOKEN not configured');
  const contactId = await upsertContact(env, contactProps);
  const deal = await createDeal(env, dealProps, contactId);
  return { contactId, dealId: deal.id, dealName: dealProps.dealname };
}

async function upsertContact(env, props) {
  const token = env.HUBSPOT_TOKEN;
  const email = props.email;

  // Split lifecyclestage del rest — HubSpot APTO Portal bloquea "backward movement"
  // silenciosamente. Al crear con lifecyclestage="lead", APTO auto-mapea a "Contacto"
  // (146137940). Fix: crear sin lifecyclestage, luego clear+set en 2 pasos separados.
  const targetLifecycle = props.lifecyclestage;
  const propsWithoutLifecycle = { ...props };
  delete propsWithoutLifecycle.lifecyclestage;

  const createRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ properties: propsWithoutLifecycle }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    if (targetLifecycle) {
      await forceLifecycleStage(env, data.id, targetLifecycle);
    }
    return data.id;
  }

  if (createRes.status === 409) {
    const searchRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
        limit: 1,
        properties: ['email'],
      }),
    });
    if (!searchRes.ok) throw new Error(`Contact search failed: ${searchRes.status}`);
    const searchData = await searchRes.json();
    if (!searchData.results?.length) throw new Error(`Contact ${email} conflict but not found`);
    const contactId = searchData.results[0].id;

    const updateProps = { ...props };
    delete updateProps.email;
    const targetLifecycleForUpdate = updateProps.lifecyclestage;
    delete updateProps.lifecyclestage;

    const updateRes = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ properties: updateProps }),
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Contact update failed: ${updateRes.status} ${errText}`);
    }
    if (targetLifecycleForUpdate) {
      await forceLifecycleStage(env, contactId, targetLifecycleForUpdate);
    }
    return contactId;
  }

  const errText = await createRes.text();
  throw new Error(`Contact create failed: ${createRes.status} ${errText}`);
}

// HubSpot bloquea "backward movement" de lifecyclestage silenciosamente.
// Fix: clear (set "") → luego set target. 2 PATCH calls separadas.
async function forceLifecycleStage(env, contactId, targetStage) {
  const token = env.HUBSPOT_TOKEN;
  const clearRes = await fetch(
    `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ properties: { lifecyclestage: '' } }),
    }
  );
  if (!clearRes.ok) {
    console.error('lifecyclestage clear failed (non-fatal):', clearRes.status);
    return;
  }
  const setRes = await fetch(
    `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ properties: { lifecyclestage: targetStage } }),
    }
  );
  if (!setRes.ok) {
    console.error('lifecyclestage set failed (non-fatal):', setRes.status);
  }
}

async function createDeal(env, dealProps, contactId) {
  const token = env.HUBSPOT_TOKEN;
  const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      properties: dealProps,
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: HUBSPOT_CONTACT_TO_DEAL_ASSOC_TYPE }],
        },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Deal create failed: ${res.status} ${errText}`);
  }
  return res.json();
}

/* ─── HubSpot Forms API v3 (analytics · non-blocking) ────────────────────── */

async function submitToHubSpotFormsAPI(env, body) {
  const portalId = env.HUBSPOT_PORTAL_ID;
  const formId = env.HUBSPOT_FORM_ID;
  const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

  const fields = ['firstname', 'lastname', 'email', 'company', 'jobtitle', 'industry', 'company_size', 'message']
    .filter((k) => body[k])
    .map((k) => ({ objectTypeId: '0-1', name: k, value: String(body[k]).trim() }));

  const context = {};
  if (body.context?.pageUri) context.pageUri = body.context.pageUri;
  if (body.context?.pageName) context.pageName = body.context.pageName;
  if (body.context?.hutk) context.hutk = body.context.hutk;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, context }),
  });
  if (!res.ok) throw new Error(`Forms API submit failed: ${res.status}`);
}

/* ─── Meta CAPI · lifecycle stage → event mapping ────────────────────────── */
// Doctrina: Andromeda entiende mejor los standard events. Custom names solo
// donde no hay equivalente exacto. Value MXN escalado por etapa del funnel
// permite value-based bidding real (Andromeda aprende qué creativos traen
// leads que llegan más lejos, no solo leads baratos).

const META_PIXEL_ID = '721335916342252';
const META_API_VERSION = 'v22.0';

// Mapping por stageKey (semántico) — usado por lifecycle handler
const LIFECYCLE_STAGE_MAP = {
  new_lead:       { event_name: 'Lead',             value: 500,    action_source: 'website' },
  mql:            { event_name: 'Lead_MQL',         value: 2000,   action_source: 'website' },
  sql:            { event_name: 'Lead_SQL',         value: 10000,  action_source: 'website' },
  discovery_held: { event_name: 'InitiateCheckout', value: 25000,  action_source: 'website' },
  proposal_sent:  { event_name: 'AddPaymentInfo',   value: 75000,  action_source: 'website' },
  negotiation:    { event_name: 'AddPaymentInfo',   value: 100000, action_source: 'website' },
  deal_won:       { event_name: 'Purchase',         value: null,   action_source: 'physical_store' }, // value from deal amount
  deal_lost:      { event_name: 'Lead_Lost',        value: 0,      action_source: 'website' },
};

// Mapping HubSpot stage IDs → stageKey (Pipeline Marketon · APTO Sales Pipeline 2026H2, id 922134387)
// Permite que HubSpot Workflow envíe solo dealstage_id (built-in property) sin lookup extra
const HUBSPOT_STAGE_ID_TO_KEY = {
  '1407911441': 'new_lead',
  '1407911442': 'mql',
  '1407911443': 'sql',
  '1407911444': 'discovery_held',
  '1407911445': 'proposal_sent',
  '1407667750': 'negotiation',
  '1407911446': 'deal_won',
  '1407911447': 'deal_lost',
};

/* ─── Meta CAPI · core sender (usado por Lead client-server dedup + lifecycle) */

async function sendMetaCAPIEvent(env, {
  eventName,
  eventId,           // string · required. Para Lead usar el mismo eventID del pixel (dedup 48h)
  eventSourceUrl,    // opcional. Default landing.apto.mx
  actionSource,      // 'website' | 'physical_store' | 'system_generated'
  userData = {},     // {email, phone, firstName, lastName, country, fbp, fbc, clientIp, userAgent, externalId}
  customData = {},   // {value, currency, contentName, jobtitle, industry, companySize, dealStage, ...}
}) {
  if (!env.META_ACCESS_TOKEN) return { skipped: true, reason: 'META_ACCESS_TOKEN not set' };

  const pixelId = env.META_PIXEL_ID || META_PIXEL_ID;
  const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${env.META_ACCESS_TOKEN}`;

  // Hash SHA-256 lowercase trim per Meta CAPI spec para user_data hasheable
  const ud = {};
  if (userData.email)      ud.em  = await sha256(userData.email);
  if (userData.phone)      ud.ph  = await sha256(normalizePhone(userData.phone));
  if (userData.firstName)  ud.fn  = await sha256(userData.firstName);
  if (userData.lastName)   ud.ln  = await sha256(userData.lastName);
  if (userData.country)    ud.country = await sha256(userData.country);
  if (userData.externalId) ud.external_id = await sha256(userData.externalId);
  // fbp/fbc/IP/UA NO se hashean per spec
  if (userData.fbp)        ud.fbp = userData.fbp;
  if (userData.fbc)        ud.fbc = userData.fbc;
  if (userData.clientIp)   ud.client_ip_address = userData.clientIp;
  if (userData.userAgent)  ud.client_user_agent = userData.userAgent;

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: eventSourceUrl || 'https://landing.apto.mx/',
      action_source: actionSource || 'website',
      event_id: eventId,
      user_data: ud,
      custom_data: customData,
    }],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Meta CAPI ${eventName} failed: ${res.status} ${body}`);
  return { ok: true, event_name: eventName, event_id: eventId, response: body };
}

function normalizePhone(phone) {
  // Meta CAPI espera E.164 sin + · solo dígitos
  return String(phone).replace(/[^\d]/g, '');
}

/* ─── Meta CAPI · Lead event (form submit, dedup con pixel client) ───────── */

async function sendMetaCAPILeadEvent(env, contactProps, context, request, hubspotContactId) {
  if (!env.META_ACCESS_TOKEN) return;

  // eventID MUST match el que el pixel client-side generó (window.__aptoLastLeadEventId)
  // El landing lo debe enviar en context.event_id · sin él, generamos uno pero pierde dedup
  const eventId = context.event_id || `apto-lead-fallback-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;

  return await sendMetaCAPIEvent(env, {
    eventName: 'Lead',
    eventId,
    eventSourceUrl: context.pageUri || 'https://landing.apto.mx/',
    actionSource: 'website',
    userData: {
      email: contactProps.email,
      phone: contactProps.phone,
      firstName: contactProps.firstname,
      lastName: contactProps.lastname,
      country: 'MX',
      externalId: hubspotContactId,      // Cross-device tracking + audiencia lookalike HubSpot
      fbp: context.fbp,
      fbc: context.fbc,
      clientIp: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent'),
    },
    customData: {
      currency: 'MXN',
      value: 500,                       // Baseline Lead value · MQL/SQL/Won lo escalarán
      content_name: 'APTO Landing Madre · Diagnóstico Request',
      content_category: 'B2B Enterprise Consulting',
      // custom fields para audiencias específicas por tipología ICP
      industry: contactProps.industry || '',
      company_size: contactProps.company_size || '',
      job_title: contactProps.jobtitle || '',
      lead_type: 'landing_page',
      hubspot_contact_id: hubspotContactId || '',
    },
  });
}

/* ─── Meta CAPI · Lifecycle event (HubSpot stage change) ─────────────────── */

async function sendMetaCAPILifecycleEvent(env, {
  stageKey,          // 'new_lead' | 'mql' | 'sql' | 'opportunity' | 'deal_won' | 'deal_lost'
  contactData,       // {email, phone, firstname, lastname, hubspot_contact_id, industry, jobtitle, company_size, fbp, fbc}
  dealData,          // {id, amount, name, stage}
}) {
  const mapping = LIFECYCLE_STAGE_MAP[stageKey];
  if (!mapping) throw new Error(`Unknown lifecycle stageKey: ${stageKey}`);

  // event_id único por lifecycle event · NO dedup (son eventos incrementales)
  const eventId = `apto-lifecycle-${stageKey}-${dealData?.id || contactData.hubspot_contact_id}-${Date.now()}`;

  const value = stageKey === 'deal_won'
    ? (parseFloat(dealData?.amount) || 100000)  // fallback 100K si Deal Won sin amount
    : mapping.value;

  return await sendMetaCAPIEvent(env, {
    eventName: mapping.event_name,
    eventId,
    eventSourceUrl: 'https://landing.apto.mx/',
    actionSource: mapping.action_source,
    userData: {
      email: contactData.email,
      phone: contactData.phone,
      firstName: contactData.firstname,
      lastName: contactData.lastname,
      country: 'MX',
      externalId: contactData.hubspot_contact_id,
      fbp: contactData.fbp,
      fbc: contactData.fbc,
    },
    customData: {
      currency: 'MXN',
      value: value,
      content_name: `APTO ${stageKey}`,
      content_category: 'B2B Enterprise Consulting',
      industry: contactData.industry || '',
      company_size: contactData.company_size || '',
      job_title: contactData.jobtitle || '',
      lifecycle_stage: stageKey,
      hubspot_contact_id: contactData.hubspot_contact_id || '',
      hubspot_deal_id: dealData?.id || '',
      deal_name: dealData?.name || '',
    },
  });
}

/* ─── GA4 Measurement Protocol · generate_lead ───────────────────────────── */

async function sendGA4GenerateLead(env, contactProps, context) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) return;
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`;
  const clientId = context.client_id || (await sha256(contactProps.email)).slice(0, 20);
  const payload = {
    client_id: clientId,
    events: [{ name: 'generate_lead', params: { currency: 'MXN', value: 100, page_location: context.pageUri || 'https://apto.mx' } }],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status >= 300) throw new Error(`GA4 MP failed: ${res.status}`);
}

/* ─── Email notify via Resend (MULTI-RECIPIENT) ──────────────────────────── */

async function sendEmailNotification(env, contactProps, dealProps, hubspotResult) {
  if (!env.RESEND_API_KEY) return;
  const recipients = (env.NOTIFICATION_EMAIL_TO || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!recipients.length) throw new Error('NOTIFICATION_EMAIL_TO not configured');
  const from = env.NOTIFICATION_EMAIL_FROM || 'APTO Landing <no-reply@marketon.mx>';

  const html = `
    <h2>Nuevo lead APTO Landing Madre</h2>
    <p><b>Nombre:</b> ${escapeHtml(contactProps.firstname)} ${escapeHtml(contactProps.lastname || '')}</p>
    <p><b>Email:</b> <a href="mailto:${encodeURIComponent(contactProps.email)}">${escapeHtml(contactProps.email)}</a></p>
    <p><b>Empresa:</b> ${escapeHtml(contactProps.company)}</p>
    <p><b>Cargo:</b> ${escapeHtml(contactProps.jobtitle)}</p>
    ${contactProps.industry ? `<p><b>Industria:</b> ${escapeHtml(contactProps.industry)}</p>` : ''}
    ${contactProps.company_size ? `<p><b>Tamaño empresa:</b> ${escapeHtml(contactProps.company_size)}</p>` : ''}
    ${contactProps.message ? `<p><b>Mensaje:</b> ${escapeHtml(contactProps.message)}</p>` : ''}
    <hr>
    <p><a href="https://app.hubspot.com/contacts/${env.HUBSPOT_PORTAL_ID}/record/0-1/${hubspotResult.contactId}">Ver Contact en HubSpot →</a></p>
    <p><a href="https://app.hubspot.com/contacts/${env.HUBSPOT_PORTAL_ID}/record/0-3/${hubspotResult.dealId}">Ver Deal en HubSpot →</a></p>
    <p><small>Deal: ${escapeHtml(dealProps.dealname)} · Pipeline Marketon · New Lead</small></p>
    <hr>
    <p><small style="color:#64748b">Notificación enviada a: ${recipients.map(escapeHtml).join(', ')}</small></p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `Nuevo lead APTO · ${contactProps.company}`,
      html,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend failed: ${res.status} ${errText}`);
  }
}

/* ─── Utils ──────────────────────────────────────────────────────────────── */

function json(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

async function sha256(text) {
  const encoded = new TextEncoder().encode(String(text).toLowerCase().trim());
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
