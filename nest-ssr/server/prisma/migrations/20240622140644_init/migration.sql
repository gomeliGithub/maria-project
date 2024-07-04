/*
  Warnings:

  - You are about to drop the column `compressedImageName` on the `imagephotographytype` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[compressedImageOriginalName]` on the table `ImagePhotographyType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `ImagePhotographyType_compressedImageName_key` ON `imagephotographytype`;

-- AlterTable
ALTER TABLE `imagephotographytype` DROP COLUMN `compressedImageName`,
    ADD COLUMN `compressedImageOriginalName` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ImagePhotographyType_compressedImageOriginalName_key` ON `ImagePhotographyType`(`compressedImageOriginalName`);
