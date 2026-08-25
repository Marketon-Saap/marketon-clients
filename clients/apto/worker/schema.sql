-- APTO Landing Madre · Lead persistence D1 schema
-- Cada submit persiste ANTES de HubSpot call → safety net contra pérdida de leads
-- Query via: wrangler d1 execute apto-leads --command "SELECT * FROM leads ORDER BY created_at DESC LIMIT 20"

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,

  -- Form fields (originalmente del submit)
  firstname TEXT NOT NULL,
  lastname TEXT,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  jobtitle TEXT NOT NULL,
  industry TEXT,
  company_size TEXT,
  message TEXT,

  -- Legal · consent LFPDPPP (proof of consent)
  privacy_consent INTEGER DEFAULT 0,      -- 0 = not accepted, 1 = accepted
  privacy_consent_ts TEXT,                -- ISO timestamp del acceptance
  privacy_notice_url TEXT,                -- URL del aviso vigente al aceptar

  -- Context del cliente (attribution)
  page_uri TEXT,
  page_name TEXT,
  hutk TEXT,
  fbp TEXT,
  fbc TEXT,
  ga_client_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer TEXT,
  user_agent TEXT,
  client_ip TEXT,

  -- HubSpot integration status
  hubspot_status TEXT DEFAULT 'pending',      -- pending | success | failed
  hubspot_contact_id TEXT,
  hubspot_deal_id TEXT,
  hubspot_error TEXT,

  -- Non-critical integrations status
  meta_capi_status TEXT DEFAULT 'skipped',    -- skipped | pending | success | failed
  meta_capi_error TEXT,
  ga4_status TEXT DEFAULT 'skipped',
  ga4_error TEXT,
  resend_status TEXT DEFAULT 'skipped',
  resend_error TEXT,

  -- Raw payload as backup (JSON)
  raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_hubspot_status ON leads(hubspot_status);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);

-- Sprint 94b · Safety net para el flujo apto.mx/contacto/ (webhook contact.creation).
-- El path landing.apto.mx persiste en `leads` desde /submit; el path apto.mx llega vía
-- webhook DESPUÉS que HubSpot creó el Contact, así que el safety net es distinto:
-- registramos cada hit del webhook + status de Deal creation + enrichment CAPI/GA4.
CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  source TEXT NOT NULL,                    -- 'hubspot_form_submission' | 'hubspot_lifecycle' | ...
  hubspot_event_id TEXT,                   -- eventId de HubSpot Webhook v3
  hubspot_contact_id TEXT,
  hubspot_deal_id TEXT,                    -- Deal creado (si aplica)
  hubspot_form_name TEXT,                  -- recent_conversion_event_name

  processed_status TEXT DEFAULT 'pending', -- pending | deal_created | skipped_duplicate | skipped_not_target_form | failed
  processed_reason TEXT,                   -- explicación de skip/fail

  meta_capi_status TEXT DEFAULT 'skipped', -- skipped | success | failed
  meta_capi_event_id TEXT,
  meta_capi_error TEXT,

  ga4_mp_status TEXT DEFAULT 'skipped',
  ga4_mp_error TEXT,

  raw_payload TEXT                         -- request body para forensics
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_contact_id ON webhook_events(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(processed_status);
