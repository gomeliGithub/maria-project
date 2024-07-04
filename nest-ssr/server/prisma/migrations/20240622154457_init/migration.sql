/*
  Warnings:

  - A unique constraint covering the columns `[compressedImageName]` on the table `ImagePhotographyType` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `imagephotographytype` ADD COLUMN `compressedImageName` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ImagePhotographyType_compressedImageName_key` ON `ImagePhotographyType`(`compressedImageName`);
