-- Fix Admin Role for Role Switching
-- Run this in your production database to ensure admin user has correct role

-- Check current admin users
SELECT id, email, name, role, "isAdmin"
FROM "User"
WHERE role = 'ADMIN' OR "isAdmin" = true;

-- If your admin user doesn't have role = 'ADMIN', run this:
-- Replace 'your-admin-email@example.com' with your actual admin email
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'your-admin-email@example.com';

-- Verify the update
SELECT id, email, name, role, "isAdmin"
FROM "User"
WHERE email = 'your-admin-email@example.com';

-- Optional: If you want to ensure isAdmin is also true
UPDATE "User"
SET "isAdmin" = true
WHERE role = 'ADMIN';
