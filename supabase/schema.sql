-- ============================================================
-- WiseWallet — Supabase Schema
-- Generated from client types + API endpoints
-- ============================================================

-- ─── DROP (clean slate) ─────────────────────────────────────

DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.savings_items CASCADE;
DROP TABLE IF EXISTS public.dues CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.transaction_type CASCADE;
DROP TYPE IF EXISTS public.due_frequency CASCADE;
DROP TYPE IF EXISTS public.payment_method_type CASCADE;

-- ─── ENUMS ──────────────────────────────────────────────────

CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
CREATE TYPE public.due_frequency AS ENUM ('once', 'weekly', 'biweekly', 'monthly', 'yearly');
CREATE TYPE public.payment_method_type AS ENUM ('cash', 'card', 'bank', 'e_wallet', 'other');

-- ─── TABLES ─────────────────────────────────────────────────

-- 1. Users (auth accounts)
CREATE TABLE public.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    passcode    TEXT NOT NULL,          -- SHA-256 hash
    device_id   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_name ON public.users (lower(name));

-- 2. User Profiles
CREATE TABLE public.user_profiles (
    user_id          UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name             TEXT NOT NULL DEFAULT '',
    is_first_run     BOOLEAN NOT NULL DEFAULT true,
    initial_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_dark_mode     BOOLEAN NOT NULL DEFAULT false,
    language         TEXT NOT NULL DEFAULT 'en',
    currency         TEXT NOT NULL DEFAULT 'PHP',
    decimal_points   INTEGER NOT NULL DEFAULT 2,
    auto_backup      BOOLEAN NOT NULL DEFAULT true,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Categories
CREATE TABLE public.categories (
    id         UUID PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       public.transaction_type NOT NULL,
    is_global  BOOLEAN NOT NULL DEFAULT false,
    updated_at BIGINT NOT NULL DEFAULT 0           -- epoch millis
);

CREATE INDEX idx_categories_user ON public.categories (user_id);

-- 4. Transactions
CREATE TABLE public.transactions (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title           TEXT,
    amount          NUMERIC(12,2) NOT NULL,
    category        JSONB,                          -- embedded Category object
    date            TEXT NOT NULL,                   -- ISO date string
    note            TEXT,
    receipt_url     TEXT,
    type            public.transaction_type NOT NULL,
    payment_method  TEXT,
    establishment   TEXT,
    split_info      JSONB,                          -- { people, amountPerPerson, notes, participants }
    due_id          UUID,
    updated_at      BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_transactions_user ON public.transactions (user_id);
CREATE INDEX idx_transactions_date  ON public.transactions (user_id, date);

-- 5. Dues (bills / scheduled payments)
CREATE TABLE public.dues (
    id           UUID PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    amount       NUMERIC(12,2) NOT NULL,
    date         TEXT NOT NULL,
    frequency    public.due_frequency DEFAULT 'once',
    type         public.transaction_type NOT NULL,
    category_id  UUID,
    category_name TEXT,
    auto_process BOOLEAN NOT NULL DEFAULT false,
    completed    BOOLEAN NOT NULL DEFAULT false,
    updated_at   BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_dues_user ON public.dues (user_id);

-- 6. Savings Items (goals)
CREATE TABLE public.savings_items (
    id         UUID PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    balance    NUMERIC(12,2) NOT NULL DEFAULT 0,
    icon       TEXT,
    color      TEXT,
    updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_savings_items_user ON public.savings_items (user_id);

-- 7. Payment Methods
CREATE TABLE public.payment_methods (
    id      UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    type    public.payment_method_type NOT NULL,
    icon    TEXT
);

CREATE INDEX idx_payment_methods_user ON public.payment_methods (user_id);

-- 8. System Settings (single-row, server-controlled)
CREATE TABLE public.system_settings (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── ROW-LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings  ENABLE ROW LEVEL SECURITY;

-- Users table: service-role only (auth handled by backend)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies: users can only read/write their own rows
CREATE POLICY "Users can manage own profile"
    ON public.user_profiles FOR ALL
    USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can manage own categories"
    ON public.categories FOR ALL
    USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can manage own transactions"
    ON public.transactions FOR ALL
    USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can manage own dues"
    ON public.dues FOR ALL
    USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can manage own savings"
    ON public.savings_items FOR ALL
    USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can manage own payment methods"
    ON public.payment_methods FOR ALL
    USING (user_id = auth.uid()::uuid);

-- System settings: readable by all authenticated users
CREATE POLICY "Authenticated users can read system settings"
    ON public.system_settings FOR SELECT
    USING (auth.role() = 'authenticated');

-- ─── SEED: Default Categories ───────────────────────────────

-- These are inserted per-user by the backend on registration.
-- Below are the global defaults matching utils/db.ts GLOBAL_CATEGORIES.

-- Expense categories
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11' — Food
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12' — Bills
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13' — Transport
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14' — Shopping
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15' — Entertainment
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18' — Others (expense)
--
-- Income categories
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16' — Salary
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17' — Freelance
-- 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19' — Others (income)

-- ─── SEED: System Settings ──────────────────────────────────

INSERT INTO public.system_settings (key, value) VALUES
    ('reset_epoch', '0')
ON CONFLICT (key) DO NOTHING;

-- ─── STORAGE BUCKET (run via Supabase dashboard or CLI) ─────
-- supabase storage create-bucket receipts --public
-- Or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- ─── DONE ───────────────────────────────────────────────────
