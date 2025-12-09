-- ============================================
-- FIX USER BRANCH TYPE MISMATCH
-- CRITICAL: store_id is TEXT but should be UUID
-- ============================================

-- 1. First, clear any invalid store_id values
UPDATE public.profiles 
SET store_id = NULL 
WHERE store_id IS NOT NULL 
  AND store_id NOT IN (SELECT id::text FROM public.branches);

-- 2. Change store_id from TEXT to UUID
ALTER TABLE public.profiles 
ALTER COLUMN store_id TYPE uuid USING store_id::uuid;

-- 3. Add foreign key constraint
ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_branch
FOREIGN KEY (store_id) REFERENCES public.branches(id)
ON DELETE SET NULL;

-- 4. Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'store_id';

-- 5. Check current user-branch assignments
SELECT 
    p.name as user_name,
    p.store_id,
    b.name as branch_name
FROM public.profiles p
LEFT JOIN public.branches b ON p.store_id = b.id
ORDER BY p.created_at DESC;
