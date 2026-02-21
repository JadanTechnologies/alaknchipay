# ROLE & PERMISSION MANAGEMENT - QUICK START GUIDE

## Overview
Super Admin can now create custom roles and assign permissions to control user access throughout the system.

---

## 🎯 QUICK START: Create a Custom Role

### Step 1: Access Roles & Permissions
1. Login as Super Admin: `salmanu@alkanchipay.com` / `Salmanu@2025`
2. Click **Roles & Permissions** in sidebar
3. Click **"Create Role"** button (blue button, top right)

### Step 2: Fill Role Information
```
Role Name:        Store Manager
Description:      Manages store operations and inventory
```

### Step 3: Assign Permissions
Select checkboxes for permissions:
- [ ] Full Access
- [x] View Inventory
- [x] Process Sales  
- [x] Manage Branch
- [x] View Reports
- [ ] Manage Expenses
- [ ] Close Register

### Step 4: Save
Click **"Create Role"** button

✅ Success! Your role is created and ready to assign to users.

---

## 👥 ASSIGN ROLE TO USER

### Steps:
1. Go to **Users** tab
2. Click **Edit** on any user
3. In the form, click **Role** dropdown
4. Select: `Store Manager` (or your custom role)
5. Click **"Create User"** or **"Save Changes"**

✅ Done! User now has Store Manager role and permissions.

---

## 📋 AVAILABLE PERMISSIONS

### What Each Permission Does

| Permission | Description | What Users Can Do |
|-----------|-------------|------------------|
| **Full Access** | Complete system access | Everything without restrictions |
| **View Inventory** | See all products and stock | View inventory, but not modify |
| **Process Sales** | Handle POS transactions | Sell products, process refunds |
| **Manage Branch** | Control branch operations | Edit branch info, manage staff |
| **View Reports** | See all reports & analytics | Generate and view reports |
| **Manage Expenses** | Handle expense requests | Create, approve, reject expenses |
| **Close Register** | End of day operations | Close register, run reports |

---

## 🔄 EDIT EXISTING ROLE

### Steps:
1. Go to **Roles & Permissions** tab
2. Find role card
3. Hover over card → Click **edit icon** (pencil)
4. Change:
   - Description
   - Permissions (check/uncheck)
5. Click **"Update Role"**

✅ Changes apply immediately to all users with this role

---

## 🗑️ DELETE CUSTOM ROLE

### Steps:
1. Go to **Roles & Permissions** tab
2. Find role card
3. Hover over card → Click **delete icon** (trash)
4. Confirm deletion

⚠️ **Note:** System roles (SUPER_ADMIN, CASHIER) cannot be deleted

---

## 📊 VIEW ROLE STATUS

Each role card shows:
- **Role Name**: e.g., "Store Manager"
- **User Count**: How many users have this role
- **Description**: What the role does
- **Capabilities**: List of assigned permissions

Example:
```
┌─────────────────────────┐
│ Store Manager      [2 Users]
│ Manages store operations
│
│ Capabilities:
│ ✓ View Inventory
│ ✓ Process Sales
│ ✓ Manage Branch
│ ✓ View Reports
└─────────────────────────┘
```

---

## 🔐 PERMISSION HIERARCHY

### Super Admin
- Always has **Full Access**
- Can create/edit/delete roles
- Can create/manage users
- No restrictions

### Custom Roles
- Have specific permissions selected
- Can be modified anytime
- Users inherit role permissions

### System Roles
- **SUPER_ADMIN**: Create roles, manage system
- **CASHIER**: Default role, process sales only
- Cannot be deleted or modified

---

## ✅ COMMON SCENARIOS

### Scenario 1: Create Manager Role for Multiple Users
```
1. Create Role: "Branch Manager"
   Assign: View Inventory, Process Sales, Manage Branch, View Reports
   
2. Edit Users: Jane, John, Michael
   Assign: "Branch Manager" role
   
Result: All 3 users now managers with same permissions
```

### Scenario 2: Limited Cashier Role
```
1. Create Role: "Limited Cashier"
   Assign: Process Sales only
   
2. Assign to new part-time staff
   
Result: Can only access POS, cannot view reports/inventory
```

