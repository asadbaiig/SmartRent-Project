# Contract Delete Feature with Password Authentication

This document describes the contract deletion feature that requires password authentication.

## Features Implemented

### 1. Backend API Endpoint
**Endpoint:** `DELETE /api/contracts/:id`

**Authentication Required:** Yes (Bearer token)

**Request Body:**
```json
{
  "password": "user's password"
}
```

**Authorization Rules:**
- User must be authenticated
- Only the **landlord** who created the contract can delete it
- Password must be verified before deletion
- Admins can also delete contracts

**Response:**
- `200 OK` - Contract deleted successfully
- `400 Bad Request` - Password not provided
- `401 Unauthorized` - Incorrect password
- `403 Forbidden` - User doesn't have permission (not the landlord)
- `404 Not Found` - Contract doesn't exist

**How it works:**
1. Verifies password by attempting to sign in with Firebase Auth
2. Checks if user is the landlord of the contract
3. Deletes from MongoDB (primary) or Firebase (fallback)
4. Returns success message

### 2. Password Confirmation Dialog Component
**Location:** `client/src/components/password-confirm-dialog.tsx`

**Features:**
- Reusable password confirmation dialog
- Shows warning icon to indicate destructive action
- Password input with visibility toggle
- Error handling and display
- Loading state during submission
- Fully accessible with test IDs

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  confirmButtonText?: string;
}
```

### 3. UI Integration in Contracts Page
**Location:** `client/src/pages/contracts.tsx`

**Visual Changes:**
- Added **Trash (Delete) button** to each contract card
- Delete button only visible to **landlords** for their own contracts
- Red-colored delete button to indicate destructive action
- Button includes trash icon (Trash2 from lucide-react)

**User Flow:**
1. Landlord clicks the delete button on a contract card
2. Password confirmation dialog opens
3. User enters their password
4. If password is correct, contract is deleted
5. Contract list refreshes automatically
6. Success toast notification appears

**Error Handling:**
- Shows error message if password is incorrect
- Shows error if API request fails
- Toast notification for errors

### 4. State Management
- Uses React Query for data fetching and cache invalidation
- Optimistic UI updates after successful deletion
- Automatic list refresh after deletion

## Security Features

✅ **Password Verification** - Requires user's actual password, not just session token

✅ **Role-Based Access Control** - Only landlords can delete their contracts

✅ **Server-Side Validation** - All checks performed on the backend

✅ **Firebase Authentication** - Uses secure Firebase Auth for password verification

✅ **Authorization Check** - Verifies ownership before deletion

## Testing

### Test IDs Added:
- `button-delete-{contractId}` - Delete button on contract card
- `input-confirm-password` - Password input field
- `password-error` - Error message display
- `button-cancel-password` - Cancel button in dialog
- `button-confirm-password` - Confirm button in dialog

### Manual Testing Steps:
1. **As a Landlord:**
   - Login as a landlord
   - Navigate to Contracts page
   - Verify delete button appears on your contracts
   - Click delete button
   - Enter correct password → Contract should be deleted
   - Enter wrong password → Should show error

2. **As a Tenant:**
   - Login as a tenant
   - Navigate to Contracts page
   - Verify NO delete button appears on contracts

3. **Edge Cases:**
   - Try to delete without entering password
   - Try to delete with empty password
   - Try to delete a contract that doesn't exist
   - Try to delete another landlord's contract (via API directly)

## Database Operations

### MongoDB:
- `MongoDBStorage.deleteContract(id)` - Deletes contract by ID
- Already existed in codebase

### Firebase:
- `FirebaseStorage.deleteContract(id)` - **NEW** - Deletes contract from Firestore
- Uses Firebase's `deleteDoc()` method

## API Request Example

```typescript
const response = await fetch(`/api/contracts/${contractId}`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ 
    password: userPassword 
  }),
});
```

## Files Modified

1. **server/routes.ts** - Added DELETE endpoint
2. **server/firebase-storage.ts** - Added deleteContract method
3. **client/src/pages/contracts.tsx** - Added delete functionality
4. **client/src/components/password-confirm-dialog.tsx** - New component

## Future Enhancements

- Add soft delete (mark as deleted instead of permanent deletion)
- Add deletion history/audit log
- Support for two-factor authentication
- Allow tenants to request contract deletion (pending landlord approval)
- Add "Are you sure?" confirmation before password dialog
- Export contract data before deletion (for record keeping)

## Notes

- Contract deletion is **permanent** and cannot be undone
- Related payments and documents are NOT automatically deleted
- Consider implementing soft delete for production use
- Blockchain records remain immutable (if blockchain integration is active)

---

**Status:** ✅ Fully Implemented and Working
**Version:** 1.0
**Date:** December 19, 2025

