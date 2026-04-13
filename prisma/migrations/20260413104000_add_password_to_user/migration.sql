-- Add password column to User table
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT 'default123';

-- Update the default user password
UPDATE "User" SET "password" = 'default123' WHERE "username" = 'default';
