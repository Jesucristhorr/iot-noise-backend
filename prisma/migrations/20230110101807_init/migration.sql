-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(16) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    INDEX `Role_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `displayName` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `username` VARCHAR(24) NOT NULL,
    `password` TEXT NOT NULL,
    `roleId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_username_idx`(`username`),
    INDEX `User_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConnectionType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `protocol` VARCHAR(24) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ConnectionType_protocol_key`(`protocol`),
    INDEX `ConnectionType_protocol_idx`(`protocol`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlotData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(16) NOT NULL DEFAULT 'Gráfica',
    `labelX` VARCHAR(12) NOT NULL,
    `labelY` VARCHAR(12) NOT NULL,
    `minValueY` INTEGER NOT NULL,
    `maxValueY` INTEGER NOT NULL,
    `optimalValue` DECIMAL(16, 2) NULL,
    `optimalValueEntity` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `PlotData_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sensor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(36) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `description` TEXT NULL,
    `measurementUnit` VARCHAR(24) NOT NULL,
    `latitude` DECIMAL(16, 10) NOT NULL,
    `longitude` DECIMAL(16, 10) NOT NULL,
    `iconUrl` TEXT NULL,
    `connectionTypeId` INTEGER NOT NULL,
    `connHostname` TEXT NOT NULL,
    `connPort` INTEGER NOT NULL,
    `connUsername` VARCHAR(32) NULL,
    `connPassword` VARCHAR(64) NULL,
    `plotDataId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Sensor_uuid_key`(`uuid`),
    INDEX `Sensor_name_idx`(`name`),
    INDEX `Sensor_userId_idx`(`userId`),
    INDEX `Sensor_connectionTypeId_idx`(`connectionTypeId`),
    INDEX `Sensor_plotDataId_idx`(`plotDataId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Metric` (
    `uuid` VARCHAR(191) NOT NULL,
    `value` DECIMAL(16, 2) NOT NULL,
    `sensorId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Metric_sensorId_idx`(`sensorId`),
    PRIMARY KEY (`uuid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
