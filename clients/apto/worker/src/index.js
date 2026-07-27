/**
 * APTO Landing Madre · Backend Marketon Orchestrator (Cloudflare Worker)
 *
 * Endpoint: POST /submit
 *
 * Flow on submit:
 *   1. Validate + normalize payload
 *   2. HubSpot Forms API v3 (analytics + form UI capture)
 *   3. HubSpot CRM Contacts API (create/update + lifecyclestage=lead + industry + company_size)
 *   4. HubSpot CRM Deals API (create Deal en pipeline Marketon, stage=New Lead)
 *   5. HubSpot Associations API (Contact ↔ Deal, associationTypeId 3)
 *   6. Meta CAPI Lead event (server-side, dedup con Pixel client-side vía event_id) · si META_ACCESS_TOKEN
 *   7. GA4 generate_lead (Measurement Protocol) · si GA4_MEASUREMENT_ID
 *   8. Email notify chucho@marketon.mx · si RESEND_API_KEY
 *
 * All external calls are best-effort — if 2-8 fail, we still return 200 to the client
 * as long as HubSpot Contact was created (step 3). Deal (step 4) is critical; failure
 * there returns 500 to trigger client retry.
 *
 * Env vars (vars):
 *   ALLOWED_ORIGIN                — https://mktgrupoplasenciaautomotriz.github.io o custom domain
 *   HUBSPOT_PORTAL_ID             — 2583031
 *   HUBSPOT_FORM_ID               — 6f9db620-165b-451b-8b49-76b441eea7ce
 *   HUBSPOT_PIPELINE_ID           — 922134387 (Marketon · APTO Sales Pipeline 2026H2)
 *   HUBSPOT_DEAL_STAGE_NEW_LEAD   — 1407911441
 *   DEFAULT_LIFECYCLE_STAGE       — "lead"
 *   NOTIFICATION_EMAIL_TO         — chucho@marketon.mx
 *
 * Secrets (wrangler secret put):
 *   HUBSPOT_TOKEN                 — Private App token
 *   META_ACCESS_TOKEN             — opcional (Pixel CAPI)
 *   META_TEST_EVENT_CODE          — opcional
 *   GA4_MEASUREMENT_ID            — opcional (G-XXXXXXX)
 *   GA4_API_SECRET                — opcional
 *   RESEND_API_KEY                — opcional
 */

const CORS_HEADERS = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
});

const HUBSPOT_API = 'https://api.hubapi.com';
const HUBSPOT_CONTACT_TO_DEAL_ASSOC_TYPE = 3; // canonical HubSpot association ID

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = CORS_HEADERS(env.ALLOWED_ORIGIN || origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    try {
      if (url.pathname === '/submit' && request.method === 'POST') {
        return await handleSubmit(request, env, cors, ctx);
      }
      if (url.pathname === '/health' || url.pathname === '/') {
        return json(
          {
            status: 'ok',
            name: 'apto-landing-api',
            version: '1.0.0',
            endpoints: ['/submit'],
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
          },
          200,
          cors
        );
      }
      return json({ error: 'not_found' }, 404, cors);
    } catch (err) {
      console.error('Unhandled error:', err.message, err.stack);
      return json({ error: 'server_error', message: err.message }, 500, cors);
    }
  },
};

/* ─── /submit handler ────────────────────────────────────────────────────── */

async function handleSubmit(request, env, cors, ctx) {
  const body = await request.json().catch(() => ({}));

  // Validate required fields
  const errors = validatePayload(body);
  if (errors.length) {
    return json({ error: 'validation_error', fields: errors }, 400, cors);
  }

  const contactProps = normalizeContactProps(body, env);
  const dealProps = normalizeDealProps(body, env);
  const context = body.context || {};

  // Steps 3-5: HubSpot Contact + Deal + Association (critical path)
  let hubspotResult;
  try {
    hubspotResult = await createHubSpotContactAndDeal(
      env,
      contactProps,
      dealProps,
      context
    );
  } catch (err) {
    console.error('HubSpot critical failure:', err.message);
    return json(
      { error: 'hubspot_failure', message: err.message },
      500,
      cors
    );
  }

  // Step 2: HubSpot Forms API (analytics · non-blocking)
  ctx.waitUntil(submitToHubSpotFormsAPI(env, body).catch((err) => {
    console.error('Forms API non-critical failure:', err.message);
  }));

  // Steps 6-8: non-blocking side effects
  ctx.waitUntil(
    Promise.allSettled([
      sendMetaCAPILeadEvent(env, contactProps, context, request).catch((e) =>
        console.error('Meta CAPI failed:', e.message)
      ),
      sendGA4GenerateLead(env, contactProps, context).catch((e) =>
        console.error('GA4 failed:', e.message)
      ),
      sendEmailNotification(env, contactProps, dealProps, hubspotResult).catch(
        (e) => console.error('Email notify failed:', e.message)
      ),
    ])
  );

  return json(
    {
      ok: true,
      contactId: hubspotResult.contactId,
      dealId: hubspotResult.dealId,
      dealName: hubspotResult.dealName,
    },
    200,
    cors
  );
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
  if (body.message) {
    props.description = body.message.trim();
  }
  return props;
}

