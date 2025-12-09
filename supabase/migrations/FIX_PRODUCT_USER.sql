-- ============================================
-- FIX PRODUCT AND USER CREATION ISSUES
-- ============================================

-- 1. Create default "General" category if it doesn't exist
INSERT INTO public.categories (name, store_id)
VALUES ('General', NULL)
ON CONFLICT DO NOTHING;

-- Get the General category ID
DO $$
DECLARE
  general_cat_id uuid;
BEGIN
  SELECT id INTO general_cat_id FROM public.categories WHERE name = 'General' LIMIT 1;
  RAISE NOTICE 'General category ID: %', general_cat_id;
END $$;

-- 2. Verify category exists
SELECT * FROM public.categories WHERE name = 'General';

-- ============================================
-- INSTRUCTIONS FOR USER CREATION
-- ============================================

-- User creation fails because we're using admin.createUser which requires service_role key
-- Solution: Use regular signUp instead (already implemented in code)

-- To test user creation manually in Supabase:
-- 1. Go to Authentication → Users
-- 2. Click "Add User"
-- 3. Enter email and password
-- 4. User will be created automatically

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Categories:' as info, COUNT(*) as count FROM public.categories;
SELECT * FROM public.categories;
