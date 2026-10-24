CREATE TABLE IF NOT EXISTS citygate_loan_applications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar NOT NULL,
  email varchar NOT NULL,
  phone varchar NOT NULL,
  date_of_birth varchar NOT NULL,
  state varchar NOT NULL,
  loan_type varchar NOT NULL,
  employment_status varchar NOT NULL,
  business_type text,
  product_sold text,
  six_month_turnover varchar,
  monthly_net_income varchar,
  asset_amount varchar,
  requested_amount varchar,
  tenure_months integer NOT NULL,
  estimate_naira varchar NOT NULL,
  estimate_basis text NOT NULL,
  consent boolean NOT NULL DEFAULT false,
  marketing_consent boolean NOT NULL DEFAULT false,
  segment varchar NOT NULL DEFAULT 'citygate-global',
  source varchar NOT NULL DEFAULT '/citygate-global-loans',
  status varchar NOT NULL DEFAULT 'new',
  email_notification_status varchar NOT NULL DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS citygate_loan_applications_segment_created_idx
  ON citygate_loan_applications (segment, created_at DESC);
CREATE INDEX IF NOT EXISTS citygate_loan_applications_email_idx
  ON citygate_loan_applications (email);
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS segment varchar DEFAULT 'general';
