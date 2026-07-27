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