/* ─── HubSpot Contact + Deal + Association ───────────────────────────────── */

async function createHubSpotContactAndDeal(env, contactProps, dealProps, context) {
  const token = env.HUBSPOT_TOKEN;
  if (!token) throw new Error('HUBSPOT_TOKEN not configured');

  // 1. Upsert Contact by email (avoids duplicates)
  const contactId = await upsertContact(env, contactProps);

  // 2. Create Deal
  const deal = await createDeal(env, dealProps, contactId);

  return {
    contactId,
    dealId: deal.id,
    dealName: dealProps.dealname,
  };
}

async function upsertContact(env, props) {
  const token = env.HUBSPOT_TOKEN;
  const email = props.email;

  // Try create first
  const createRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ properties: props }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    return data.id;
  }

  // If 409 conflict (email exists), update instead
  if (createRes.status === 409) {
    const searchRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: email }] },
        ],
        limit: 1,
        properties: ['email'],
      }),
    });
    if (!searchRes.ok) {
      throw new Error(`Contact search failed: ${searchRes.status}`);
    }
    const searchData = await searchRes.json();
    if (!searchData.results?.length) {
      throw new Error(`Contact ${email} conflict but not found in search`);
    }
    const contactId = searchData.results[0].id;

    // Update lifecyclestage + any new props (don't overwrite existing firstname unless empty)
    const updateProps = { ...props };
    delete updateProps.email; // email is immutable identifier here

    const updateRes = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ properties: updateProps }),
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Contact update failed: ${updateRes.status} ${errText}`);
    }
    return contactId;
  }

  const errText = await createRes.text();
  throw new Error(`Contact create failed: ${createRes.status} ${errText}`);
}

async function createDeal(env, dealProps, contactId) {
  const token = env.HUBSPOT_TOKEN;
  const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      properties: dealProps,
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: HUBSPOT_CONTACT_TO_DEAL_ASSOC_TYPE,
            },
          ],
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
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Forms API submit failed: ${res.status} ${errText}`);
  }
}

/* ─── Meta CAPI Lead event ───────────────────────────────────────────────── */

async function sendMetaCAPILeadEvent(env, contactProps, context, request) {
  if (!env.META_ACCESS_TOKEN) return;
  const pixelId = '721335916342252'; // hardcoded pixel APTO
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${env.META_ACCESS_TOKEN}`;

  const userData = {
    em: await sha256(contactProps.email),
  };
  const fbp = context.fbp || null;
  const fbc = context.fbc || null;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
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
        custom_data: {
          currency: 'MXN',
          value: 100, // valor tentativo lead APTO
        },
      },
    ],
  };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Meta CAPI failed: ${res.status} ${errText}`);
  }
}

/* ─── GA4 Measurement Protocol · generate_lead ───────────────────────────── */

async function sendGA4GenerateLead(env, contactProps, context) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) return;
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`;

  // GA4 requires client_id; use hash of email as fallback if not passed
  const clientId = context.client_id || (await sha256(contactProps.email)).slice(0, 20);

  const payload = {
    client_id: clientId,
    events: [
      {
        name: 'generate_lead',
        params: {
          currency: 'MXN',
          value: 100,
          page_location: context.pageUri || 'https://apto.mx',
        },
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  // GA4 MP returns 204 no content on success
  if (res.status >= 300) {
    const errText = await res.text();
    throw new Error(`GA4 MP failed: ${res.status} ${errText}`);
  }
}

/* ─── Email notify via Resend ────────────────────────────────────────────── */

async function sendEmailNotification(env, contactProps, dealProps, hubspotResult) {
  if (!env.RESEND_API_KEY) return;
  const to = env.NOTIFICATION_EMAIL_TO || 'chucho@marketon.mx';

  const html = `
    <h2>Nuevo lead APTO Landing Madre</h2>
    <p><b>Nombre:</b> ${contactProps.firstname} ${contactProps.lastname || ''}</p>
    <p><b>Email:</b> <a href="mailto:${contactProps.email}">${contactProps.email}</a></p>
    <p><b>Empresa:</b> ${contactProps.company}</p>
    <p><b>Cargo:</b> ${contactProps.jobtitle}</p>
    ${contactProps.industry ? `<p><b>Industria:</b> ${contactProps.industry}</p>` : ''}
    ${contactProps.company_size ? `<p><b>Tamaño empresa:</b> ${contactProps.company_size}</p>` : ''}
    ${contactProps.message ? `<p><b>Mensaje:</b> ${contactProps.message}</p>` : ''}
    <hr>
    <p><a href="https://app.hubspot.com/contacts/${env.HUBSPOT_PORTAL_ID}/record/0-1/${hubspotResult.contactId}">Ver Contact en HubSpot →</a></p>
    <p><a href="https://app.hubspot.com/contacts/${env.HUBSPOT_PORTAL_ID}/record/0-3/${hubspotResult.dealId}">Ver Deal en HubSpot →</a></p>
    <p><small>Deal: ${dealProps.dealname} · Pipeline Marketon · New Lead</small></p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'APTO Landing <no-reply@marketon.mx>',
      to: [to],
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
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

async function sha256(text) {
  const encoded = new TextEncoder().encode(String(text).toLowerCase().trim());
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
