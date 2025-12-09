-- ============================================
-- FINAL CHECK - Verify RLS and Product Visibility
-- ============================================

-- 1. Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';

-- 2. List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY cmd;

-- 3. Test SELECT as different roles
-- This simulates what each role would see

-- As SUPER_ADMIN (should see ALL 3 products)
-- Uncomment and replace USER_ID:
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claims" = '{"sub": "SUPER_ADMIN_USER_ID", "role": "authenticated"}';
-- SELECT COUNT(*) as super_admin_sees FROM products;

-- As BRANCH_MANAGER of ALKANCHI MAIN (should see 2 products + global)
-- SELECT COUNT(*) as manager_sees FROM products 
-- WHERE store_id IS NULL 
--    OR store_id = 'BRANCH_UUID_HERE';

-- As CASHIER of ALKANCHI MAIN (should see 2 products + global)  
-- SELECT COUNT(*) as cashier_sees FROM products
-- WHERE store_id IS NULL
--    OR store_id = 'BRANCH_UUID_HERE';

-- 4. Show all products with their visibility
SELECT 
  p.name,
  p.sku,
  CASE 
    WHEN p.store_id IS NULL THEN 'VISIBLE TO ALL'
    ELSE 'VISIBLE TO: ' || b.name
  END as visibility,
  p.store_id
FROM products p
LEFT JOIN branches b ON p.store_id = b.id
ORDER BY p.created_at DESC;
