-- ===================================================
-- MIGRATION: Create Warehouse Tables Only
-- Database: rgiapp
-- Created: 2024
-- NOTE: Hanya membuat tabel warehouse yang belum ada
-- Tabel lain sudah ada di database
-- ===================================================

USE rgiapp;

-- ===================================================
-- 1. WAREHOUSE LOCATIONS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `location_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `location_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `location_type` enum('HQ','BRANCH','TRANSIT') COLLATE utf8mb4_general_ci DEFAULT 'BRANCH',
  `address` text COLLATE utf8mb4_general_ci,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pic_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pic_phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_code` (`location_code`),
  KEY `idx_branch` (`branch_id`),
  CONSTRAINT `fk_warehouse_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 2. WAREHOUSE RACKS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_racks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `warehouse_id` int NOT NULL,
  `rack_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `rack_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `capacity_weight` decimal(10,2) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_rack_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 3. WAREHOUSE BINS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_bins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_id` int NOT NULL,
  `bin_code` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `bin_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `position_level` int DEFAULT NULL,
  `position_column` char(1) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `capacity_items` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rack` (`rack_id`),
  CONSTRAINT `fk_bin_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 4. WAREHOUSE STOCK
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_barang` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `unit_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `quantity` int DEFAULT 0,
  `reserved_qty` int DEFAULT 0,
  `available_qty` int DEFAULT 0,
  `last_movement_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_barang` (`id_barang`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_rack` (`rack_id`),
  KEY `idx_bin` (`bin_id`),
  KEY `idx_unit` (`unit_id`),
  KEY `idx_branch` (`branch_id`),
  CONSTRAINT `fk_stock_barang` FOREIGN KEY (`id_barang`) REFERENCES `purchasing_barang` (`id_barang`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stock_bin` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stock_unit` FOREIGN KEY (`unit_id`) REFERENCES `purchasing_item_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stock_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 5. STOCK MOVEMENTS
-- ===================================================
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_barang` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `unit_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `movement_type` enum('IN','OUT','TRANSFER','ADJUSTMENT','OPNAME') COLLATE utf8mb4_general_ci NOT NULL,
  `reference_type` enum('INCOMING','OUTGOING','TRANSFER','ADJUSTMENT','OPNAME') COLLATE utf8mb4_general_ci NOT NULL,
  `reference_id` int DEFAULT NULL,
  `quantity_before` int DEFAULT 0,
  `quantity_change` int NOT NULL,
  `quantity_after` int DEFAULT 0,
  `movement_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_general_ci,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_barang` (`id_barang`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_rack` (`rack_id`),
  KEY `idx_bin` (`bin_id`),
  KEY `idx_unit` (`unit_id`),
  KEY `idx_branch` (`branch_id`),
  KEY `idx_movement_date` (`movement_date`),
  CONSTRAINT `fk_movement_barang` FOREIGN KEY (`id_barang`) REFERENCES `purchasing_barang` (`id_barang`) ON DELETE CASCADE,
  CONSTRAINT `fk_movement_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_movement_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movement_bin` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movement_unit` FOREIGN KEY (`unit_id`) REFERENCES `purchasing_item_units` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_movement_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 6. WAREHOUSE TRANSFERS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_number` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `from_warehouse_id` int NOT NULL,
  `to_warehouse_id` int NOT NULL,
  `from_branch_id` int DEFAULT NULL,
  `to_branch_id` int DEFAULT NULL,
  `transfer_date` date NOT NULL,
  `status` enum('draft','pending','in_transit','received','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'draft',
  `requested_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `shipped_by` int DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transfer_number` (`transfer_number`),
  KEY `idx_from_warehouse` (`from_warehouse_id`),
  KEY `idx_to_warehouse` (`to_warehouse_id`),
  KEY `idx_from_branch` (`from_branch_id`),
  KEY `idx_to_branch` (`to_branch_id`),
  CONSTRAINT `fk_transfer_from` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_transfer_to` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_transfer_from_branch` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transfer_to_branch` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 7. WAREHOUSE TRANSFER ITEMS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_transfer_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_id` int NOT NULL,
  `id_barang` int NOT NULL,
  `unit_id` int DEFAULT NULL,
  `from_rack_id` int DEFAULT NULL,
  `from_bin_id` int DEFAULT NULL,
  `to_rack_id` int DEFAULT NULL,
  `to_bin_id` int DEFAULT NULL,
  `quantity_requested` int NOT NULL,
  `quantity_shipped` int DEFAULT 0,
  `quantity_received` int DEFAULT 0,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transfer` (`transfer_id`),
  KEY `idx_barang` (`id_barang`),
  KEY `idx_unit` (`unit_id`),
  CONSTRAINT `fk_transfer_item_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `warehouse_transfers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transfer_item_barang` FOREIGN KEY (`id_barang`) REFERENCES `purchasing_barang` (`id_barang`) ON DELETE CASCADE,
  CONSTRAINT `fk_transfer_item_unit` FOREIGN KEY (`unit_id`) REFERENCES `purchasing_item_units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- END OF MIGRATION
-- ===================================================
-- NOTED: Tidak ada INSERT data sample
-- Tabel dibuat kosong, data akan diinput melalui aplikasi

SELECT 'Migration completed successfully! Created 7 warehouse tables (no data inserted).' as Status;
