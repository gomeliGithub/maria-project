-- CreateTable
CREATE TABLE `Admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `login` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `type` ENUM('admin', 'member') NOT NULL DEFAULT 'admin',
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `signUpDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSignInDate` DATETIME(3) NULL,
    `lastActiveDate` DATETIME(3) NULL,

    UNIQUE INDEX `Admin_login_key`(`login`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Member` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `login` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `type` ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `signUpDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSignInDate` DATETIME(3) NULL,
    `lastActiveDate` DATETIME(3) NULL,

    UNIQUE INDEX `Member_login_key`(`login`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompressedImage` (
    `name` VARCHAR(191) NOT NULL,
    `dirPath` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `originalDirPath` VARCHAR(191) NOT NULL,
    `originalSize` INTEGER NOT NULL,
    `photographyType` ENUM('individual', 'children', 'wedding', 'family') NOT NULL,
    `displayType` ENUM('horizontal', 'vertical') NOT NULL,
    `description` VARCHAR(191) NULL,
    `uploadDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `displayedOnHomePage` BOOLEAN NOT NULL DEFAULT false,
    `displayedOnGalleryPage` BOOLEAN NOT NULL DEFAULT false,
    `adminId` INTEGER NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImagePhotographyType` (
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `compressedImageName` VARCHAR(191) NULL,

    UNIQUE INDEX `ImagePhotographyType_compressedImageName_key`(`compressedImageName`),
    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientOrder` (
    `id` BIGINT UNSIGNED NOT NULL,
    `photographyType` VARCHAR(191) NOT NULL,
    `type` ENUM('consultation', 'full') NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('new', 'processed') NOT NULL DEFAULT 'new',
    `memberId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Discount` (
    `id` BIGINT UNSIGNED NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `expirationFromDate` DATETIME(3) NOT NULL,
    `expirationToDate` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JWT` (
    `token_hash` VARCHAR(191) NOT NULL,
    `issued_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_date` DATETIME(3) NOT NULL,
    `revokation_date` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`token_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CompressedImage` ADD CONSTRAINT `CompressedImage_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClientOrder` ADD CONSTRAINT `ClientOrder_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Member`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
