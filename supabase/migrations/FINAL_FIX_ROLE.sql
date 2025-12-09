-- ============================================
-- FINAL FIX - Remove role constraint NOW
-- ============================================

-- Step 1: Remove the constraint
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Step 2: Verify it's gone (should return 0 rows)
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND conname = 'profiles_role_check';

-- Step 3: Success message
SELECT '✅ Role constraint removed! You can now use any role including BRANCH_MANAGER' as status;
