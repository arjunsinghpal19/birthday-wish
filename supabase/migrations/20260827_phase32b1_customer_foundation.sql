-- ============================================================================
-- PHASE 32B-1: REVISED CUSTOMER DATABASE & RLS FOUNDATION MIGRATION
-- Atomic, Idempotent, and Preservation-First SQL Script
-- Fully Reconciles Live Permissive Policies to Guarantee Strict Tenant Isolation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE public.customers TABLE (1-to-1 with auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  account_status TEXT NOT NULL DEFAULT 'active',
  plan_tier TEXT NOT NULL DEFAULT 'free',
  storage_quota_bytes BIGINT DEFAULT 26214400, -- 25 MB Free Tier Default
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ----------------------------------------------------------------------------
-- 2. ADD owner_id FOREIGN KEY TO public.wishes (NULLABLE FOR LEGACY PRESERVATION)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'wishes' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.wishes 
    ADD COLUMN owner_id UUID NULL REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Index for fast customer wish filtering
CREATE INDEX IF NOT EXISTS idx_wishes_owner_id ON public.wishes(owner_id);

-- ----------------------------------------------------------------------------
-- 3. CREATE AUTOMATIC PROFILE PROVISIONING TRIGGER ON auth.users SIGNUP
-- Hardened with SECURITY DEFINER and fixed search_path
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (
    id,
    email,
    full_name,
    account_status,
    plan_tier,
    storage_quota_bytes,
    created_at,
    last_active_at,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'active',
    'free',
    26214400,
    now(),
    now(),
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_active_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer();

-- ----------------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY ON public.customers (STRICT TENANT ISOLATION)
-- ----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own profile" ON public.customers;
DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
CREATE POLICY "customers_select_policy"
  ON public.customers FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Customers can update their own profile" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
CREATE POLICY "customers_update_policy"
  ON public.customers FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 5. RECONCILE ROW-LEVEL SECURITY ON public.wishes
-- Replaces conflicting broad permissive live policies with airtight tenant-aware policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;

-- Clean up existing legacy / broad permissive policies
DROP POLICY IF EXISTS "Allow public read access to wishes" ON public.wishes;
DROP POLICY IF EXISTS "Public can view wishes by ID" ON public.wishes;
DROP POLICY IF EXISTS "wishes_select_policy" ON public.wishes;

-- 5A. SELECT Policy: Public unlisted celebration card model (anyone with UUID can view card)
CREATE POLICY "wishes_select_policy"
  ON public.wishes FOR SELECT
  USING (true);

-- Clean up existing legacy INSERT policies
DROP POLICY IF EXISTS "Allow public insert access to wishes" ON public.wishes;
DROP POLICY IF EXISTS "Customer and anonymous insert wishes" ON public.wishes;
DROP POLICY IF EXISTS "wishes_insert_policy" ON public.wishes;

-- 5B. INSERT Policy: Enforces customer ownership binding while preserving anonymous creation
CREATE POLICY "wishes_insert_policy"
  ON public.wishes FOR INSERT
  WITH CHECK (
    -- Authenticated Customer: MUST set owner_id to their own auth.uid() (cannot spoof or create unowned)
    (auth.uid() IS NOT NULL AND owner_id = auth.uid())
    OR
    -- Anonymous Visitor (Quick Editor): Can insert ONLY when owner_id IS NULL
    (auth.uid() IS NULL AND owner_id IS NULL)
  );

-- Clean up existing legacy UPDATE policies
DROP POLICY IF EXISTS "Allow update for public wishes" ON public.wishes;
DROP POLICY IF EXISTS "Allow system config update only" ON public.wishes;
DROP POLICY IF EXISTS "Customer can update own wishes" ON public.wishes;
DROP POLICY IF EXISTS "wishes_update_policy" ON public.wishes;

-- 5C. UPDATE Policy: Customer can update ONLY their own wishes; Anonymous can update unowned wishes; System config protected
CREATE POLICY "wishes_update_policy"
  ON public.wishes FOR UPDATE
  USING (
    -- Authenticated Customer: Can update ONLY rows they own
    (auth.uid() IS NOT NULL AND owner_id = auth.uid())
    OR
    -- Anonymous User: Can update ONLY unowned legacy wishes (excluding protected system config row)
    (auth.uid() IS NULL AND owner_id IS NULL AND id <> '00000000-0000-0000-0000-000000000001'::uuid)
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND owner_id = auth.uid())
    OR
    (auth.uid() IS NULL AND owner_id IS NULL AND id <> '00000000-0000-0000-0000-000000000001'::uuid)
  );

-- Clean up existing legacy DELETE policies
DROP POLICY IF EXISTS "Customer can delete own wishes" ON public.wishes;
DROP POLICY IF EXISTS "wishes_delete_policy" ON public.wishes;

-- 5D. DELETE Policy: Customer can delete ONLY their own wishes; Anon client delete is blocked (Admin API uses service role)
CREATE POLICY "wishes_delete_policy"
  ON public.wishes FOR DELETE
  USING (auth.uid() IS NOT NULL AND owner_id = auth.uid());
