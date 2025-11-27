### Tugas Anda :

1. Pelajari code app saya secara menyeluruh
2. Pastikan seluruh fitur fitur nya dapat berfungsi dengan baik dan pastikan tidak ada error
3. Pada table table pada file @schema.sql pada line 42 - 195 :
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

nah saya ingin pada seluruh table tersebut, menambahkan field :
1. created_by
2. updated_by
3. deleted_at
4. deleted_by

yang dimana akan relasi ke table 'users' kecuali deleted_at, nah untuk menambahkan field dan column tersebut saya ingin membuat sebuah migrations, ini contoh refrensi nya :
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    // Create the connection pool
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Starting payment tracking migration...');
        
        // Get a connection from the pool
        const connection = await pool.getConnection();
        
        try {
            console.log('Creating payments table...');
            // Create payments table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    payment_date DATE NOT NULL,
                    payment_type ENUM('dp', 'cicilan', 'pelunasan') NOT NULL,
                    bukti_transfer VARCHAR(255),
                    status_verifikasi ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                    verified_by INT,
                    verified_at TIMESTAMP NULL,
                    bukti_mutasi VARCHAR(255),
                    catatan TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB;
            `);

            console.log('Adding order_id index...');
            await connection.query(`
                ALTER TABLE payments ADD INDEX idx_payments_order_id (order_id);
            `);

            console.log('Adding status index...');
            await connection.query(`
                ALTER TABLE payments ADD INDEX idx_payments_status (status_verifikasi);
            `);

            console.log('Adding date index...');
            await connection.query(`
                ALTER TABLE payments ADD INDEX idx_payments_date (payment_date);
            `);

            console.log('Payment tracking migration completed successfully');
        } finally {
            // Release the connection back to the pool
            connection.release();
        }
    } catch (error) {
        console.error('Error during migration:', error);
        throw error;
    } finally {
        // Close the pool
        await pool.end();
    }
}

// Run migration
migrate().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});

## jadi nanti tinggal di jalankan saja migrations nya, nah lalu perbaiki serta sesuaikan seluruh fungsi fungsi sistem yang terkait, nah lalu pada fungsi CRUD nya, pada detail modal nya, pastikan menampilkan 'name' yang dimana ambil dari table 'users' sesuai dengan 'created_by', 'updated_by', dan 'deleted_by', coba tolong di analisis lagi, pelajari lagi, cari tahu lagi, perbaiki serta sesuaikan, pastikan sampai benar benar dapat berfungsi dengan baik seluruhnya dan pastikan outputnya benar benar bisa sesuai request


### NOTED :
Jangan sampai menghilangkan, menghapus, dan merusak fungsi fungsi code sebelumnya atau fungsi logic code yang sudah ada, cukup focus untuk memperbaiki dan menyesuaikan hal tersebut saja sampai benar benar bisa berfungsi dengan baik.


## node scripts/migrate-add-audit-fields.js