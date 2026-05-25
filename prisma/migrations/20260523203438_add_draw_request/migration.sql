-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "firstPlayerDrawRequest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "secondPlayerDrawRequest" BOOLEAN NOT NULL DEFAULT false;
