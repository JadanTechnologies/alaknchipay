-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (Users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  name text,
  role text check (role in ('SUPER_ADMIN', 'ADMIN', 'CASHIER')),
  active boolean default true,
  store_id text,
  expense_limit numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Categories
create table categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  store_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Products
create table products (
  id uuid default uuid_generate_v4() primary key,
  sku text unique not null,
  name text not null,
  category_id uuid references categories(id),
  cost_price numeric not null,
  selling_price numeric not null,
  stock integer not null default 0,
  min_stock_alert integer default 5,
  expiry_date  timestamp with time zone,
  store_id text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Branches
create table branches (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  phone text,
  manager_id uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  cashier_id uuid references profiles(id),
  store_id text,
  subtotal numeric not null,
  discount numeric default 0,
  total numeric not null,
  amount_paid numeric not null,
  payment_method text,
  status text check (status in ('COMPLETED', 'PARTIAL', 'REFUNDED', 'PENDING', 'HELD')),
  customer_name text,
  customer_phone text,
  notes text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transaction Items
create table transaction_items (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references transactions(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  price_at_sale numeric not null,
  cost_at_sale numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Expense Categories
create table expense_categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Expenses
create table expenses (
  id uuid default uuid_generate_v4() primary key,
  description text not null,
  amount numeric not null,
  category_id uuid references expense_categories(id),
  status text check (status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  requested_by uuid references profiles(id),
  store_id text,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  approved_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Store Settings
create table store_settings (
  id uuid default uuid_generate_v4() primary key,
  name text,
  currency text default '₦',
  address text,
  phone text,
  logo_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activity Logs
create table activity_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  details text,
  user_id uuid references profiles(id),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Basic)
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table branches enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;
alter table store_settings enable row level security;
alter table activity_logs enable row level security;

-- Allow read for authenticated users
create policy "Public read" on profiles for select using (auth.role() = 'authenticated');
create policy "Public read" on categories for select using (auth.role() = 'authenticated');
create policy "Public read" on products for select using (auth.role() = 'authenticated');
create policy "Public read" on branches for select using (auth.role() = 'authenticated');
create policy "Public read" on transactions for select using (auth.role() = 'authenticated');
create policy "Public read" on transaction_items for select using (auth.role() = 'authenticated');
create policy "Public read" on expense_categories for select using (auth.role() = 'authenticated');
create policy "Public read" on expenses for select using (auth.role() = 'authenticated');
create policy "Public read" on store_settings for select using (auth.role() = 'authenticated');
create policy "Public read" on activity_logs for select using (auth.role() = 'authenticated');

-- Allow write for authenticated users (for now, can be refined by role)
create policy "Public write" on profiles for insert with check (auth.role() = 'authenticated');
create policy "Public write" on categories for insert with check (auth.role() = 'authenticated');
create policy "Public write" on products for insert with check (auth.role() = 'authenticated');
create policy "Public write" on branches for insert with check (auth.role() = 'authenticated');
create policy "Public write" on transactions for insert with check (auth.role() = 'authenticated');
create policy "Public write" on transaction_items for insert with check (auth.role() = 'authenticated');
create policy "Public write" on expense_categories for insert with check (auth.role() = 'authenticated');
create policy "Public write" on expenses for insert with check (auth.role() = 'authenticated');
create policy "Public write" on store_settings for insert with check (auth.role() = 'authenticated');
create policy "Public write" on activity_logs for insert with check (auth.role() = 'authenticated');

-- Modify policies need to be added separately or combined
