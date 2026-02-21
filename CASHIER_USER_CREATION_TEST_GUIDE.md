# CASHIER USER CREATION - QUICK TEST GUIDE

## Pre-Test Setup
- Open app in browser
- Login as Super Admin: `salmanu@alkanchipay.com` / `Salmanu@2025`
- Navigate to **SuperAdmin Dashboard**
- Click on **Users** tab

---

## TEST 1: Create Basic Cashier ✓
**Expected:** Cashier created with minimum info

```
Steps:
1. Click "Add User" button
2. Fill form:
   - Name: Test Cashier 1
   - Username: test.cashier@store.com
   - Password: TestPass123
   - Role: CASHIER
   - Branch: (Leave as "No Branch")
   - Expense Limit: 0
3. Click "Create User"

Expected Results:
✓ Success notification appears
✓ New user in list with status ACTIVE
✓ Can see: Name=Test Cashier 1, Role=CASHIER
✓ Branch shows as empty/unassigned
```

---

## TEST 2: Duplicate Username Prevention ✓
**Expected:** Cannot create user with existing username

```
Steps:
1. Click "Add User" again
2. Try to create:
   - Name: Another User
   - Username: test.cashier@store.com  (SAME AS TEST 1)
   - Password: Different123
   - Role: CASHIER
3. Click "Create User"

Expected Results:
✗ Form does NOT submit
✗ Error notification: "Username already exists"
✗ User NOT created
✓ Modal stays open for correction
```

---

## TEST 3: Password Validation ✓
**Expected:** Password too short is rejected

```
Steps:
1. Click "Add User"
2. Try password that's too short:
   - Name: Short Pass Test
   - Username: shortpass@test.com
   - Password: 12345  (ONLY 5 CHARS)
   - Role: CASHIER
3. Try to submit

Expected Results:
✗ Form shows error: "Password must be at least 6 characters"
✗ Cannot submit form
✓ After entering 6+ char password: form submits
```

---

## TEST 4: Required Fields Validation ✓
**Expected:** Cannot leave required fields empty

```
Steps:
1. Click "Add User"
2. Leave each field empty and try to submit:

Test 4a - Empty Name:
   - Name: (empty)
   - Username: test@example.com
   - Password: Test12345
   Expected: ✗ Error "Name is required"

Test 4b - Empty Username:
   - Name: Test User
   - Username: (empty)
   - Password: Test12345
   Expected: ✗ Error "Username is required"

Test 4c - Empty Password:
   - Name: Test User
   - Username: test@example.com
   - Password: (empty)
   Expected: ✗ Error "Password must be at least 6 characters"
```

---

## TEST 5: Branch Assignment ✓
**Expected:** Cashier assigned to correct branch

```
Prerequisites:
- Create a branch first in SuperAdmin > Branches

Steps:
1. Click "Add User"
2. Fill form:
   - Name: Branch Cashier
   - Username: branch.cashier@store.com
   - Password: BranchPass123
   - Role: CASHIER
   - Branch: SELECT A BRANCH (e.g., "Main Branch")
3. Create user

Expected Results:
✓ User created
✓ Cashier appears in users list
✓ Branch column shows: "Main Branch" (or selected)
✓ When cashier logs in, only sees products/transactions for that branch
```

---

## TEST 6: Cashier Login ✓
**Expected:** Created cashier can log in

```
Prerequisites:
- User created from TEST 1 or 5

Steps:
1. Click "Logout" (top right)
2. Login page appears
3. Enter credentials from created user:
   - Username: test.cashier@store.com
   - Password: TestPass123
4. Click "Sign In"

Expected Results:
✓ Login successful
✓ Redirects to Cashier dashboard
✓ Shows cashier name in top right
✓ Can see role: CASHIER
✓ Profile shows correct branch (if assigned)
```

---

## TEST 7: Edit User ✓
**Expected:** Can modify existing user

```
Prerequisites:
- User created from TEST 1

Steps:
1. In Users tab, find user from TEST 1
2. Click "Edit" button
3. Modify information:
   - Name: Updated Cashier Name
   - Username: (DO NOT CHANGE - unique check applies)
   - Role: CASHIER (keep same)
   - Branch: Assign to a branch
   - Expense Limit: 10000
4. Click "Save Changes"

Expected Results:
✓ Update successful
✓ User list shows updated name
✓ Branch now assigned
✓ Expense Limit updated to 10000
✓ Password remains unchanged
```

---

## TEST 8: Expense Limit ✓
**Expected:** Expense limit stored and accessible

```
Steps:
1. Create cashier with Expense Limit: 5000
2. Verify in user list
3. Login as that cashier
4. Go to Profile tab
5. Should see: "Expense Limit: ₦5,000"

Expected Results:
✓ Shows correct amount
✓ Can request expenses up to this limit
✓ Cannot request more than limit
```

---

## TEST 9: User Status Toggle ✓
**Expected:** Can deactivate/activate user

```
Steps:
1. Find user in Users list
2. Click "Edit"
3. In form, see checkbox: "Active Account"
4. Uncheck to deactivate
5. Click "Save Changes"
6. Try to login as this user

Expected Results:
✓ User updated as inactive
✓ Login fails with message: "Your account has been suspended"
✓ Re-activate by checking "Active Account" again
✓ Login works after re-activation
```

---

## TEST 10: User Deletion ✓
**Expected:** Can remove user from system

```
Steps:
1. Find user in Users list
2. Click "Delete" button (trash icon)
3. Confirm deletion
4. Check users list

Expected Results:
✓ User removed from list
✓ Cannot login with that user anymore
✓ Previous transactions still show the cashier name
```

---

## Troubleshooting

### Issue: Form Won't Submit
**Solution:**
1. Check if required fields are filled (red border)
2. Check password is 6+ characters
3. Check username is unique
4. Look for error notification at top of page

### Issue: Can't Login With Created User
**Solution:**
1. Verify username and password are correct (case-sensitive)
2. Check if user status is "Active"
3. Check browser console for errors
4. Clear browser localStorage and try again

### Issue: User Appears Twice
**Solution:**
1. Refresh page to reload from storage
2. Check if duplicate was actually created
3. Delete duplicate and recreate

### Issue: Branch Not Saving
**Solution:**
1. Make sure branch exists (create one first if needed)
2. Select branch from dropdown (don't leave blank unless intentional)
3. Save and verify it shows in users list

---

## Quick Validation Checklist

After all tests, verify:

- [ ] Can create cashier with valid data
- [ ] Cannot create cashier with duplicate username
- [ ] Cannot create with weak password
- [ ] Cannot submit form with empty required fields
- [ ] Can assign cashier to branch
- [ ] Created cashier can login
- [ ] Can edit and update cashier info
- [ ] Can assign expense limits
- [ ] Can deactivate/activate users
- [ ] Can delete users
- [ ] Users show in correct branch with correct role

---

## Data Validation Reference

| Field | Type | Rules |
|-------|------|-------|
| Name | String | Required, trimmed, non-empty |
| Username | String | Required, unique, trimmed, non-empty |
| Password | String | Required (new only), min 6 chars |
| Role | String | Required, selected from dropdown |
| Branch | String | Optional, valid branch ID or undefined |
| Expense Limit | Number | Optional, >= 0, defaults to 0 |
| Active Status | Boolean | Auto-true for new, toggleable on edit |

---

**Test Date:** ________________  
**Tester Name:** ________________  
**Status:** ☐ PASSED | ☐ FAILED

**Notes:**
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**All tests passing? ✅ Great! Cashier user creation is working correctly.**
