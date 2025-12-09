-- ============================================
-- COMPLETE DATABASE SETUP FOR ALKANCHIPAY
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: AUTO USER PROFILE CREATION
-- ============================================

-- Create function to auto-create profiles for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, role, active, store_id, expense_limit)
  VALUES (
    new.id,
    new.email,
    split_part(new.email, '@', 1),
    'CASHIER',
    true,
    null,
    0.00
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================
-- PART 2: DYNAMIC ROLES & PERMISSIONS SYSTEM
-- ============================================

-- Create Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  is_system_defined boolean DEFAULT false
);

-- Create Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  module text
);

-- Create Role-Permissions Join Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Enable Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.roles;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.permissions;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.role_permissions;
DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.roles;
DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.permissions;
DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.role_permissions;

-- Create RLS Policies
CREATE POLICY "Allow read access for authenticated users" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON public.roles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON public.permissions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON public.role_permissions FOR ALL TO authenticated USING (true);


-- ============================================
-- PART 3: INSERT DEFAULT DATA
-- ============================================

-- Insert Default Roles (if not exists)
INSERT INTO public.roles (name, description, is_system_defined) VALUES
('SUPER_ADMIN', 'Full system access', true),
('BRANCH_MANAGER', 'Manages a specific branch and its operations', true),
('CASHIER', 'Process transactions and view own history', true)
ON CONFLICT (name) DO NOTHING;

-- Insert Default Permissions (if not exists)
INSERT INTO public.permissions (name, description, module) VALUES
-- User Management
('view_users', 'View user list', 'users'),
('create_users', 'Create new users', 'users'),
('edit_users', 'Edit existing users', 'users'),
('delete_users', 'Delete users', 'users'),

-- Branch Management
('view_branches', 'View branch details', 'branches'),
('create_branches', 'Create new branches', 'branches'),
('edit_branches', 'Edit branch details', 'branches'),
('delete_branches', 'Delete branches', 'branches'),

-- Inventory
('view_inventory', 'View products and stock', 'inventory'),
('manage_inventory', 'Add, edit, delete products', 'inventory'),
('adjust_stock', 'Manually adjust stock levels', 'inventory'),

-- Finance
('view_global_sales', 'View sales data for all branches', 'finance'),
('view_branch_sales', 'View sales data for assigned branch', 'finance'),
('manage_expenses', 'Approve or reject expenses', 'finance'),

-- POS
('process_sales', 'Access POS to process sales', 'pos'),
('process_refunds', 'Process refunds', 'pos'),
('close_register', 'Close the daily register', 'pos'),

-- System
('manage_settings', 'Manage global system settings', 'system'),
('view_logs', 'View system activity logs', 'system'),
('manage_roles', 'Create and edit roles', 'system')
ON CONFLICT (name) DO NOTHING;


-- ============================================
-- PART 4: ASSIGN PERMISSIONS TO ROLES
-- ============================================

DO $$
DECLARE
  super_admin_id uuid;
  branch_manager_id uuid;
  cashier_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO super_admin_id FROM public.roles WHERE name = 'SUPER_ADMIN';
  SELECT id INTO branch_manager_id FROM public.roles WHERE name = 'BRANCH_MANAGER';
  SELECT id INTO cashier_id FROM public.roles WHERE name = 'CASHIER';

  -- Clear existing permissions (for clean re-run)
  DELETE FROM public.role_permissions WHERE role_id IN (super_admin_id, branch_manager_id, cashier_id);

  -- SUPER_ADMIN: All permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT super_admin_id, id FROM public.permissions;

  -- BRANCH_MANAGER: Specific permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT branch_manager_id, id FROM public.permissions WHERE name IN (
    'view_users', 'create_users', 'edit_users',
    'view_branches',
    'view_inventory', 'manage_inventory', 'adjust_stock',
    'view_branch_sales', 'manage_expenses',
    'process_sales', 'process_refunds', 'close_register'
  );

  -- CASHIER: POS permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT cashier_id, id FROM public.permissions WHERE name IN (
    'view_inventory',
    'process_sales', 'close_register'
  );
END $$;


-- ============================================
-- PART 5: FIX EXISTING USERS (OPTIONAL)
-- ============================================

-- Create profiles for any auth users that don't have one
INSERT INTO public.profiles (id, username, name, role, active, store_id, expense_limit)
SELECT 
  id, 
  email, 
  split_part(email, '@', 1), 
  'CASHIER', 
  true, 
  null,
  0.00
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check roles created
SELECT 'Roles Created:' as status, COUNT(*) as count FROM public.roles;
SELECT * FROM public.roles ORDER BY name;

-- Check permissions created
SELECT 'Permissions Created:' as status, COUNT(*) as count FROM public.permissions;
SELECT module, COUNT(*) as permission_count FROM public.permissions GROUP BY module ORDER BY module;

-- Check role-permission assignments
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permissions_count
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY r.name;

-- ============================================
-- SETUP COMPLETE! ✅
-- ============================================
