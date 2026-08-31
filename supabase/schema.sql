-- ============================================================
-- WiseWallet — Supabase Schema
-- Matches backend wallet-api repository .from() table names
-- ============================================================

-- ─── DROP (clean slate) ─────────────────────────────────────

-- Legacy tables (superseded)
DROP TABLE IF EXISTS public.savingsGoals CASCADE;
DROP TABLE IF EXISTS public.allocations CASCADE;

-- Dead entities (removed from codebase)
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.agendas CASCADE;

-- snake_case duplicates (backend uses camelCase)
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.savings_items CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- Active tables (recreated below)
DROP TABLE IF EXISTS public.systemSettings CASCADE;
DROP TABLE IF EXISTS public.paymentMethods CASCADE;
DROP TABLE IF EXISTS public.savingsItems CASCADE;
DROP TABLE IF EXISTS public.dues CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ─── TABLES ─────────────────────────────────────────────────

-- 1. Users (auth accounts)
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "passcode" TEXT NOT NULL,
  "currentSessionId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles
CREATE TABLE "profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT,
  "isFirstRun" BOOLEAN DEFAULT TRUE,
  "initialBalance" NUMERIC DEFAULT 0,
  "balance" NUMERIC DEFAULT 0,
  "isDarkMode" BOOLEAN DEFAULT FALSE,
  "language" TEXT DEFAULT 'en',
  "currency" TEXT DEFAULT 'PHP',
  "decimalPoints" INTEGER DEFAULT 2,
  "autoBackup" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories
CREATE TABLE "categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('income', 'expense')),
  "isGlobal" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions
CREATE TABLE "transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" NUMERIC NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "note" TEXT,
  "type" TEXT NOT NULL CHECK ("type" IN ('income', 'expense')),
  "categoryId" UUID REFERENCES "categories"("id"),
  "paymentMethod" TEXT,
  "establishment" TEXT,
  "receiptUrl" TEXT,
  "splitInfo" JSONB,
  "dueId" UUID REFERENCES "dues"("id"),
  "savingsItemId" UUID REFERENCES "savingsItems"("id"),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Dues (replaces agendas)
CREATE TABLE "dues" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "amount" NUMERIC NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "frequency" TEXT CHECK ("frequency" IN ('once', 'weekly', 'biweekly', 'monthly', 'yearly')),
  "type" TEXT NOT NULL DEFAULT 'expense' CHECK ("type" IN ('income', 'expense')),
  "categoryId" UUID REFERENCES "categories"("id"),
  "autoProcess" BOOLEAN DEFAULT FALSE,
  "completed" BOOLEAN DEFAULT FALSE,
  "savingsItemId" UUID REFERENCES "savingsItems"("id"),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Savings Items (replaces savingsGoals)
CREATE TABLE "savingsItems" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL,
  "balance" NUMERIC DEFAULT 0,
  "icon" TEXT,
  "color" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payment Methods (lookup)
CREATE TABLE "paymentMethods" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "icon" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. System Settings
CREATE TABLE "systemSettings" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "reset_epoch" INTEGER DEFAULT 1,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SEED DATA ──────────────────────────────────────────────

INSERT INTO "paymentMethods" ("id", "name", "type", "icon") VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cash', 'cash', 'cash'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'BPI Debit', 'bank', 'bank'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'UnionBank', 'bank', 'bank'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'GCash', 'e_wallet', 'wallet'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Maya', 'e_wallet', 'wallet'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Visa Card', 'card', 'credit-card')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "categories" ("id", "userId", "name", "type", "isGlobal") VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', NULL, 'Food', 'expense', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', NULL, 'Bills', 'expense', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', NULL, 'Transport', 'expense', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', NULL, 'Shopping', 'expense', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', NULL, 'Entertainment', 'expense', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', NULL, 'Salary', 'income', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', NULL, 'Freelance', 'income', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18', NULL, 'Others', 'expense', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19', NULL, 'Others', 'income', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "systemSettings" ("id", "reset_epoch") VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── ROW-LEVEL SECURITY ─────────────────────────────────────

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savingsItems" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "paymentMethods" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own data" ON "users"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles are private" ON "profiles"
  FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Categories visibility" ON "categories"
  FOR SELECT USING (auth.uid() = "userId" OR "isGlobal" = true);

CREATE POLICY "Categories management" ON "categories"
  FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Transactions are private" ON "transactions"
  FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Dues are private" ON "dues"
  FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Savings items are private" ON "savingsItems"
  FOR ALL USING (auth.uid() = "userId");

CREATE POLICY "Payment methods are private" ON "paymentMethods"
  FOR ALL USING (auth.uid() = "userId" OR "userId" IS NULL);

-- System Settings: RLS disabled (publicly readable)
ALTER TABLE "systemSettings" DISABLE ROW LEVEL SECURITY;

-- ─── STORAGE ────────────────────────────────────────────────

DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('receipts', 'receipts', false)
    ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Storage - Individual Access" ON storage.objects;
DROP POLICY IF EXISTS "Storage - Individual Upload" ON storage.objects;
DROP POLICY IF EXISTS "Storage - Individual Deletion" ON storage.objects;

CREATE POLICY "Storage - Individual Access" ON storage.objects
FOR SELECT USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Storage - Individual Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Storage - Individual Deletion" ON storage.objects
FOR DELETE USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ─── DONE ───────────────────────────────────────────────────
