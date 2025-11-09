-- Set a user as admin by their Clerk ID
-- Replace 'YOUR_CLERK_USER_ID' with your actual Clerk user ID from the database

-- Option 1: Set specific user as admin by Clerk ID
UPDATE "User" 
SET "isAdmin" = true 
WHERE id = 'YOUR_CLERK_USER_ID';

-- Option 2: Set the first user in the database as admin
-- UPDATE "User" 
-- SET "isAdmin" = true 
-- WHERE id = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1);

-- Option 3: Set user as admin by email
-- UPDATE "User" 
-- SET "isAdmin" = true 
-- WHERE email = 'your-email@example.com';

-- Verify the change
SELECT id, email, role, "isAdmin", "createdAt" 
FROM "User" 
WHERE "isAdmin" = true;
