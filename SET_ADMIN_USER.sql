-- Set admin flag for specific user by email
-- Replace 'your-email@example.com' with the actual admin email

UPDATE "User" 
SET "isAdmin" = true 
WHERE email = 'your-email@example.com';

-- Or set by Clerk user ID
-- UPDATE "User" 
-- SET "isAdmin" = true 
-- WHERE id = 'user_clerk_id_here';

-- Verify the change
SELECT id, email, role, "isAdmin" 
FROM "User" 
WHERE "isAdmin" = true;
