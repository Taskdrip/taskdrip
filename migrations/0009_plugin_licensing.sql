ALTER TABLE plugin_studio_projects
  ADD COLUMN IF NOT EXISTS license_api_base_url VARCHAR,
  ADD COLUMN IF NOT EXISTS max_activations INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS release_notes TEXT;

CREATE TABLE IF NOT EXISTS plugin_licenses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES plugin_studio_projects(id) ON DELETE CASCADE,
  product_id VARCHAR NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  purchase_id VARCHAR UNIQUE REFERENCES purchases(id) ON DELETE CASCADE,
  key_hash VARCHAR NOT NULL UNIQUE,
  key_encrypted TEXT NOT NULL,
  key_prefix VARCHAR NOT NULL,
  cadence VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'active',
  starts_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  reminder_stage VARCHAR NOT NULL DEFAULT '',
  max_activations INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS plugin_licenses_user_status_idx ON plugin_licenses(user_id, status);
CREATE INDEX IF NOT EXISTS plugin_licenses_project_status_idx ON plugin_licenses(project_id, status);
CREATE INDEX IF NOT EXISTS plugin_licenses_expiry_idx ON plugin_licenses(status, expires_at);

CREATE TABLE IF NOT EXISTS plugin_license_sites (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id VARCHAR NOT NULL REFERENCES plugin_licenses(id) ON DELETE CASCADE,
  installation_id VARCHAR NOT NULL,
  site_url TEXT NOT NULL,
  plugin_version VARCHAR,
  wordpress_version VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'active',
  activated_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS plugin_license_sites_license_installation_unique ON plugin_license_sites(license_id, installation_id);
CREATE INDEX IF NOT EXISTS plugin_license_sites_license_status_idx ON plugin_license_sites(license_id, status);
CREATE INDEX IF NOT EXISTS plugin_license_sites_installation_idx ON plugin_license_sites(installation_id);

CREATE TABLE IF NOT EXISTS plugin_license_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id VARCHAR REFERENCES plugin_licenses(id) ON DELETE SET NULL,
  project_id VARCHAR NOT NULL REFERENCES plugin_studio_projects(id) ON DELETE CASCADE,
  installation_id VARCHAR,
  event_type VARCHAR NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS plugin_license_events_project_date_idx ON plugin_license_events(project_id, created_at);
CREATE INDEX IF NOT EXISTS plugin_license_events_license_date_idx ON plugin_license_events(license_id, created_at);

CREATE TABLE IF NOT EXISTS plugin_support_threads (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id VARCHAR NOT NULL REFERENCES plugin_licenses(id) ON DELETE CASCADE,
  project_id VARCHAR NOT NULL REFERENCES plugin_studio_projects(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  developer_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  request_type VARCHAR NOT NULL DEFAULT 'support',
  subject VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugin_support_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id VARCHAR NOT NULL REFERENCES plugin_support_threads(id) ON DELETE CASCADE,
  sender_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS plugin_support_messages_thread_date_idx ON plugin_support_messages(thread_id, created_at);
