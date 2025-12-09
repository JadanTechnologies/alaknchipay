-- ============================================
-- COMPLETE DATABASE FIX - RUN THIS ONCE
-- Fixes: User branches, Dynamic roles, Product visibility
-- ============================================

-- ============================================
-- PART 1: FIX USER BRANCH ASSIGNMENT
-- ============================================

-- 1.1: Clear invalid store_id values (skip if already UUID)
DO $$
BEGIN
  -- Only run if store_id is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'store_id' 
    AND data_type = 'text'
  ) THEN
    UPDATE public.profiles 
    SET store_id = NULL 
    WHERE store_id IS NOT NULL 
      AND store_id NOT IN (SELECT id::text FROM public.branches);
    RAISE NOTICE 'Cleared invalid TEXT store_id values';
  ELSE
    RAISE NOTICE 'store_id is already UUID, skipping cleanup';
  END IF;
END $$;

-- 1.2: Convert store_id from TEXT to UUID (if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'store_id' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.profiles 
    ALTER COLUMN store_id TYPE uuid USING 
      CASE 
        WHEN store_id IS NULL THEN NULL
        WHEN store_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN store_id::uuid
        ELSE NULL
      END;
    RAISE NOTICE 'Converted profiles.store_id from TEXT to UUID';
  ELSE
    RAISE NOTICE 'profiles.store_id is already UUID type';
  END IF;
END $$;

-- 1.3: Add foreign key constraint
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS fk_profiles_branch;

ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_branch
FOREIGN KEY (store_id) REFERENCES public.branches(id)
ON DELETE SET NULL;

-- ============================================
-- PART 2: FIX DYNAMIC ROLES
-- ============================================

-- 2.1: Remove hardcoded role check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2.2: Optionally add a foreign key to roles table (recommended)
-- Uncomment if you want to enforce that roles must exist in roles table
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT fk_profiles_role
-- FOREIGN KEY (role) REFERENCES public.roles(name)
-- ON DELETE RESTRICT;

-- ============================================
-- PART 3: FIX PRODUCT VISIBILITY (RLS)
-- ============================================

-- 3.1: Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3.2: Drop existing policies
DROP POLICY IF EXISTS "Users can view products" ON public.products;
DROP POLICY IF EXISTS "Users can manage products" ON public.products;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Users can view products based on branch" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- 3.3: Create SELECT policy for products
CREATE POLICY "Users can view products based on branch"
ON public.products
FOR SELECT
TO authenticated
USING (
  -- Super admins see everything
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  OR
  -- Global products (no branch assigned)
  store_id IS NULL
  OR
  -- Products from user's branch
  store_id = (SELECT store_id FROM public.profiles WHERE id = auth.uid())
);

-- 3.4: Create INSERT/UPDATE/DELETE policy for admins
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER')
);

-- ============================================
-- PART 4: FIX PRODUCT store_id TYPE
-- ============================================

-- 4.1: Check if products.store_id is TEXT or UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'store_id' 
    AND data_type = 'text'
  ) THEN
    -- Convert products.store_id from TEXT to UUID
    ALTER TABLE public.products 
    ALTER COLUMN store_id TYPE uuid USING 
      CASE 
        WHEN store_id IS NULL THEN NULL
        WHEN store_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN store_id::uuid
        ELSE NULL
      END;
    
    RAISE NOTICE 'Converted products.store_id from TEXT to UUID';
  ELSE
    RAISE NOTICE 'products.store_id is already UUID type';
  END IF;
END $$;

-- 4.2: Add foreign key for products.store_id
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS fk_products_branch;

ALTER TABLE public.products
ADD CONSTRAINT fk_products_branch
FOREIGN KEY (store_id) REFERENCES public.branches(id)
ON DELETE SET NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check 1: Verify profiles.store_id is UUID
SELECT 
  'profiles.store_id type' as check_name,
  data_type as result
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'store_id';

-- Check 2: Verify role constraint is removed
SELECT 
  'role constraint removed' as check_name,
  CASE WHEN COUNT(*) = 0 THEN 'YES' ELSE 'NO - Still exists!' END as result
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname = 'profiles_role_check';

-- Check 3: Verify RLS is enabled on products
SELECT 
  'products RLS enabled' as check_name,
  CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END as result
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products';

-- Check 4: List all RLS policies on products
SELECT 
  'Product RLS policies' as check_name,
  COUNT(*) || ' policies created' as result
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'products';

-- Check 5: Show user-branch assignments
SELECT 
  p.name as user_name,
  p.role,
  b.name as branch_name,
  CASE 
    WHEN p.store_id IS NULL THEN 'Global (no branch)'
    WHEN b.id IS NOT NULL THEN 'Valid branch'
    ELSE 'ERROR: Invalid branch ID'
  END as status
FROM public.profiles p
LEFT JOIN public.branches b ON p.store_id = b.id
ORDER BY p.created_at DESC;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '1. User branches: store_id is now UUID';
  RAISE NOTICE '2. Dynamic roles: constraint removed';
  RAISE NOTICE '3. Product visibility: RLS policies created';
  RAISE NOTICE '4. Product branches: store_id is now UUID';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '- Refresh your app';
  RAISE NOTICE '- Test user branch assignment';
  RAISE NOTICE '- Test role changes';
  RAISE NOTICE '- Login as branch user to see products';
END $$;
