/*
  Warnings:

  - You are about to drop the column `connectionParams` on the `ConnectionType` table. All the data in the column will be lost.
  - Added the required column `connectionPassword` to the `Sensor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `connectionUrl` to the `Sensor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `connectionUsername` to the `Sensor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ConnectionType` DROP COLUMN `connectionParams`;

-- AlterTable
ALTER TABLE `Sensor` ADD COLUMN `connectionPassword` VARCHAR(100) NOT NULL,
    ADD COLUMN `connectionUrl` VARCHAR(255) NOT NULL,
    ADD COLUMN `connectionUsername` VARCHAR(100) NOT NULL;
