-- ============================================
-- FIX PRODUCT VISIBILITY FOR BRANCH USERS
-- Add RLS policies so users only see their branch's products
-- ============================================

-- 1. Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies
DROP POLICY IF EXISTS "Users can view products" ON public.products;
DROP POLICY IF EXISTS "Users can manage products" ON public.products;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.products;

-- 3. Create policy for viewing products
-- Users can see:
-- - Products with no store_id (global products)
-- - Products assigned to their branch
-- - Super admins can see all products
CREATE POLICY "Users can view products based on branch"
ON public.products
FOR SELECT
TO authenticated
USING (
  -- Super admins see everything
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Users see global products (no store_id)
  store_id IS NULL
  OR
  -- Users see products from their branch
  store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. Create policy for managing products
-- Only super admins and branch managers can manage products
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
);

-- 5. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';

-- 6. Check policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'products';

-- 7. Test query as a branch user (replace USER_ID with actual user ID)
-- This simulates what a branch user would see
-- SELECT * FROM public.products 
-- WHERE store_id IS NULL 
--    OR store_id = (SELECT store_id FROM public.profiles WHERE id = 'USER_ID_HERE');
