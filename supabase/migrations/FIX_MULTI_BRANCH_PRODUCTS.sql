-- ============================================
-- FIX PRODUCT CREATION FOR MULTI-BRANCH INVENTORY
-- Allow same products across different branches
-- ============================================

-- PART 1: Fix store_id type (should be UUID not TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'store_id' 
    AND data_type = 'text'
  ) THEN
    -- Convert to UUID
    ALTER TABLE public.products 
    ALTER COLUMN store_id TYPE uuid USING 
      CASE 
        WHEN store_id IS NULL THEN NULL
        WHEN store_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN store_id::uuid
        ELSE NULL
      END;
    RAISE NOTICE '✅ Converted products.store_id to UUID';
  ELSE
    RAISE NOTICE '✅ products.store_id is already UUID';
  END IF;
END $$;

-- PART 2: Remove UNIQUE constraint on SKU
-- This allows same SKU across different branches
ALTER TABLE public.products 
DROP CONSTRAINT IF EXISTS products_sku_key;

-- PART 3: Add composite unique constraint
-- SKU must be unique WITHIN a branch, but can repeat across branches
DROP INDEX IF EXISTS products_sku_store_unique;
CREATE UNIQUE INDEX products_sku_store_unique 
ON public.products (sku, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- PART 4: Ensure RLS policies allow product creation
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  -- Super admins can manage all products
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Branch managers can manage their branch's products
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER')
    AND (
      store_id IS NULL  -- Can create global products
      OR store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())  -- Or their branch products
    )
  )
)
WITH CHECK (
  -- Super admins can create anywhere
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Branch managers can only create for their branch
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ADMIN', 'BRANCH_MANAGER')
    AND (
      store_id IS NULL  -- Can create global products
      OR store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())  -- Or their branch products
    )
  )
);

-- PART 5: Verification
SELECT 
  '✅ Product Creation Fixed' as status,
  'SKU can now be duplicated across branches' as note;

-- Show current constraints
SELECT 
  conname as constraint_name,
  contype as type
FROM pg_constraint
WHERE conrelid = 'public.products'::regclass;

-- Show RLS policies
SELECT 
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'products';
