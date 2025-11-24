-- ===================================================
-- MIGRATION: Create All Tables for Rahmah Travel P&L System
-- Database: rgiapp
-- Created: 2024
-- ===================================================

-- Use database
USE rgiapp;

-- ===================================================
-- 1. SUPER ADMIN TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS `super_admin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `whatsapp` varchar(15) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_whatsapp` (`whatsapp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 2. BRANCHES TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 3. USERS TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `whatsapp` varchar(15) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role_name` enum('sales','admin','purchasing','content','jamaah','logistik','superadmin') COLLATE utf8mb4_general_ci NOT NULL,
  `jabatan` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_branch_id` (`branch_id`),
  KEY `idx_whatsapp` (`whatsapp`),
  KEY `idx_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 4. PURCHASING CATEGORIES
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 5. JENIS BARANG
-- ===================================================
CREATE TABLE IF NOT EXISTS `jenis_barang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_jenis` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 6. PURCHASING SUPPLIERS
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `supplier_link` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `items` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 7. PURCHASING BARANG
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_barang` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int DEFAULT NULL,
  `id_jenis_barang` int DEFAULT NULL,
  `kode_barang` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `nama_barang` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `satuan` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `minimal_stock` int DEFAULT 0,
  `is_required` tinyint(1) DEFAULT 0,
  `is_dynamic` tinyint(1) DEFAULT 0,
  `size_type` enum('S','M','L','XL','XXL','NONE') COLLATE utf8mb4_general_ci DEFAULT 'NONE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kode_barang` (`kode_barang`),
  KEY `idx_category` (`category_id`),
  KEY `idx_jenis_barang` (`id_jenis_barang`),
  CONSTRAINT `fk_barang_category` FOREIGN KEY (`category_id`) REFERENCES `purchasing_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_barang_jenis` FOREIGN KEY (`id_jenis_barang`) REFERENCES `jenis_barang` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 8. WAREHOUSE LOCATIONS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kode_lokasi` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `nama_lokasi` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `tipe_lokasi` enum('HQ','Branch','Transit') COLLATE utf8mb4_general_ci DEFAULT 'Branch',
  `alamat` text COLLATE utf8mb4_general_ci,
  `telepon` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pic` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kode_lokasi` (`kode_lokasi`),
  KEY `idx_branch` (`branch_id`),
  CONSTRAINT `fk_warehouse_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 9. WAREHOUSE RACKS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_racks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `warehouse_id` int NOT NULL,
  `kode_rak` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `nama_rak` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `deskripsi` text COLLATE utf8mb4_general_ci,
  `kapasitas_berat_kg` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_rack_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 10. WAREHOUSE BINS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_bins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rack_id` int NOT NULL,
  `kode_bin` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `nama_bin` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `level_posisi` int DEFAULT NULL,
  `kolom_posisi` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `kapasitas_item` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rack` (`rack_id`),
  CONSTRAINT `fk_bin_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 11. PURCHASING ITEM UNITS
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_item_units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `unit_symbol` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 12. WAREHOUSE STOCK
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barang_id` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `quantity` int DEFAULT 0,
  `available_qty` int DEFAULT 0,
  `reserved_qty` int DEFAULT 0,
  `last_movement_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_barang` (`barang_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_rack` (`rack_id`),
  KEY `idx_bin` (`bin_id`),
  KEY `idx_branch` (`branch_id`),
  CONSTRAINT `fk_stock_barang` FOREIGN KEY (`barang_id`) REFERENCES `purchasing_barang` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stock_bin` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_stock_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 13. PURCHASING INCOMING
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_incoming` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barang_id` int NOT NULL,
  `jumlah` int NOT NULL,
  `tanggal_masuk` date NOT NULL,
  `supplier_id` int DEFAULT NULL,
  `no_invoice` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_barang` (`barang_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_incoming_barang` FOREIGN KEY (`barang_id`) REFERENCES `purchasing_barang` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_incoming_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `purchasing_suppliers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_incoming_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 14. PURCHASING BARANG KELUAR
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_barang_keluar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barang_id` int NOT NULL,
  `jumlah` int NOT NULL,
  `tanggal_keluar` date NOT NULL,
  `keterangan` text COLLATE utf8mb4_general_ci,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_barang` (`barang_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_outgoing_barang` FOREIGN KEY (`barang_id`) REFERENCES `purchasing_barang` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_outgoing_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 15. WAREHOUSE TRANSFERS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_transfers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_number` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `from_warehouse_id` int NOT NULL,
  `to_warehouse_id` int NOT NULL,
  `from_branch_id` int DEFAULT NULL,
  `to_branch_id` int DEFAULT NULL,
  `transfer_date` date NOT NULL,
  `status` enum('draft','pending','in_transit','received','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'draft',
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transfer_number` (`transfer_number`),
  KEY `idx_from_warehouse` (`from_warehouse_id`),
  KEY `idx_to_warehouse` (`to_warehouse_id`),
  CONSTRAINT `fk_transfer_from` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transfer_to` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 16. WAREHOUSE TRANSFER ITEMS
-- ===================================================
CREATE TABLE IF NOT EXISTS `warehouse_transfer_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transfer_id` int NOT NULL,
  `barang_id` int NOT NULL,
  `quantity` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transfer` (`transfer_id`),
  KEY `idx_barang` (`barang_id`),
  CONSTRAINT `fk_transfer_item_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `warehouse_transfers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transfer_item_barang` FOREIGN KEY (`barang_id`) REFERENCES `purchasing_barang` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 17. STOCK MOVEMENTS
-- ===================================================
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barang_id` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `movement_type` enum('IN','OUT','TRANSFER','ADJUSTMENT','OPNAME') COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` int NOT NULL,
  `reference_id` int DEFAULT NULL,
  `movement_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `idx_barang` (`barang_id`),
  KEY `idx_warehouse` (`warehouse_id`),
  KEY `idx_movement_date` (`movement_date`),
  CONSTRAINT `fk_movement_barang` FOREIGN KEY (`barang_id`) REFERENCES `purchasing_barang` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_movement_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 18. STOCK OPNAME SESSION
-- ===================================================
CREATE TABLE IF NOT EXISTS `stock_opname_session` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_session` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `warehouse_id` int NOT NULL,
  `branch_id` int DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_general_ci,
  `status` enum('ongoing','completed','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'ongoing',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_opname_session_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 19. STOCK OPNAME
-- ===================================================
CREATE TABLE IF NOT EXISTS `stock_opname` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `barang_id` int NOT NULL,
  `jumlah_fisik` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_session` (`session_id`),
  KEY `idx_barang` (`barang_id`),
  CONSTRAINT `fk_opname_session` FOREIGN KEY (`session_id`) REFERENCES `stock_opname_session` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_opname_barang` FOREIGN KEY (`barang_id`) REFERENCES `purchasing_barang` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 20. PURCHASING REJECTS
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_rejects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `barang_id` int NOT NULL,
  `jumlah` int NOT NULL,
  `tanggal_reject` date NOT NULL,
  `alasan` text COLLATE utf8mb4_general_ci,
  `supplier_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_barang` (`barang_id`),
  KEY `idx_supplier` (`supplier_id`),
  CONSTRAINT `fk_reject_barang` FOREIGN KEY (`barang_id`) REFERENCES `purchasing_barang` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reject_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `purchasing_suppliers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 21. PURCHASING PUBLIC DOCS
-- ===================================================
CREATE TABLE IF NOT EXISTS `purchasing_public_docs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `file_path` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `doc_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 22. REQUEST PERLENGKAPAN
-- ===================================================
CREATE TABLE IF NOT EXISTS `request_perlengkapan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int DEFAULT NULL,
  `items` json DEFAULT NULL,
  `status` enum('pending','confirmed','finished','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `keterangan` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branch` (`branch_id`),
  CONSTRAINT `fk_request_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 23. JAMAAH KELENGKAPAN
-- ===================================================
CREATE TABLE IF NOT EXISTS `jamaah_kelengkapan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kain_ihram_mukena` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `jilbab` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `koper` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tas_paspor` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tas_serut` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `buku_doa` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `jaket` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `syal` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status_pengambilan` enum('pending','diambil','dikirim') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 24. JAMAAH KELENGKAPAN ITEMS
-- ===================================================
CREATE TABLE IF NOT EXISTS `jamaah_kelengkapan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kelengkapan_id` int NOT NULL,
  `item_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` int DEFAULT 1,
  `size` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kelengkapan` (`kelengkapan_id`),
  CONSTRAINT `fk_kelengkapan_items` FOREIGN KEY (`kelengkapan_id`) REFERENCES `jamaah_kelengkapan` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- 25. REKAP ONGKIR (Shipping/Tracking)
-- ===================================================
CREATE TABLE IF NOT EXISTS `rekap_ongkir` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kelengkapan_id` int DEFAULT NULL,
  `status_tracking` enum('pending','processing','shipped','delivered','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `lokasi_terakhir` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kelengkapan` (`kelengkapan_id`),
  CONSTRAINT `fk_rekap_kelengkapan` FOREIGN KEY (`kelengkapan_id`) REFERENCES `jamaah_kelengkapan` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================================================
-- INSERT SAMPLE DATA
-- ===================================================

-- Insert Super Admin (password: admin123)
INSERT INTO `super_admin` (`name`, `whatsapp`, `password`) VALUES
('Super Admin', '081234567890', '$2a$10$YourHashedPasswordHere');

-- Insert Branches
INSERT INTO `branches` (`name`, `address`, `phone`) VALUES
('Kantor Pusat Jakarta', 'Jl. Raya Jakarta No. 123', '021-12345678'),
('Cabang Surabaya', 'Jl. Raya Surabaya No. 456', '031-87654321'),
('Cabang Bandung', 'Jl. Raya Bandung No. 789', '022-11223344');

-- Insert Users (password: user123)
INSERT INTO `users` (`branch_id`, `name`, `whatsapp`, `password`, `role_name`, `jabatan`) VALUES
(1, 'Admin Jakarta', '081234567891', '$2a$10$YourHashedPasswordHere', 'admin', 'Admin Kantor Pusat'),
(2, 'Admin Surabaya', '081234567892', '$2a$10$YourHashedPasswordHere', 'admin', 'Admin Cabang'),
(1, 'Staff Purchasing', '081234567893', '$2a$10$YourHashedPasswordHere', 'purchasing', 'Staff Purchasing'),
(1, 'Staff Logistik', '081234567894', '$2a$10$YourHashedPasswordHere', 'logistik', 'Staff Gudang');

-- Insert Categories
INSERT INTO `purchasing_categories` (`name`) VALUES
('Perlengkapan Umroh'),
('Perlengkapan Haji'),
('Dokumentasi');

-- Insert Jenis Barang
INSERT INTO `jenis_barang` (`nama_jenis`, `deskripsi`) VALUES
('Pakaian', 'Pakaian untuk jamaah'),
('Tas & Koper', 'Tas dan koper untuk perjalanan'),
('Buku & Dokumentasi', 'Buku panduan dan dokumentasi'),
('Aksesoris', 'Aksesoris tambahan'),
('Perlengkapan Ibadah', 'Perlengkapan untuk ibadah');

-- Insert Suppliers
INSERT INTO `purchasing_suppliers` (`name`, `phone`, `supplier_link`, `items`) VALUES
('CV. Berkah Jaya', '021-98765432', 'https://berkahjaya.com', 'Kain Ihram, Mukena, Jilbab'),
('PT. Travel Goods', '021-11112222', 'https://travelgoods.com', 'Koper, Tas Paspor, Tas Serut'),
('Toko Buku Islami', '021-33334444', 'https://bukuislami.com', 'Buku Doa, Buku Panduan');

-- ===================================================
-- END OF MIGRATION
-- ===================================================
