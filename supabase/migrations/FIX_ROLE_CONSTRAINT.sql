-- ============================================
-- FIX ROLE CHECK CONSTRAINT
-- Remove hardcoded role constraint to allow dynamic roles
-- ============================================

-- 1. Drop the old check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Verify constraint is removed
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
  AND conname LIKE '%role%';

-- 3. Now you can use any role value from the roles table
-- Test update (replace with actual user ID and role name)
-- UPDATE public.profiles 
-- SET role = 'BRANCH_MANAGER'  -- or any role from roles table
-- WHERE id = 'USER_ID_HERE';

-- 4. Verify the change
SELECT id, name, role FROM public.profiles;
