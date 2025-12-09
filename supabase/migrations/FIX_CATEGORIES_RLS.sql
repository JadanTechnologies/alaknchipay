-- ============================================
-- FIX CATEGORIES RLS - Allow all users to read
-- ============================================

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.categories;
DROP POLICY IF EXISTS "Users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- POLICY 1: Everyone can READ categories
CREATE POLICY "Everyone can read categories"
ON public.categories
FOR SELECT
TO authenticated
USING (true);  -- All authenticated users can see all categories

-- POLICY 2: Only admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER')
);

-- Verify
SELECT 
  '✅ Categories RLS Fixed' as status,
  'All users can now read categories' as note;

-- Show policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'categories';
