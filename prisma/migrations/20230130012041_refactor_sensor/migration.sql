/*
  Warnings:

  - You are about to drop the column `connHostname` on the `Sensor` table. All the data in the column will be lost.
  - You are about to drop the column `connPassword` on the `Sensor` table. All the data in the column will be lost.
  - You are about to drop the column `connPort` on the `Sensor` table. All the data in the column will be lost.
  - You are about to drop the column `connUsername` on the `Sensor` table. All the data in the column will be lost.
  - You are about to drop the column `iconUrl` on the `Sensor` table. All the data in the column will be lost.
  - Added the required column `connectionParams` to the `ConnectionType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationName` to the `Sensor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ConnectionType` ADD COLUMN `connectionParams` JSON NOT NULL;

-- AlterTable
ALTER TABLE `Sensor` DROP COLUMN `connHostname`,
    DROP COLUMN `connPassword`,
    DROP COLUMN `connPort`,
    DROP COLUMN `connUsername`,
    DROP COLUMN `iconUrl`,
    ADD COLUMN `locationName` VARCHAR(100) NOT NULL,
    MODIFY `description` VARCHAR(255) NULL;
