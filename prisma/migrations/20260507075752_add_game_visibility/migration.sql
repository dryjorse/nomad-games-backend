-- CreateEnum
CREATE TYPE "GameVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'FOR_FRIENDS');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "visibility" "GameVisibility" NOT NULL DEFAULT 'PUBLIC';
