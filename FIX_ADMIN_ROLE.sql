-- Fix Admin Role for Role Switching
-- Run this in your production database to ensure admin user has correct setup

-- Check current admin users
SELECT id, email, name, role, "isAdmin"
FROM "User"
WHERE role = 'ADMIN' OR "isAdmin" = true;

-- IMPORTANT: Set isAdmin = true for your admin user
-- This allows the admin to switch between role views while keeping admin privileges
-- Replace 'your-admin-email@example.com' with your actual admin email
UPDATE "User"
SET "isAdmin" = true, role = 'ADMIN'
WHERE email = 'your-admin-email@example.com';

-- Verify the update
SELECT id, email, name, role, "isAdmin"
FROM "User"
WHERE email = 'your-admin-email@example.com';

-- How it works:
-- - isAdmin = true: Preserves admin privileges when switching role views
-- - role = 'ADMIN'/'DRIVER'/'RIDER'/'DISPATCHER': Determines which page/view they see
-- - When admin switches to "Driver" view, role changes to 'DRIVER' but isAdmin stays true
-- - The admin mode bar stays visible because isAdmin = true
-- - Admin can switch back anytime because isAdmin = true allows the switch-role API
