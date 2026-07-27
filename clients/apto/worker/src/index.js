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
      if (url.pathname === '/admin/leads' && request.method === 'GET') {
        return await handleAdminLeads(request, env, url, cors);
      }
      if (url.pathname === '/health' || url.pathname === '/') {
        return await handleHealth(env, cors);
      }
      return json({ error: 'not_found' }, 404, cors);
    } catch (err) {
      console.error('Unhandled error:', err.message, err.stack);
      return json({ error: 'server_error', message: err.message }, 500, cors);
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
    return json(
      { error: 'hubspot_failure', message: err.message, leadId },
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

  // Meta CAPI
  try {
    if (env.META_ACCESS_TOKEN) {
      await sendMetaCAPILeadEvent(env, contactProps, context, request);
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
      page_uri, page_name, hutk, fbp, fbc, ga_client_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      referrer, user_agent, client_ip, raw_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
  if (body.industry) props.industry = body.industry.trim();
  if (body.company_size) props.company_size = body.company_size.trim();
  if (body.message) props.message = body.message.trim();
  return props;
}

function normalizeDealProps(body, env) {
  const dealName = `${(body.firstname || '').trim()}${
    body.lastname ? ' ' + body.lastname.trim() : ''
  } · ${(body.company || '').trim()}`;
  const props = {
    pipeline: env.HUBSPOT_PIPELINE_ID,
    dealstage: env.HUBSPOT_DEAL_STAGE_NEW_LEAD,
    dealname: dealName,
  };
  if (body.message) props.description = body.message.trim();
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

/* ─── Meta CAPI Lead event ───────────────────────────────────────────────── */

async function sendMetaCAPILeadEvent(env, contactProps, context, request) {
  if (!env.META_ACCESS_TOKEN) return;
  const pixelId = '721335916342252';
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${env.META_ACCESS_TOKEN}`;

  const userData = { em: await sha256(contactProps.email) };
  if (context.fbp) userData.fbp = context.fbp;
  if (context.fbc) userData.fbc = context.fbc;
  const clientIp = request.headers.get('CF-Connecting-IP');
  const userAgent = request.headers.get('User-Agent');
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  const eventId = context.event_id || crypto.randomUUID();
  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: context.pageUri || 'https://apto.mx',
        action_source: 'website',
        event_id: eventId,
        user_data: userData,
        custom_data: { currency: 'MXN', value: 100 },
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Meta CAPI failed: ${res.status}`);
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
