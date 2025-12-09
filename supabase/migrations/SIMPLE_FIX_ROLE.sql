-- ============================================
-- SIMPLE FIX - Remove role constraint
-- ============================================

-- Check if constraint exists
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND conname LIKE '%role%';

-- Remove the constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Verify it's gone
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND conname LIKE '%role%';

-- Test: Try to update a user to BRANCH_MANAGER
-- (Replace USER_ID with actual ID)
-- UPDATE public.profiles 
-- SET role = 'BRANCH_MANAGER' 
-- WHERE id = 'USER_ID_HERE';
