-- ============================================
-- FIX DATA PERSISTENCE ISSUES
-- Run this to ensure data can be saved
-- ============================================

-- 1. Check and fix RLS policies for branches
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.branches;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.branches;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.branches;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.branches;

CREATE POLICY "Enable all for authenticated users" ON public.branches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Check and fix RLS policies for products
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;

CREATE POLICY "Enable all for authenticated users" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Check and fix RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public write" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Enable all for authenticated users" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Verify tables have correct structure
-- Check branches table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'branches'
ORDER BY ordinal_position;

-- Check products table  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- Check profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. Test insert to verify it works
-- Test branch insert
INSERT INTO public.branches (name, address, phone)
VALUES ('Test Branch', '123 Test St', '+1234567890')
RETURNING *;

-- Check if it was inserted
SELECT * FROM public.branches;

-- Clean up test data
DELETE FROM public.branches WHERE name = 'Test Branch';

-- ============================================
-- VERIFICATION COMPLETE
-- If test insert worked, the issue is in frontend code
-- If test insert failed, there's a database permission issue
-- ============================================
