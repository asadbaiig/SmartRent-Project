# Admin User Setup

## Admin Credentials

An admin user has been created with the following credentials:

- **Username/Email:** `admin` or `admin@smartrent.com` (both work - the system automatically converts "admin" to "admin@smartrent.com")
- **Password:** `password`
- **Role:** `admin`
- **Verification Status:** `verified` (pre-verified)

## Login Behavior

When the admin user logs in with these credentials, they will be **automatically redirected to the Admin Portal** (`/admin/portal`) instead of the regular dashboard.

### How to Login

1. Go to the login page (`/login`)
2. Enter **`admin`** in the email field (or `admin@smartrent.com`)
3. Enter **`password`** in the password field
4. Click "Sign In"
5. You will be automatically redirected to `/admin/portal`

## Creating/Recreating Admin User

To create or recreate the admin user, run:

```bash
npm run create-admin
```

This script will:
1. Create a Firebase Auth user with email `admin@smartrent.com` and password `password`
2. Create a corresponding user record in Firestore with role `admin`
3. Set verification status to `verified`

## Notes

- If the admin user already exists, the script will display a message indicating so
- The admin user has full access to:
  - Document verification management
  - Dispute resolution
  - User management
  - System-wide statistics

## Accessing Admin Portal

After logging in as admin, you can access the admin portal at:
- Direct URL: `/admin/portal`
- Or it will automatically redirect after login

