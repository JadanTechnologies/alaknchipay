-- ============================================
-- DEBUG USER BRANCH ASSIGNMENT
-- Run this to check what's actually in the database
-- ============================================

-- 1. Check current user data
SELECT 
    id,
    name,
    username,
    role,
    store_id,
    active
FROM public.profiles
ORDER BY created_at DESC;

-- 2. Check branches
SELECT id, name FROM public.branches;

-- 3. Check if store_id matches any branch IDs
SELECT 
    p.name as user_name,
    p.store_id,
    b.name as branch_name,
    CASE 
        WHEN p.store_id IS NULL THEN 'No branch assigned'
        WHEN b.id IS NULL THEN 'Invalid branch ID'
        ELSE 'Valid branch'
    END as status
FROM public.profiles p
LEFT JOIN public.branches b ON p.store_id = b.id
ORDER BY p.created_at DESC;

-- 4. Try manually updating a user's branch (replace with actual IDs)
-- First, get a user ID and branch ID:
-- SELECT id, name FROM public.profiles LIMIT 1;
-- SELECT id, name FROM public.branches LIMIT 1;

-- Then update (UNCOMMENT and replace IDs):
-- UPDATE public.profiles 
-- SET store_id = 'BRANCH_ID_HERE'
-- WHERE id = 'USER_ID_HERE'
-- RETURNING *;
