CREATE SEQUENCE IF NOT EXISTS free_download_code_seq;

--> statement-breakpoint

ALTER TABLE free_download_items
  ADD COLUMN IF NOT EXISTS download_code VARCHAR(32);

--> statement-breakpoint

UPDATE free_download_items
SET download_code = 'TFD' || LPAD(nextval('free_download_code_seq')::text, 2, '0')
WHERE download_code IS NULL;

--> statement-breakpoint

ALTER TABLE free_download_items
  ALTER COLUMN download_code SET DEFAULT ('TFD' || LPAD(nextval('free_download_code_seq')::text, 2, '0'));

--> statement-breakpoint

ALTER TABLE free_download_items
  ALTER COLUMN download_code SET NOT NULL;

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS free_download_items_download_code_unique
  ON free_download_items(download_code);
