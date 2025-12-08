-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, name, role, active, store_id, expense_limit)
  values (
    new.id,
    new.email, -- Use email as initial username
    split_part(new.email, '@', 1), -- Use part of email as name
    'CASHIER', -- Default role
    true, -- Active by default
    null, -- No store/branch initially
    0.00 -- 0 expense limit
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- OPTIONAL: Run this ONCE to fix existing users who have no profile
-- insert into public.profiles (id, username, name, role, active, store_id)
-- select id, email, split_part(email, '@', 1), 'CASHIER', true, null
-- from auth.users
-- where id not in (select id from public.profiles);
