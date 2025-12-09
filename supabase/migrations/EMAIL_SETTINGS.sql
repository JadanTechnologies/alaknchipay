-- ============================================
-- EMAIL SETTINGS TABLE FOR RESEND API
-- ============================================

-- Create email_settings table if not exists (from earlier migration)
CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid default gen_random_uuid() primary key,
  company_email text not null,
  resend_api_key text,
  from_name text default 'AlkanchiPay POS',
  from_email text default 'no-reply@alkanchipay.com',
  enable_auto_emails boolean default true,
  updated_at timestamp with time zone default now() not null,
  updated_by uuid references profiles(id)
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.email_settings;
DROP POLICY IF EXISTS "Allow write for authenticated" ON public.email_settings;

-- Create policies
CREATE POLICY "Allow read for authenticated" 
  ON public.email_settings FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Allow write for authenticated" 
  ON public.email_settings FOR ALL 
  TO authenticated USING (true);

-- Insert default settings if not exists
INSERT INTO public.email_settings (company_email, from_name, from_email, enable_auto_emails)
VALUES ('owner@company.com', 'AlkanchiPay POS', 'no-reply@alkanchipay.com', false)
ON CONFLICT DO NOTHING;

-- Verify
SELECT * FROM public.email_settings;
