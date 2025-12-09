-- ============================================
-- TRANSACTION EMAIL ALERT SYSTEM - DATABASE SETUP
-- ============================================

-- ============================================
-- PART 1: UPDATE TRANSACTIONS TABLE
-- ============================================

-- Add email tracking columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS email_status text CHECK (email_status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_email_sent_time timestamp with time zone;

-- ============================================
-- PART 2: CREATE EMAIL LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  type text CHECK (type IN ('auto', 'manual')) NOT NULL,
  sent_by uuid REFERENCES public.profiles(id),
  status text CHECK (status IN ('success', 'failed')) NOT NULL,
  error_message text,
  timestamp timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.email_logs;
DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.email_logs;

CREATE POLICY "Allow read access for authenticated users" 
  ON public.email_logs FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Allow write access for authenticated users" 
  ON public.email_logs FOR ALL 
  TO authenticated USING (true);

-- ============================================
-- PART 3: CREATE EMAIL SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_email text NOT NULL,
  from_name text DEFAULT 'POS System',
  from_email text DEFAULT 'no-reply@yourdomain.com',
  enable_auto_emails boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_settings
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.email_settings;
DROP POLICY IF EXISTS "Allow write access for authenticated users" ON public.email_settings;

CREATE POLICY "Allow read access for authenticated users" 
  ON public.email_settings FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Allow write access for authenticated users" 
  ON public.email_settings FOR ALL 
  TO authenticated USING (true);

-- Insert default email settings
INSERT INTO public.email_settings (company_email, from_name, from_email, enable_auto_emails)
VALUES ('owner@company.com', 'AlkanchiPay POS', 'no-reply@alkanchipay.com', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_email_status ON public.transactions(email_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_transaction_id ON public.email_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_timestamp ON public.email_logs(timestamp DESC);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check transactions table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'transactions' 
AND column_name IN ('email_status', 'email_attempts', 'last_email_sent_time');

-- Check email_logs table
SELECT 'Email Logs Table:' as status, COUNT(*) as count FROM information_schema.tables 
WHERE table_name = 'email_logs';

-- Check email_settings table
SELECT 'Email Settings Table:' as status, COUNT(*) as count FROM information_schema.tables 
WHERE table_name = 'email_settings';

-- Show email settings
SELECT * FROM public.email_settings;

-- ============================================
-- EMAIL DATABASE SETUP COMPLETE! ✅
-- ============================================
