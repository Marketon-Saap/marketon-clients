-- Karbot landing · leads capture safety net
-- Aplicar con: wrangler d1 execute karbot-leads --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nombre       TEXT    NOT NULL,
  empresa      TEXT    NOT NULL,
  email        TEXT,
  phone        TEXT,
  agencias     TEXT,
  rol          TEXT,
  slot_start   TEXT,
  slot_end     TEXT,
  source       TEXT    DEFAULT 'landing',
  event_id     TEXT,           -- Google Calendar event.id (si real)
  meet_link    TEXT,           -- hangoutLink de Google Meet
  mock         INTEGER DEFAULT 0, -- 1 si booking fue mock (sin refresh_token)
  email_sent   INTEGER DEFAULT 0, -- 1 si Resend confirmó envío
  email_error  TEXT,           -- mensaje de error si Resend falló
  user_agent   TEXT,
  ip           TEXT,
  referrer     TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
