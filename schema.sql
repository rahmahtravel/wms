
CREATE TABLE `purchasing_incoming` (
  `id_masuk` int NOT NULL,
  `id_barang` int NOT NULL,
  `jumlah` int NOT NULL,
  `tanggal_masuk` date NOT NULL,
  `supplier` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `no_invoice` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `supplier_id` int DEFAULT NULL,
  `warehouse_id` int DEFAULT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


--
ALTER TABLE `purchasing_incoming`
  ADD PRIMARY KEY (`id_masuk`),
  ADD KEY `id_barang` (`id_barang`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_supplier` (`supplier_id`),
  ADD KEY `fk_incoming_warehouse` (`warehouse_id`),
  ADD KEY `fk_incoming_rack` (`rack_id`),
  ADD KEY `fk_incoming_bin` (`bin_id`);
ALTER TABLE `purchasing_incoming`
  MODIFY `id_masuk` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=140;

ALTER TABLE `purchasing_incoming`
  ADD CONSTRAINT `fk_incoming_bin` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_incoming_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_incoming_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `purchasing_suppliers` (`id`),
  ADD CONSTRAINT `purchasing_incoming_ibfk_1` FOREIGN KEY (`id_barang`) REFERENCES `purchasing_barang` (`id_barang`),
  ADD CONSTRAINT `purchasing_incoming_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;




CREATE TABLE `warehouse_locations` (
  `id` int NOT NULL,
  `kode_lokasi` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nama_lokasi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tipe_lokasi` enum('HQ','Branch','Transit') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Branch',
  `alamat` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `telepon` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pic` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `warehouse_locations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_kode_lokasi` (`kode_lokasi`),
  ADD KEY `idx_branch` (`branch_id`);

ALTER TABLE `warehouse_locations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

ALTER TABLE `warehouse_locations`
  ADD CONSTRAINT `fk_warehouse_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL;
COMMIT;


CREATE TABLE `warehouse_racks` (
  `id` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `kode_rak` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nama_rak` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `kapasitas_berat_kg` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
ALTER TABLE `warehouse_racks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_warehouse` (`warehouse_id`);

ALTER TABLE `warehouse_racks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `warehouse_racks`
  ADD CONSTRAINT `fk_rack_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE;
COMMIT;


CREATE TABLE `warehouse_bins` (
  `id` int NOT NULL,
  `rack_id` int NOT NULL,
  `kode_bin` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `nama_bin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `level_posisi` int DEFAULT NULL,
  `kolom_posisi` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `kapasitas_item` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `warehouse_bins`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rack` (`rack_id`);


ALTER TABLE `warehouse_bins`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `warehouse_bins`
  ADD CONSTRAINT `fk_bin_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE CASCADE;
COMMIT;


CREATE TABLE `warehouse_stock` (
  `id` int NOT NULL,
  `id_barang` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `unit_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `reserved_qty` int DEFAULT '0',
  `available_qty` int DEFAULT '0',
  `last_movement_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


ALTER TABLE `warehouse_stock`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_barang` (`id_barang`),
  ADD KEY `idx_warehouse` (`warehouse_id`),
  ADD KEY `idx_rack` (`rack_id`),
  ADD KEY `idx_bin` (`bin_id`),
  ADD KEY `idx_unit` (`unit_id`),
  ADD KEY `idx_branch` (`branch_id`);
ALTER TABLE `warehouse_stock`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;


ALTER TABLE `warehouse_stock`
  ADD CONSTRAINT `fk_stock_barang` FOREIGN KEY (`id_barang`) REFERENCES `purchasing_barang` (`id_barang`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_stock_bin` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_unit` FOREIGN KEY (`unit_id`) REFERENCES `purchasing_item_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stock_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE;
COMMIT;



CREATE TABLE `stock_movements` (
  `id` int NOT NULL,
  `id_barang` int NOT NULL,
  `warehouse_id` int NOT NULL,
  `rack_id` int DEFAULT NULL,
  `bin_id` int DEFAULT NULL,
  `unit_id` int DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `movement_type` enum('IN','OUT','TRANSFER','ADJUSTMENT','OPNAME') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `reference_type` enum('INCOMING','OUTGOING','TRANSFER','ADJUSTMENT','OPNAME') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `reference_id` int DEFAULT NULL,
  `quantity_before` int DEFAULT '0',
  `quantity_change` int NOT NULL,
  `quantity_after` int DEFAULT '0',
  `movement_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_barang` (`id_barang`),
  ADD KEY `idx_warehouse` (`warehouse_id`),
  ADD KEY `idx_rack` (`rack_id`),
  ADD KEY `idx_bin` (`bin_id`),
  ADD KEY `idx_unit` (`unit_id`),
  ADD KEY `idx_branch` (`branch_id`),
  ADD KEY `idx_movement_date` (`movement_date`);

ALTER TABLE `stock_movements`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_movement_barang` FOREIGN KEY (`id_barang`) REFERENCES `purchasing_barang` (`id_barang`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_movement_bin` FOREIGN KEY (`bin_id`) REFERENCES `warehouse_bins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_movement_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_movement_rack` FOREIGN KEY (`rack_id`) REFERENCES `warehouse_racks` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_movement_unit` FOREIGN KEY (`unit_id`) REFERENCES `purchasing_item_units` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_movement_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE CASCADE;
COMMIT;


CREATE TABLE `warehouse_transfers` (
  `id` int NOT NULL,
  `transfer_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `from_warehouse_id` int NOT NULL,
  `to_warehouse_id` int NOT NULL,
  `from_branch_id` int DEFAULT NULL,
  `to_branch_id` int DEFAULT NULL,
  `transfer_date` date NOT NULL,
  `status` enum('draft','pending','in_transit','received','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'draft',
  `requested_by` int DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `shipped_by` int DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `received_at` timestamp NULL DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


ALTER TABLE `warehouse_transfers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_transfer_number` (`transfer_number`),
  ADD KEY `idx_from_warehouse` (`from_warehouse_id`),
  ADD KEY `idx_to_warehouse` (`to_warehouse_id`),
  ADD KEY `idx_from_branch` (`from_branch_id`),
  ADD KEY `idx_to_branch` (`to_branch_id`);

ALTER TABLE `warehouse_transfers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `warehouse_transfers`
  ADD CONSTRAINT `fk_transfer_from` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_transfer_from_branch` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_transfer_to` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse_locations` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_transfer_to_branch` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL;
COMMIT;

CREATE TABLE `warehouse_transfer_items` (
  `id` int NOT NULL,
  `transfer_id` int NOT NULL,
  `id_barang` int NOT NULL,
  `unit_id` int DEFAULT NULL,
  `from_rack_id` int DEFAULT NULL,
  `from_bin_id` int DEFAULT NULL,
  `to_rack_id` int DEFAULT NULL,
  `to_bin_id` int DEFAULT NULL,
  `quantity_requested` int NOT NULL,
  `quantity_shipped` int DEFAULT '0',
  `quantity_received` int DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `warehouse_transfer_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_transfer` (`transfer_id`),
  ADD KEY `idx_barang` (`id_barang`),
  ADD KEY `idx_unit` (`unit_id`);

ALTER TABLE `warehouse_transfer_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

ALTER TABLE `warehouse_transfer_items`
  ADD CONSTRAINT `fk_transfer_item_barang` FOREIGN KEY (`id_barang`) REFERENCES `purchasing_barang` (`id_barang`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transfer_item_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `warehouse_transfers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_transfer_item_unit` FOREIGN KEY (`unit_id`) REFERENCES `purchasing_item_units` (`id`) ON DELETE SET NULL;
COMMIT;