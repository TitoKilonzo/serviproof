CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SEQUENCE IF NOT EXISTS work_order_number_seq START 1001;

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  phone text,
  email text,
  address text,
  currency char(3) NOT NULL DEFAULT 'KES',
  timezone text NOT NULL DEFAULT 'Africa/Nairobi',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, slug)
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  billing_address text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','lead')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id)
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','admin','dispatcher','technician','customer')),
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email),
  UNIQUE (id, company_id),
  FOREIGN KEY (customer_id, company_id) REFERENCES customers(id, company_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  name text NOT NULL,
  site_code text,
  address text NOT NULL,
  county text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  access_notes text,
  contact_name text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  FOREIGN KEY (customer_id, company_id) REFERENCES customers(id, company_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  site_id uuid,
  title text NOT NULL,
  service_type text NOT NULL DEFAULT 'Pest control',
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly','fortnightly','monthly','quarterly','biannual','annual','custom')),
  interval_days integer,
  start_date date NOT NULL,
  end_date date,
  next_service_date date,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'KES',
  terms text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','expired','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  FOREIGN KEY (customer_id, company_id) REFERENCES customers(id, company_id) ON DELETE CASCADE,
  FOREIGN KEY (site_id, company_id) REFERENCES sites(id, company_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_id uuid NOT NULL,
  site_id uuid NOT NULL,
  contract_id uuid,
  assigned_to uuid,
  title text NOT NULL,
  service_type text NOT NULL DEFAULT 'Pest control',
  description text,
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  recurrence_date date,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','assigned','en_route','in_progress','completed','cancelled','needs_review')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  materials_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  technician_notes text,
  customer_signature text,
  customer_signed_at timestamptz,
  completion_latitude numeric(10,7),
  completion_longitude numeric(10,7),
  report_generated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number),
  UNIQUE (id, company_id),
  UNIQUE (company_id, contract_id, recurrence_date),
  FOREIGN KEY (customer_id, company_id) REFERENCES customers(id, company_id) ON DELETE RESTRICT,
  FOREIGN KEY (site_id, company_id) REFERENCES sites(id, company_id) ON DELETE RESTRICT,
  FOREIGN KEY (contract_id, company_id) REFERENCES contracts(id, company_id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_to, company_id) REFERENCES users(id, company_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by, company_id) REFERENCES users(id, company_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL,
  uploaded_by uuid,
  storage_key text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  FOREIGN KEY (work_order_id, company_id) REFERENCES work_orders(id, company_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by, company_id) REFERENCES users(id, company_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid NOT NULL,
  work_order_id uuid,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partially_paid','paid','overdue','void')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, invoice_number),
  UNIQUE (id, company_id),
  FOREIGN KEY (customer_id, company_id) REFERENCES customers(id, company_id) ON DELETE RESTRICT,
  FOREIGN KEY (work_order_id, company_id) REFERENCES work_orders(id, company_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id, company_id) REFERENCES invoices(id, company_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('mpesa','bank_transfer','cash','card','other')),
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  received_by uuid,
  FOREIGN KEY (invoice_id, company_id) REFERENCES invoices(id, company_id) ON DELETE RESTRICT,
  FOREIGN KEY (received_by, company_id) REFERENCES users(id, company_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, company_id) REFERENCES users(id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_customers_company_status ON customers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_sites_customer ON sites(company_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_due ON contracts(company_id, status, next_service_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_schedule ON work_orders(company_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(company_id, assigned_to, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders(company_id, customer_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(company_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_date ON audit_logs(company_id, created_at DESC);
