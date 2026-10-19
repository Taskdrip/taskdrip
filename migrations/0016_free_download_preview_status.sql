ALTER TABLE free_download_items
  DROP CONSTRAINT IF EXISTS free_download_items_publication_status_check;

--> statement-breakpoint

ALTER TABLE free_download_items
  ADD CONSTRAINT free_download_items_publication_status_check
  CHECK (publication_status IN ('draft', 'preview', 'published'));

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_requests_category_status_idx
  ON free_download_requests(category_name, status, created_at DESC);

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS free_download_events_user_download_type_idx
  ON free_download_events(user_id, download_id, event_type, created_at DESC);
