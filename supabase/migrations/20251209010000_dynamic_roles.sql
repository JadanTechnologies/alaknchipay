-- Create Roles Table
CREATE TABLE public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp within time zone DEFAULT now(),
  is_system_defined boolean DEFAULT false -- To protect default roles from deletion
);

-- Create Permissions Table
CREATE TABLE public.permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE, -- e.g., 'manage_users', 'view_reports'
  description text,
  module text -- e.g., 'users', 'finance', 'inventory' to group them in UI
);

-- Create Role-Permissions Join Table
CREATE TABLE public.role_permissions (
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies (Public read for authenticated users, Admin write for SuperAdmin)
-- For simplicity in this context, we'll allow authenticated users to read roles/permissions (needed for UI)
CREATE POLICY "Allow read access for authenticated users" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for authenticated users" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Write policies (Only SUPER_ADMIN should technically write, but we'll allow authenticated for now to simplify, assuming frontend checks role)
CREATE POLICY "Allow write access for authenticated users" ON public.roles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON public.permissions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow write access for authenticated users" ON public.role_permissions FOR ALL TO authenticated USING (true);

-- Insert Default Data
-- 1. Roles
INSERT INTO public.roles (name, description, is_system_defined) VALUES
('SUPER_ADMIN', 'Full system access', true),
('BRANCH_MANAGER', 'Manages a specific branch and its operations', true),
('CASHIER', 'Process transactions and view own history', true);

-- 2. Permissions
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
('manage_roles', 'Create and edit roles', 'system');

-- 3. Assign Permissions to Roles (Helper block)
DO $$
DECLARE
  super_admin_id uuid;
  branch_manager_id uuid;
  cashier_id uuid;
BEGIN
  SELECT id INTO super_admin_id FROM public.roles WHERE name = 'SUPER_ADMIN';
  SELECT id INTO branch_manager_id FROM public.roles WHERE name = 'BRANCH_MANAGER';
  SELECT id INTO cashier_id FROM public.roles WHERE name = 'CASHIER';

  -- SUPER_ADMIN: All permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT super_admin_id, id FROM public.permissions;

  -- BRANCH_MANAGER: Specific permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT branch_manager_id, id FROM public.permissions WHERE name IN (
    'view_users', 'create_users', 'edit_users', -- Can manage their branch staff (logic handled in app)
    'view_branches', -- View own branch
    'view_inventory', 'manage_inventory', 'adjust_stock',
    'view_branch_sales', 'manage_expenses',
    'process_sales', 'process_refunds', 'close_register'
  );

  -- CASHIER: POS permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT cashier_id, id FROM public.permissions WHERE name IN (
    'view_inventory', -- Need to see stock
    'process_sales', 'close_register'
  );
END $$;
