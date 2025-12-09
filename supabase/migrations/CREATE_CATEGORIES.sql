-- ============================================
-- COMPLETE FIX FOR PRODUCT AND USER CREATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create default categories
INSERT INTO public.categories (name, store_id) VALUES
('General', NULL),
('Electronics', NULL),
('Food & Beverages', NULL),
('Clothing', NULL),
('Health & Beauty', NULL)
ON CONFLICT DO NOTHING;

-- 2. Verify categories created
SELECT 'Categories Created:' as status, COUNT(*) as count FROM public.categories;
SELECT id, name FROM public.categories ORDER BY name;

-- 3. Update products table to allow NULL category_id (optional)
ALTER TABLE public.products ALTER COLUMN category_id DROP NOT NULL;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT * FROM public.categories;
