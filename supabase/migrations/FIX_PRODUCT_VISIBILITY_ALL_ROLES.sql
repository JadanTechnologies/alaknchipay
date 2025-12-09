-- ============================================
-- FIX PRODUCT VISIBILITY FOR ALL ROLES
-- Cashiers can see products, Super Admin can add anywhere
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view products based on branch" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- POLICY 1: SELECT - Who can VIEW products
CREATE POLICY "Users can view products based on branch"
ON public.products
FOR SELECT
TO authenticated
USING (
  -- Super admins see ALL products
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Global products (no branch) - everyone can see
  store_id IS NULL
  OR
  -- Users see products from THEIR branch (includes CASHIER, ADMIN, BRANCH_MANAGER)
  store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())
);

-- POLICY 2: INSERT - Who can ADD products
CREATE POLICY "Authorized users can add products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins can add products to ANY branch
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Branch managers can add products to THEIR branch or global
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER')
    AND (
      store_id IS NULL  -- Can create global products
      OR store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())  -- Or their branch
    )
  )
);

-- POLICY 3: UPDATE - Who can EDIT products
CREATE POLICY "Authorized users can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  -- Super admins can edit ALL products
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Branch managers can edit THEIR branch products
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER')
    AND (
      store_id IS NULL
      OR store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    )
  )
)
WITH CHECK (
  -- Same rules for the updated data
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER')
    AND (
      store_id IS NULL
      OR store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- POLICY 4: DELETE - Who can DELETE products
CREATE POLICY "Authorized users can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  -- Super admins can delete ALL products
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Branch managers can delete THEIR branch products
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER')
    AND (
      store_id IS NULL
      OR store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all policies
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Who can VIEW products'
    WHEN cmd = 'INSERT' THEN 'Who can ADD products'
    WHEN cmd = 'UPDATE' THEN 'Who can EDIT products'
    WHEN cmd = 'DELETE' THEN 'Who can DELETE products'
  END as description
FROM pg_policies
WHERE tablename = 'products'
ORDER BY cmd;

-- Test queries (replace USER_ID with actual IDs)
-- As Super Admin - should see ALL products:
-- SELECT * FROM products;

-- As Cashier - should see branch products + global:
-- SELECT * FROM products 
-- WHERE store_id IS NULL 
--    OR store_id = (SELECT store_id FROM profiles WHERE id = 'CASHIER_USER_ID');
