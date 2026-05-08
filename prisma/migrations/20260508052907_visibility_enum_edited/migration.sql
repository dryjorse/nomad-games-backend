/*
  Warnings:

  - The values [FOR_FRIENDS] on the enum `GameVisibility` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GameVisibility_new" AS ENUM ('PUBLIC', 'PRIVATE');
ALTER TABLE "public"."Game" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Game" ALTER COLUMN "visibility" TYPE "GameVisibility_new" USING ("visibility"::text::"GameVisibility_new");
ALTER TYPE "GameVisibility" RENAME TO "GameVisibility_old";
ALTER TYPE "GameVisibility_new" RENAME TO "GameVisibility";
DROP TYPE "public"."GameVisibility_old";
ALTER TABLE "Game" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';
COMMIT;
