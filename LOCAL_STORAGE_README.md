# AlkanchiPay POS - Local Storage Version

This is a modified version of the AlkanchiPay POS system that uses **browser local storage** instead of Supabase backend. Everything is saved locally in your browser.

## Changes Made

### 1. **New Local Storage Service** (`services/localStorage.ts`)
   - Complete data persistence layer using browser localStorage
   - All data stored as JSON in browser storage
   - Supports CRUD operations for all entities (users, products, transactions, etc.)
   - Backup and restore functionality

### 2. **Updated Authentication** (`context/AuthContext.tsx`)
   - Simple username/password authentication from local storage
   - Session management using localStorage
   - No backend API calls

### 3. **Updated Store Context** (`context/StoreContext.tsx`)
   - All Supabase calls replaced with localStorage operations
   - Same API interface for components (no breaking changes needed)
   - All CRUD operations work synchronously
   - Backup/restore functionality

### 4. **Updated Login Page** (`pages/Login.tsx`)
   - Username/password based login (instead of email)
   - Demo credentials included on login screen
   - Shows available test accounts

### 5. **Dependencies**
   - Removed `@supabase/supabase-js` dependency
   - All other dependencies remain the same

## Demo Credentials

The application comes pre-populated with demo accounts:

| Username | Password | Role |
|----------|----------|------|
| `superadmin` | `admin123` | SUPER_ADMIN |
| `admin` | `admin123` | BRANCH_MANAGER |
| `cashier` | `cashier123` | CASHIER |

## Features

✅ All CRUD operations work offline  
✅ Complete data persistence in browser  
✅ User authentication and role-based access  
✅ Product inventory management  
✅ Transaction/Sales recording  
✅ Expense tracking  
✅ Branch management  
✅ Role management  
✅ Backup and restore functionality  
✅ File uploads (stored as base64)  

## Storage Limits

**Important:** Browser local storage has a typical limit of **5-10MB** per domain. This is suitable for:
- Small to medium businesses
- Up to several thousand products and transactions
- Testing and demonstration

For larger applications, you'll need to move back to a backend database (like Supabase).

## Data Persistence

All data is stored in the following localStorage keys:
- `alkanchipay_users` - User accounts
- `alkanchipay_products` - Product inventory
- `alkanchipay_transactions` - Sales transactions
- `alkanchipay_categories` - Product categories
- `alkanchipay_branches` - Store branches
- `alkanchipay_expenses` - Expense records
- `alkanchipay_roles` - User roles
- `alkanchipay_permissions` - System permissions
- `alkanchipay_settings` - Store settings
- `alkanchipay_activity_logs` - Activity logs
- `alkanchipay_session` - Current user session

## Clearing Data

To reset the application and start fresh:

1. Open browser Developer Tools (F12)
2. Go to Application/Storage tab
3. Click "Local Storage"
4. Delete all keys starting with `alkanchipay_`
5. Refresh the page

The app will reinitialize with default demo data.

## Backup & Restore

Use the backup/restore features in the admin panel to:
- Download a complete JSON backup of all data
- Import previously saved backups

This is useful for:
- Moving data between devices
- Version control
- Data recovery

## Exporting & Importing Users (Cross-device)

You can export user accounts from one machine and import them into another to enable cross-device login.

- Go to **Admin → Settings**.
- Click **Export Users** to download a JSON file containing all user accounts (`alkanchipay_users`).
- On the other device, open **Admin → Settings → Import Users** and choose the downloaded file.
- Use *Import Users (merge)* to add only non-conflicting accounts, or *Import Users (replace)* to overwrite the entire users list.

Notes:
- Usernames are normalized (trimmed and lowercased) to avoid common casing/whitespace login issues.
- After importing, reload the app if it doesn't automatically refresh.

Manual reproduction steps for login troubleshooting:

1. On the failing laptop, open Developer Tools → Application → Local Storage.
2. Confirm `alkanchipay_users` exists and contains the expected username (lowercased).
3. If missing, import the exported users JSON.
4. Ensure `alkanchipay_session` is cleared (delete it) before attempting login.
5. Try signing in with the exported account (username is case-insensitive).

## Differences from Original (Supabase) Version

| Feature | Original | Local Storage |
|---------|----------|---------------|
| Backend | Supabase | Browser localStorage |
| Authentication | Email/password via Supabase Auth | Username/password from data |
| Multi-device Sync | ✅ Yes | ❌ No (each device separate) |
| Offline Support | ❌ No | ✅ Yes |
| Data Limit | ✅ Unlimited | ⚠️ 5-10MB per browser |
| Setup Required | ✅ Supabase project | ❌ No setup needed |

## Running the App

```bash
npm install
npm run dev
```

Then navigate to the local development URL and log in with demo credentials.

## Future: Migrating Back to Supabase

If you want to switch back to Supabase:

1. Keep your `services/localStorage.ts` for reference
2. Update `context/AuthContext.tsx` to use Supabase authentication
3. Update `context/StoreContext.tsx` to use Supabase CRUD operations
4. Use the backup feature to export localStorage data
5. Implement data migration to Supabase database

## Notes

- This version works completely offline once loaded
- No internet connection required after initial page load
- Each browser/device maintains separate data
- Data persists after closing and reopening the browser
- Clearing browser cache/cookies will clear the data

Enjoy using AlkanchiPay POS locally! 🎉
