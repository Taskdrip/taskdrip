CREATE TABLE IF NOT EXISTS free_download_categories (
  id TEXT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES free_download_categories(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_preachers (
  id TEXT PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  photograph_url TEXT,
  biography TEXT NOT NULL DEFAULT '',
  ministry_name VARCHAR(180) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_items (
  id TEXT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  slug VARCHAR(240) NOT NULL UNIQUE,
  short_description VARCHAR(600) NOT NULL DEFAULT '',
  description_html TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL REFERENCES free_download_categories(id) ON DELETE RESTRICT,
  subcategory_id TEXT REFERENCES free_download_subcategories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  gallery_urls TEXT[] NOT NULL DEFAULT '{}',
  preview_video_url TEXT,
  external_demo_url TEXT,
  format VARCHAR(40) NOT NULL DEFAULT '',
  version VARCHAR(80) NOT NULL DEFAULT '',
  creator VARCHAR(180) NOT NULL DEFAULT '',
  release_date DATE,
  system_requirements TEXT NOT NULL DEFAULT '',
  installation_instructions TEXT NOT NULL DEFAULT '',
  features TEXT[] NOT NULL DEFAULT '{}',
  preacher_id TEXT REFERENCES free_download_preachers(id) ON DELETE SET NULL,
  source_file_key TEXT,
  source_file_name VARCHAR(255),
  source_mime_type VARCHAR(160),
  source_size_bytes BIGINT,
  external_download_url TEXT,
  seo_title VARCHAR(220) NOT NULL DEFAULT '',
  seo_description VARCHAR(320) NOT NULL DEFAULT '',
  focus_keyword VARCHAR(160) NOT NULL DEFAULT '',
  canonical_url TEXT,
  og_title VARCHAR(220) NOT NULL DEFAULT '',
  og_description VARCHAR(320) NOT NULL DEFAULT '',
  og_image TEXT,
  publication_status VARCHAR(16) NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_items_public_idx
  ON free_download_items(publication_status, category_id, published_at DESC);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_items_featured_idx
  ON free_download_items(is_featured, publication_status, published_at DESC);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_items_preacher_idx
  ON free_download_items(preacher_id, publication_status);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  download_id TEXT NOT NULL REFERENCES free_download_items(id) ON DELETE CASCADE,
  ad_redirected_at TIMESTAMPTZ,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, download_id)
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_unlocks_user_idx
  ON free_download_unlocks(user_id, unlocked_at DESC);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  download_id TEXT REFERENCES free_download_items(id) ON DELETE CASCADE,
  event_type VARCHAR(32) NOT NULL
    CHECK (event_type IN ('detail_view', 'ad_redirect', 'unlock', 'download_click')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_events_type_date_idx
  ON free_download_events(event_type, created_at DESC);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_events_download_date_idx
  ON free_download_events(download_id, created_at DESC);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_title VARCHAR(220) NOT NULL,
  category_name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  preferred_format VARCHAR(80) NOT NULL DEFAULT '',
  reference_url TEXT,
  email VARCHAR(254) NOT NULL,
  additional_comments TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'available', 'rejected')),
  internal_notes TEXT NOT NULL DEFAULT '',
  response TEXT NOT NULL DEFAULT '',
  linked_download_id TEXT REFERENCES free_download_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_requests_user_idx
  ON free_download_requests(user_id, created_at DESC);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_requests_status_idx
  ON free_download_requests(status, created_at DESC);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_slides (
  id TEXT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  description VARCHAR(600) NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  cta_label VARCHAR(80) NOT NULL DEFAULT 'Explore downloads',
  cta_url VARCHAR(500) NOT NULL DEFAULT '/downloads',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS free_download_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  smartlink_url TEXT NOT NULL DEFAULT '',
  ad_requirement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_url TEXT NOT NULL DEFAULT 'https://t.me/taskdrip',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--> statement-breakpoint

INSERT INTO free_download_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

--> statement-breakpoint

INSERT INTO free_download_categories (id, name, slug, description, sort_order)
VALUES
  ('fd-cat-files', 'Files & Documents', 'files-documents', 'Useful documents, templates, guides and learning resources.', 1),
  ('fd-cat-ai', 'AI Tools', 'ai-tools', 'AI applications and tools for work and creativity.', 2),
  ('fd-cat-software', 'Software', 'software', 'Software and applications shared with permission.', 3),
  ('fd-cat-movies', 'Movies', 'movies', 'Legally distributable films and public-domain cinema.', 4),
  ('fd-cat-videos', 'Videos', 'videos', 'Video resources, tutorials and creator-authorized media.', 5),
  ('fd-cat-podcasts', 'Podcasts', 'podcasts', 'Podcast episodes and audio series.', 6),
  ('fd-cat-music', 'Music', 'music', 'Licensed, public-domain and creator-authorized music.', 7),
  ('fd-cat-sermons', 'Sermons', 'sermons', 'Sermons and ministry resources shared with permission.', 8)
ON CONFLICT (slug) DO NOTHING;