### Scenario 3: Supervisor Role
```
1. Create Role: "Supervisor"
   Assign: All permissions except Full Access
   
2. Assign to trusted staff
   
Result: Can manage most features but no system-wide access
```

---

## ⚠️ PERMISSION NOTES

### What Each Permission Enables:

**View Inventory**
- See all products in branch
- Check stock levels
- View product details
- *Cannot: Add/edit/delete products or adjust stock*

**Process Sales**
- Access POS system
- Ring up sales
- Process refunds
- *Cannot: Access admin features*

**Manage Branch**
- Edit branch information
- Assign staff to branch
- *Cannot: Delete branch or create new branches*

**View Reports**
- Generate sales reports
- See analytics
- Export data
- *Cannot: Modify reported data*

**Manage Expenses**
- Create expense requests
- Approve/reject expenses
- View expense history
- *Cannot: Force approval of all expenses*

**Close Register**
- End of day procedures
- Print final reports
- Close register
- *Cannot: Reopen register or edit transactions*

---

## 🔍 TROUBLESHOOTING

### Problem: Cannot see permissions to assign
**Solution:** 
- Refresh page
- Check that you're in Roles & Permissions tab
- Ensure you're logged in as Super Admin

### Problem: Role name says "already exists"
**Solution:**
- Role names must be unique
- Try: "Store Manager v2" or "Manager (Branch)"
- Check existing roles first

### Problem: Permissions not showing up
**Solution:**
- System loads default permissions on first load
- Try logging out and back in
- Check browser localStorage hasn't been cleared

### Problem: User not getting new permissions
**Solution:**
- Make sure you clicked "Save Changes"
- User must log out and back in for permissions to refresh
- Check user's role was actually assigned

---

## 📖 REFERENCE: DEFAULT SYSTEM ROLES

### SUPER_ADMIN
```
Name: SUPER_ADMIN
Permissions: Full Access
Description: System administrator with all rights
Users: salmanu@alkanchipay.com
Cannot be modified or deleted
```

### CASHIER  
```
Name: CASHIER
Permissions: Process Sales
Description: POS cashier can process sales only
Users: Created by Super Admin
Can be customized by creating new role with different permissions
System role but new cashiers created with limited access
```

---

## 🎓 BEST PRACTICES

### DO ✅
- Create specific roles for different job functions
- Review role permissions regularly
- Name roles clearly (Store Manager, Cashier, Accountant)
- Document what each custom role does
- Use descriptions to explain role purpose

### DON'T ❌
- Create duplicate roles
- Give everyone "Full Access"
- Use vague role names like "User1", "Test"
- Delete roles while users still assigned
- Modify system roles unnecessarily

---

## 🚀 QUICK COMMAND REFERENCE

```
CREATE ROLE:
  Sidebar > Roles & Permissions > Create Role > Fill > Save

EDIT ROLE:
  Roles & Permissions tab > Click edit icon > Update > Save

DELETE ROLE:
  Roles & Permissions tab > Click delete icon > Confirm

ASSIGN TO USER:
  Users tab > Edit user > Select role > Save

VIEW ROLE USERS:
  Roles & Permissions tab > Look at card > User count shown

CHECK PERMISSIONS:
  In role card > Look at "Capabilities" list
```

---

## 📞 QUICK SUPPORT

| Issue | Solution |
|-------|----------|
| Role won't create | Check name is unique, not empty |
| Can't see new role | Refresh page, check it was saved |
| User can't access feature | Check role has that permission |
| Can't delete system role | These cannot be deleted |
| Last permission unchecked | Allowed - role can have 0 permissions |

---

## ✨ KEY FEATURES

✅ **Unlimited Custom Roles** - Create as many custom roles as needed

✅ **Flexible Permissions** - Assign any combination of permissions

✅ **Real-time Updates** - Changes apply instantly to users

✅ **User Count Tracking** - See how many users per role

✅ **Easy Management** - Simple UI with hover/click controls

✅ **Protection** - System roles protected from deletion

✅ **No Breaking Changes** - Existing roles can be customized

---

**Last Updated:** February 21, 2026  
**Status:** ✅ COMPLETE AND FUNCTIONAL
