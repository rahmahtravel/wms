# 🔧 Panduan Refactoring & Perbaikan Aplikasi Purchasing-Logistics

**Tanggal Dibuat:** 21 November 2025  
**Status:** Dokumen Aktif  
**Tujuan:** Panduan lengkap untuk AI Assistant dan Developer dalam melakukan refactoring dan perbaikan aplikasi

---

## 📖 CARA MENGGUNAKAN DOKUMEN INI

### Untuk AI Assistant (GitHub Copilot / Claude / ChatGPT):
```
Ketika diminta untuk memperbaiki atau refactor aplikasi ini:
1. BACA dokumen ini dari awal sampai akhir
2. PAHAMI konteks aplikasi dan masalah yang ada
3. IKUTI standar dan pola yang sudah ditetapkan
4. GUNAKAN checklist kualitas sebelum menyelesaikan task
5. JANGAN pernah menghapus atau merusak fungsi yang sudah bekerja
```

### Untuk Developer:
```
Dokumen ini berisi:
- Analisis masalah aplikasi saat ini
- Solusi terstruktur untuk setiap masalah
- Contoh kode yang siap digunakan
- Checklist untuk memastikan kualitas
- Best practices yang harus diikuti
```

---

## 🎯 OBJEKTIF UTAMA REFACTORING

### Tujuan Yang Harus Dicapai:

1. **KONSISTENSI PENAMAAN KOLOM**
   - Semua nama kolom database menggunakan Bahasa Indonesia
   - Tidak ada lagi nama kolom campuran (English-Indonesian)
   - Tidak perlu workaround function untuk menangani inkonsistensi

2. **SISTEM STOCK YANG AKURAT**
   - Stock di `warehouse_stock` selalu sinkron dengan `stock_movements`
   - Stock di `purchasing_barang.stock_akhir` selalu sinkron dengan total dari semua `warehouse_stock`
   - Semua operasi stock menggunakan database transaction untuk menjamin data integrity

3. **INTERFACE YANG LENGKAP & KONSISTEN**
   - Semua halaman menggunakan modal-based CRUD (bukan redirect ke halaman baru)
   - Semua form menggunakan AJAX submission dengan SweetAlert2 untuk feedback
   - Cascade dropdown yang bekerja dengan baik (Warehouse → Rack → Bin, dll)
   - Tidak ada lagi halaman placeholder "Fitur segera hadir..."

4. **KEAMANAN & VALIDASI**
   - Server-side validation menggunakan express-validator
   - Database transaction untuk semua operasi critical
   - Error handling yang proper dengan rollback mechanism
   - Prevent SQL injection dengan parameterized queries

5. **CODE QUALITY**
   - Kode yang mudah dibaca dan di-maintain
   - Komentar dalam Bahasa Indonesia untuk logic yang kompleks
   - Tidak ada console.log di production code
   - DRY principle (Don't Repeat Yourself)

---

## 🔍 ANALISIS MASALAH APLIKASI SAAT INI

### ❌ MASALAH KRITIS (Harus Diperbaiki Segera):

#### 1. Inkonsistensi Nama Kolom Database

**Masalah:**
```javascript
// Database schema menggunakan English:
- location_code, location_name, location_type
- rack_code, rack_name
- bin_code, bin_name

// Tetapi kode aplikasi mencoba menggunakan Indonesian:
- kode_lokasi, nama_lokasi, tipe_lokasi
- kode_rak, nama_rak
- kode_bin, nama_bin

// Ini menyebabkan error dan memerlukan workaround di lib/dbUtils.js
```

**Dampak:**
- Error saat query database
- Code menjadi kompleks dengan workaround function
- Developer bingung kolom mana yang benar
- Maintenance menjadi sulit

**Solusi:**
- Buat migration untuk rename semua kolom ke Bahasa Indonesia
- Update semua query di routes untuk menggunakan nama kolom baru
- Update semua view (EJS) untuk menggunakan nama kolom baru
- Hapus file `lib/dbUtils.js` yang tidak diperlukan lagi

#### 2. Stock Tidak Tersinkronisasi

**Masalah:**
```javascript
// Setiap kali ada barang masuk/keluar, developer harus manual:
// 1. Update warehouse_stock
// 2. Update purchasing_barang.stock_akhir
// 3. Insert ke stock_movements

// Ini rawan error karena:
// - Lupa update salah satu tabel
// - Tidak menggunakan transaction (bisa data inconsistent)
// - Logic tersebar di berbagai file
```

**Dampak:**
- Stock tidak akurat
- Laporan stock salah
- Bisnis tidak bisa mengandalkan data
- Kehilangan barang tidak terdeteksi

**Solusi:**
- Buat centralized `lib/stockHelper.js` dengan functions:
  - `updateWarehouseStock()` - Auto calculate dari movements
  - `updateGlobalStock()` - Auto sum dari semua warehouse
  - `recordIncomingStock()` - Handle barang masuk dengan transaction
  - `recordOutgoingStock()` - Handle barang keluar dengan validation
  - `transferStock()` - Handle transfer antar warehouse
  - `validateStockAvailability()` - Cek stock sebelum transaksi

#### 3. Halaman Placeholder (Belum Lengkap)

**Masalah:**
```html
<!-- views/incoming/index.ejs -->
<p class="text-gray-600">Fitur barang masuk segera hadir...</p>

<!-- views/outgoing/index.ejs -->
<p class="text-gray-600">Fitur barang keluar segera hadir...</p>

<!-- views/transfer/index.ejs -->
<p class="text-gray-600">Fitur transfer barang segera hadir...</p>

<!-- views/opname/index.ejs -->
<p class="text-gray-600">Fitur stock opname segera hadir...</p>
```

**Dampak:**
- Aplikasi tidak bisa digunakan untuk operasional
- User frustasi karena fitur penting tidak ada
- Backend route sudah ada tapi tidak ada UI

**Solusi:**
- Implement complete modal-based CRUD untuk setiap module
- Gunakan pattern yang sama dengan warehouse module (yang sudah bekerja)
- Tambahkan cascade dropdown dan real-time validation

---

## 🛠️ SOLUSI TERSTRUKTUR

### FASE 1: PERBAIKAN FUNDAMENTAL (PRIORITAS TINGGI)

#### Task 1.1: Standardisasi Nama Kolom ke Bahasa Indonesia

**Langkah-Langkah Eksekusi:**

1. **Buat Migration File**
   ```sql
   -- File: migrations/004_standardize_to_indonesian_columns.sql
   
   -- WAREHOUSE LOCATIONS
   ALTER TABLE warehouse_locations
     CHANGE COLUMN location_code kode_lokasi VARCHAR(50) NOT NULL,
     CHANGE COLUMN location_name nama_lokasi VARCHAR(255) NOT NULL,
     CHANGE COLUMN location_type tipe_lokasi ENUM('HQ','BRANCH','TRANSIT') DEFAULT 'BRANCH',
     CHANGE COLUMN address alamat TEXT,
     CHANGE COLUMN phone telepon VARCHAR(50),
     CHANGE COLUMN pic_name pic VARCHAR(255),
     CHANGE COLUMN pic_phone telepon_pic VARCHAR(50);

   -- WAREHOUSE RACKS
   ALTER TABLE warehouse_racks
     CHANGE COLUMN rack_code kode_rak VARCHAR(50) NOT NULL,
     CHANGE COLUMN rack_name nama_rak VARCHAR(255) NOT NULL,
     CHANGE COLUMN description deskripsi TEXT,
     CHANGE COLUMN capacity_weight kapasitas_berat DECIMAL(10,2);

   -- WAREHOUSE BINS
   ALTER TABLE warehouse_bins
     CHANGE COLUMN bin_code kode_bin VARCHAR(50) NOT NULL,
     CHANGE COLUMN bin_name nama_bin VARCHAR(255) NOT NULL,
     CHANGE COLUMN position_level level_posisi INT,
     CHANGE COLUMN position_column kolom_posisi CHAR(1),
     CHANGE COLUMN capacity_items kapasitas_items INT;

   -- BRANCHES
   ALTER TABLE branches
     CHANGE COLUMN name nama_cabang VARCHAR(255) NOT NULL,
     CHANGE COLUMN address alamat TEXT,
     CHANGE COLUMN phone telepon VARCHAR(50);

   -- SUPPLIERS
   ALTER TABLE purchasing_suppliers
     CHANGE COLUMN name nama_supplier VARCHAR(255) NOT NULL,
     CHANGE COLUMN phone telepon VARCHAR(50),
     CHANGE COLUMN supplier_link link_supplier VARCHAR(500),
     CHANGE COLUMN items barang TEXT;

   -- CATEGORIES
   ALTER TABLE purchasing_categories
     CHANGE COLUMN name nama_kategori VARCHAR(255) NOT NULL;
   ```

2. **Buat Migration Script**
   ```javascript
   // File: scripts/migrate-004.js
   const mysql = require('mysql2/promise');
   const fs = require('fs');
   const path = require('path');
   require('dotenv').config();

   async function runMigration() {
     let connection;
     
     try {
       console.log('🔄 Starting migration 004: Standardize to Indonesian columns');
       
       connection = await mysql.createConnection({
         host: process.env.DB_HOST || 'localhost',
         user: process.env.DB_USER || 'root',
         password: process.env.DB_PASS || '',
         database: process.env.DB_NAME || 'rgiapp',
         multipleStatements: true
       });

       console.log('✅ Connected to database:', process.env.DB_NAME);
       
       const migrationFile = path.join(__dirname, '../migrations/004_standardize_to_indonesian_columns.sql');
       const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
       
       console.log('\n⚠️  WARNING: This will rename columns in 6 tables!');
       console.log('⚠️  Make sure you have a backup before proceeding!\n');
       
       const statements = migrationSQL
         .split(';')
         .map(s => s.trim())
         .filter(s => s && !s.startsWith('--'));
       
       for (let i = 0; i < statements.length; i++) {
         const stmt = statements[i];
         if (stmt) {
           try {
             await connection.query(stmt);
             console.log(`✅ [${i + 1}/${statements.length}] Statement executed`);
           } catch (err) {
             if (err.code === 'ER_BAD_FIELD_ERROR') {
               console.log(`⚠️  [${i + 1}/${statements.length}] Column already renamed, skipping...`);
             } else {
               throw err;
             }
           }
         }
       }
       
       console.log('\n✅ Migration completed successfully!');
       console.log('\n📝 Next steps:');
       console.log('   1. Update routes/warehouse.js');
       console.log('   2. Update all view files');
       console.log('   3. Remove lib/dbUtils.js');
       console.log('   4. Test all CRUD operations\n');
       
     } catch (error) {
       console.error('\n❌ Migration failed:', error.message);
       process.exit(1);
     } finally {
       if (connection) {
         await connection.end();
         console.log('✅ Database connection closed\n');
       }
     }
   }

   runMigration();
   ```

3. **Update Routes File**
   ```javascript
   // File: routes/warehouse.js
   
   // BEFORE (dengan workaround):
   const { hasColumn, pickColumn } = require('../lib/dbUtils');
   const wrField = await pickColumn('warehouse_racks', ['rack_name','nama_rak']) || 'nama_rak';
   const [racks] = await db.query(`SELECT wr.*, wl.${wrField} as rack_name ...`);
   
   // AFTER (direct, clean, no workaround):
   const [racks] = await db.query(`
     SELECT wr.*, wl.nama_lokasi
     FROM warehouse_racks wr
     LEFT JOIN warehouse_locations wl ON wr.warehouse_id = wl.id
     WHERE wr.is_active = 1
     ORDER BY wr.created_at DESC
   `);
   ```

4. **Update View Files**
   ```html
   <!-- BEFORE -->
   <td><%= rack.rack_name %></td>
   <td><%= rack.location_name %></td>
   <input type="text" name="rack_code" id="rack_code">
   
   <!-- AFTER -->
   <td><%= rack.nama_rak %></td>
   <td><%= rack.nama_lokasi %></td>
   <input type="text" name="kode_rak" id="kode_rak">
   ```

5. **Hapus Workaround File**
   ```bash
   # Delete file lib/dbUtils.js (tidak diperlukan lagi)
   ```

**Checklist Sebelum Selesai:**
- [ ] Migration script berhasil dijalankan tanpa error
- [ ] Semua query di routes menggunakan nama kolom Indonesian
- [ ] Semua form input menggunakan name attribute Indonesian
- [ ] Semua tampilan data menggunakan nama kolom Indonesian
- [ ] File lib/dbUtils.js sudah dihapus
- [ ] Test CRUD operations: Create, Read, Update, Delete berhasil
- [ ] Tidak ada error di browser console
- [ ] Tidak ada error di server log

---

#### Task 1.2: Buat Stock Helper Module

**Tujuan:**
Centralize semua logic stock management dalam satu module yang reusable dan reliable.

**File Yang Dibuat:**
```javascript
// File: lib/stockHelper.js

const db = require('../config/database');

/**
 * UPDATE WAREHOUSE STOCK
 * 
 * Fungsi ini menghitung ulang stock di warehouse_stock berdasarkan
 * semua transaksi di stock_movements (IN - OUT).
 * 
 * Contoh penggunaan:
 *   const result = await updateWarehouseStock(connection, 10, 5);
 *   console.log('New stock:', result.newStock);
 * 
 * @param {Connection} connection - MySQL connection object (untuk transaction)
 * @param {number} barangId - ID barang yang akan di-update
 * @param {number} warehouseId - ID warehouse yang akan di-update
 * @returns {Promise<{success: boolean, newStock: number}>}
 */
async function updateWarehouseStock(connection, barangId, warehouseId) {
  try {
    // Step 1: Hitung total IN dan OUT dari stock_movements
    const [movements] = await connection.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END), 0) as total_out
      FROM stock_movements
      WHERE barang_id = ? AND warehouse_id = ?
    `, [barangId, warehouseId]);

    const currentStock = movements[0].total_in - movements[0].total_out;

    // Step 2: Check apakah record sudah ada
    const [existing] = await connection.query(`
      SELECT id FROM warehouse_stock 
      WHERE barang_id = ? AND warehouse_id = ?
    `, [barangId, warehouseId]);

    // Step 3: Update atau Insert
    if (existing.length > 0) {
      await connection.query(`
        UPDATE warehouse_stock 
        SET quantity = ?, updated_at = NOW()
        WHERE barang_id = ? AND warehouse_id = ?
      `, [currentStock, barangId, warehouseId]);
    } else {
      await connection.query(`
        INSERT INTO warehouse_stock (barang_id, warehouse_id, quantity, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `, [barangId, warehouseId, currentStock]);
    }

    return { success: true, newStock: currentStock };
  } catch (error) {
    console.error('❌ Error in updateWarehouseStock:', error);
    throw error;
  }
}

/**
 * UPDATE GLOBAL STOCK
 * 
 * Fungsi ini menghitung total stock dari SEMUA warehouse
 * dan update ke purchasing_barang.stock_akhir
 * 
 * @param {Connection} connection - MySQL connection object
 * @param {number} barangId - ID barang yang akan di-update
 * @returns {Promise<{success: boolean, newGlobalStock: number}>}
 */
async function updateGlobalStock(connection, barangId) {
  try {
    // Step 1: Sum stock dari semua warehouse
    const [result] = await connection.query(`
      SELECT COALESCE(SUM(quantity), 0) as total_stock
      FROM warehouse_stock
      WHERE barang_id = ?
    `, [barangId]);

    const totalStock = result[0].total_stock;

    // Step 2: Update stock_akhir di purchasing_barang
    await connection.query(`
      UPDATE purchasing_barang 
      SET stock_akhir = ?, updated_at = NOW()
      WHERE id_barang = ?
    `, [totalStock, barangId]);

    return { success: true, newGlobalStock: totalStock };
  } catch (error) {
    console.error('❌ Error in updateGlobalStock:', error);
    throw error;
  }
}

/**
 * VALIDATE STOCK AVAILABILITY
 * 
 * Cek apakah stock mencukupi sebelum melakukan transaksi keluar
 * 
 * @param {Connection} connection - MySQL connection object
 * @param {number} barangId - ID barang
 * @param {number} warehouseId - ID warehouse
 * @param {number} requiredQuantity - Jumlah yang dibutuhkan
 * @returns {Promise<{available: boolean, currentStock: number, message: string}>}
 */
async function validateStockAvailability(connection, barangId, warehouseId, requiredQuantity) {
  try {
    const [stockData] = await connection.query(`
      SELECT quantity FROM warehouse_stock
      WHERE barang_id = ? AND warehouse_id = ?
    `, [barangId, warehouseId]);

    const currentStock = stockData.length > 0 ? stockData[0].quantity : 0;

    if (currentStock >= requiredQuantity) {
      return {
        available: true,
        currentStock: currentStock,
        message: 'Stock tersedia'
      };
    } else {
      return {
        available: false,
        currentStock: currentStock,
        message: `Stock tidak mencukupi. Tersedia: ${currentStock}, Dibutuhkan: ${requiredQuantity}`
      };
    }
  } catch (error) {
    console.error('❌ Error in validateStockAvailability:', error);
    throw error;
  }
}

/**
 * RECORD INCOMING STOCK
 * 
 * Helper function untuk mencatat barang masuk dengan automatic stock update
 * 
 * @param {Connection} connection - MySQL connection (harus dalam transaction)
 * @param {object} data - {barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes}
 * @returns {Promise<{success: boolean, movementId: number}>}
 */
async function recordIncomingStock(connection, data) {
  const { barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes } = data;

  try {
    // Step 1: Insert movement record
    const [movementResult] = await connection.query(`
      INSERT INTO stock_movements 
      (barang_id, warehouse_id, rack_id, bin_id, movement_type, quantity, 
       reference_type, reference_id, notes, created_at)
      VALUES (?, ?, ?, ?, 'IN', ?, ?, ?, ?, NOW())
    `, [barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes]);

    // Step 2: Update warehouse stock
    await updateWarehouseStock(connection, barangId, warehouseId);

    // Step 3: Update global stock
    await updateGlobalStock(connection, barangId);

    return { success: true, movementId: movementResult.insertId };
  } catch (error) {
    console.error('❌ Error in recordIncomingStock:', error);
    throw error;
  }
}

/**
 * RECORD OUTGOING STOCK
 * 
 * Helper function untuk mencatat barang keluar dengan validation
 * 
 * @param {Connection} connection - MySQL connection (harus dalam transaction)
 * @param {object} data - {barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes}
 * @returns {Promise<{success: boolean, movementId: number}>}
 */
async function recordOutgoingStock(connection, data) {
  const { barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes } = data;

  try {
    // Step 1: Validate stock availability
    const validation = await validateStockAvailability(connection, barangId, warehouseId, quantity);
    if (!validation.available) {
      throw new Error(validation.message);
    }

    // Step 2: Insert movement record
    const [movementResult] = await connection.query(`
      INSERT INTO stock_movements 
      (barang_id, warehouse_id, rack_id, bin_id, movement_type, quantity, 
       reference_type, reference_id, notes, created_at)
      VALUES (?, ?, ?, ?, 'OUT', ?, ?, ?, ?, NOW())
    `, [barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes]);

    // Step 3: Update warehouse stock
    await updateWarehouseStock(connection, barangId, warehouseId);

    // Step 4: Update global stock
    await updateGlobalStock(connection, barangId);

    return { success: true, movementId: movementResult.insertId };
  } catch (error) {
    console.error('❌ Error in recordOutgoingStock:', error);
    throw error;
  }
}

/**
 * TRANSFER STOCK BETWEEN WAREHOUSES
 * 
 * Transfer stock dari warehouse satu ke warehouse lain dengan atomic transaction
 * 
 * @param {Connection} connection - MySQL connection (harus dalam transaction)
 * @param {object} transferData - {barangId, sourceWarehouseId, destinationWarehouseId, quantity, notes, userId}
 * @returns {Promise<{success: boolean, transferId: number}>}
 */
async function transferStock(connection, transferData) {
  const { barangId, sourceWarehouseId, destinationWarehouseId, quantity, notes, userId } = transferData;

  try {
    // Step 1: Validate source stock
    const validation = await validateStockAvailability(connection, barangId, sourceWarehouseId, quantity);
    if (!validation.available) {
      throw new Error(`Transfer gagal. ${validation.message}`);
    }

    // Step 2: Create transfer record
    const [transferResult] = await connection.query(`
      INSERT INTO stock_transfers 
      (barang_id, from_warehouse_id, to_warehouse_id, quantity, notes, status, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())
    `, [barangId, sourceWarehouseId, destinationWarehouseId, quantity, notes, userId]);

    const transferId = transferResult.insertId;

    // Step 3: Record OUT movement dari source
    await connection.query(`
      INSERT INTO stock_movements 
      (barang_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
      VALUES (?, ?, 'OUT', ?, 'transfer_out', ?, ?, NOW())
    `, [barangId, sourceWarehouseId, quantity, transferId, notes]);

    // Step 4: Record IN movement ke destination
    await connection.query(`
      INSERT INTO stock_movements 
      (barang_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
      VALUES (?, ?, 'IN', ?, 'transfer_in', ?, ?, NOW())
    `, [barangId, destinationWarehouseId, quantity, transferId, notes]);

    // Step 5: Update stock di kedua warehouse
    await updateWarehouseStock(connection, barangId, sourceWarehouseId);
    await updateWarehouseStock(connection, barangId, destinationWarehouseId);

    // Step 6: Update global stock
    await updateGlobalStock(connection, barangId);

    // Step 7: Update transfer status
    await connection.query(`
      UPDATE stock_transfers 
      SET status = 'completed', completed_at = NOW()
      WHERE id = ?
    `, [transferId]);

    return { success: true, transferId };
  } catch (error) {
    console.error('❌ Error in transferStock:', error);
    throw error;
  }
}

/**
 * GET STOCK SUMMARY
 * 
 * Mendapatkan summary stock untuk dashboard atau reports
 * 
 * @param {number|null} barangId - Filter by barang (optional)
 * @param {number|null} warehouseId - Filter by warehouse (optional)
 * @returns {Promise<Array>} Array of stock summary
 */
async function getStockSummary(barangId = null, warehouseId = null) {
  try {
    let query = `
      SELECT 
        ws.barang_id,
        pb.kode_barang,
        pb.nama_barang,
        ws.warehouse_id,
        wl.nama_lokasi as warehouse_name,
        ws.quantity as current_stock,
        pb.stock_minimal as min_stock,
        pb.satuan,
        CASE 
          WHEN ws.quantity <= pb.stock_minimal THEN 'low'
          WHEN ws.quantity <= (pb.stock_minimal * 1.5) THEN 'medium'
          ELSE 'good'
        END as stock_status,
        ws.updated_at
      FROM warehouse_stock ws
      JOIN purchasing_barang pb ON ws.barang_id = pb.id_barang
      JOIN warehouse_locations wl ON ws.warehouse_id = wl.id
      WHERE 1=1
    `;

    const params = [];

    if (barangId) {
      query += ' AND ws.barang_id = ?';
      params.push(barangId);
    }

    if (warehouseId) {
      query += ' AND ws.warehouse_id = ?';
      params.push(warehouseId);
    }

    query += ' ORDER BY pb.nama_barang, wl.nama_lokasi';

    const [results] = await db.query(query, params);
    return results;
  } catch (error) {
    console.error('❌ Error in getStockSummary:', error);
    throw error;
  }
}

// Export semua functions
module.exports = {
  updateWarehouseStock,
  updateGlobalStock,
  validateStockAvailability,
  recordIncomingStock,
  recordOutgoingStock,
  transferStock,
  getStockSummary
};
```

**Cara Menggunakan Stock Helper:**

```javascript
// Di routes/incoming.js
const { recordIncomingStock } = require('../lib/stockHelper');

router.post('/create', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Insert incoming record
    const [incomingResult] = await connection.query(`
      INSERT INTO purchasing_incoming (...) VALUES (...)
    `, [...]);
    
    // Update stock menggunakan helper (automatic!)
    await recordIncomingStock(connection, {
      barangId: req.body.barang_id,
      warehouseId: req.body.warehouse_id,
      rackId: req.body.rack_id,
      binId: req.body.bin_id,
      quantity: req.body.quantity,
      referenceType: 'incoming',
      referenceId: incomingResult.insertId,
      notes: req.body.catatan
    });
    
    await connection.commit();
    res.json({ success: true });
    
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});
```

**Checklist Sebelum Selesai:**
- [ ] File lib/stockHelper.js sudah dibuat dengan semua 7 functions
- [ ] Setiap function memiliki JSDoc comment yang jelas
- [ ] Test manual: incoming stock → warehouse_stock updated → global stock updated
- [ ] Test manual: outgoing stock → validation bekerja → stock berkurang
- [ ] Test manual: transfer stock → source berkurang → destination bertambah
- [ ] Error handling dengan try-catch di setiap function
- [ ] Console.log untuk debugging sudah dihapus

---

### FASE 2: IMPLEMENTASI MODULE LENGKAP

#### Task 2.1: Complete Incoming Goods Module

**Pattern Yang Harus Diikuti:**

1. **Backend (routes/incoming.js):**
```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { recordIncomingStock } = require('../lib/stockHelper');

// List all incoming
router.get('/', async (req, res) => {
  try {
    const [incoming] = await db.query(`
      SELECT pi.*, 
        pb.kode_barang, pb.nama_barang, pb.satuan,
        ps.nama_supplier,
        wl.nama_lokasi,
        wr.nama_rak,
        wb.nama_bin
      FROM purchasing_incoming pi
      LEFT JOIN purchasing_barang pb ON pi.barang_id = pb.id_barang
      LEFT JOIN purchasing_suppliers ps ON pi.supplier_id = ps.id
      LEFT JOIN warehouse_locations wl ON pi.warehouse_id = wl.id
      LEFT JOIN warehouse_racks wr ON pi.rack_id = wr.id
      LEFT JOIN warehouse_bins wb ON pi.bin_id = wb.id
      ORDER BY pi.tanggal_masuk DESC
    `);

    const [suppliers] = await db.query('SELECT * FROM purchasing_suppliers ORDER BY nama_supplier');
    const [barang] = await db.query('SELECT * FROM purchasing_barang ORDER BY nama_barang');
    const [warehouses] = await db.query('SELECT * FROM warehouse_locations WHERE is_active = 1');

    res.render('incoming/index', { 
      title: 'Barang Masuk', 
      incoming, 
      suppliers,
      barang,
      warehouses,
      body: '' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data for edit
router.get('/:id/data', async (req, res) => {
  try {
    const [incoming] = await db.query('SELECT * FROM purchasing_incoming WHERE id = ?', [req.params.id]);
    res.json(incoming[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create incoming
router.post('/create', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      supplier_id, barang_id, quantity, harga_satuan, 
      warehouse_id, rack_id, bin_id, 
      tanggal_masuk, no_invoice, tanggal_kadaluarsa, catatan 
    } = req.body;

    const total_harga = parseFloat(quantity) * parseFloat(harga_satuan);
    
    // Insert incoming record
    const [incomingResult] = await connection.query(`
      INSERT INTO purchasing_incoming 
      (supplier_id, barang_id, quantity, harga_satuan, total_harga, 
       warehouse_id, rack_id, bin_id, tanggal_masuk, no_invoice, 
       tanggal_kadaluarsa, catatan, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', NOW())
    `, [supplier_id, barang_id, quantity, harga_satuan, total_harga,
        warehouse_id, rack_id, bin_id, tanggal_masuk, no_invoice,
        tanggal_kadaluarsa, catatan]);

    // Record stock movement (automatic stock update)
    await recordIncomingStock(connection, {
      barangId: barang_id,
      warehouseId: warehouse_id,
      rackId: rack_id,
      binId: bin_id,
      quantity: quantity,
      referenceType: 'incoming',
      referenceId: incomingResult.insertId,
      notes: catatan || `Barang masuk dari ${no_invoice}`
    });

    await connection.commit();
    
    const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
    if (isAjax) {
      return res.json({ success: true, message: 'Barang masuk berhasil disimpan' });
    }
    res.redirect('/incoming');
    
  } catch (error) {
    await connection.rollback();
    console.error('Error creating incoming:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update incoming
router.post('/update/:id', async (req, res) => {
  try {
    const { 
      supplier_id, barang_id, quantity, harga_satuan,
      warehouse_id, rack_id, bin_id,
      tanggal_masuk, no_invoice, tanggal_kadaluarsa, catatan
    } = req.body;

    const total_harga = parseFloat(quantity) * parseFloat(harga_satuan);

    await db.query(`
      UPDATE purchasing_incoming 
      SET supplier_id = ?, barang_id = ?, quantity = ?, harga_satuan = ?, total_harga = ?,
          warehouse_id = ?, rack_id = ?, bin_id = ?,
          tanggal_masuk = ?, no_invoice = ?, tanggal_kadaluarsa = ?, catatan = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [supplier_id, barang_id, quantity, harga_satuan, total_harga,
        warehouse_id, rack_id, bin_id, tanggal_masuk, no_invoice,
        tanggal_kadaluarsa, catatan, req.params.id]);

    const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
    if (isAjax) {
      return res.json({ success: true, message: 'Data berhasil diupdate' });
    }
    res.redirect('/incoming');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete incoming
router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_incoming WHERE id = ?', [req.params.id]);
    
    const isAjax = req.headers.accept && req.headers.accept.includes('application/json');
    if (isAjax) {
      return res.json({ success: true, message: 'Data berhasil dihapus' });
    }
    res.redirect('/incoming');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get racks by warehouse
router.get('/api/warehouses/:id/racks', async (req, res) => {
  try {
    const [racks] = await db.query(`
      SELECT * FROM warehouse_racks 
      WHERE warehouse_id = ? AND is_active = 1
      ORDER BY nama_rak
    `, [req.params.id]);
    res.json(racks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get bins by rack
router.get('/api/racks/:id/bins', async (req, res) => {
  try {
    const [bins] = await db.query(`
      SELECT * FROM warehouse_bins 
      WHERE rack_id = ? AND is_active = 1
      ORDER BY nama_bin
    `, [req.params.id]);
    res.json(bins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

2. **Frontend (views/incoming/index.ejs):**
- Modal form dengan semua fields yang diperlukan
- Cascade dropdown: Warehouse → Rack → Bin
- Auto-calculate total_harga
- AJAX submission dengan `data-ajax="true"`
- SweetAlert2 untuk semua feedback
- Responsive table dengan search functionality

**Lihat file DEVELOPMENT-GUIDE.md untuk complete example.**

**Checklist Sebelum Selesai:**
- [ ] Modal form muncul dengan benar
- [ ] Cascade dropdown bekerja (warehouse → rack → bin)
- [ ] Form submission via AJAX berhasil
- [ ] SweetAlert2 muncul untuk sukses/error
- [ ] Data muncul di table setelah submit
- [ ] Edit modal terisi data dengan benar
- [ ] Delete dengan confirmation bekerja
- [ ] Search functionality bekerja
- [ ] Responsive di mobile device
- [ ] Stock terupdate setelah create

---

## ✅ CHECKLIST KUALITAS UNTUK SETIAP TASK

### Code Quality:
- [ ] Kode mudah dibaca (variable name yang jelas)
- [ ] Komentar dalam Bahasa Indonesia untuk logic kompleks
- [ ] Tidak ada hardcoded values (gunakan variable/constant)
- [ ] DRY principle - tidak ada code duplikat
- [ ] Consistent indentation (2 spaces atau 4 spaces)

### Functionality:
- [ ] Feature bekerja sesuai requirement
- [ ] Edge cases sudah dihandle (empty data, null values, etc)
- [ ] Loading states ditampilkan (spinner, disabled button)
- [ ] Success/error messages jelas dan informatif

### Security:
- [ ] Semua queries menggunakan parameterized query (?, bukan string concat)
- [ ] Input validation di server side (express-validator)
- [ ] Error messages tidak expose sensitive information
- [ ] Authentication check untuk protected routes

### Database:
- [ ] Menggunakan transaction untuk multi-step operations
- [ ] Rollback jika ada error di tengah transaction
- [ ] Connection.release() dipanggil di finally block
- [ ] Indexes ada untuk columns yang sering di-query

### User Experience:
- [ ] Modal muncul dan menutup dengan smooth
- [ ] Form validation memberikan feedback yang jelas
- [ ] SweetAlert2 digunakan untuk semua confirmations
- [ ] Responsive design bekerja di mobile
- [ ] Loading indicators saat proses async

### Testing:
- [ ] Manual test: Create new record
- [ ] Manual test: Edit existing record
- [ ] Manual test: Delete record
- [ ] Manual test: Search functionality
- [ ] Manual test: Cascade dropdown
- [ ] Check browser console for errors
- [ ] Check server log for errors
- [ ] Test dengan data edge case (0 quantity, very long text, etc)

---

## 🚀 WORKFLOW DEVELOPMENT

### Langkah-langkah Untuk Setiap Task:

1. **PAHAMI REQUIREMENT**
   - Baca task description dengan teliti
   - Lihat contoh code yang sudah ada (misal: warehouse module)
   - Identifikasi files yang perlu dimodifikasi

2. **ANALISIS EXISTING CODE**
   - Check current implementation
   - Identifikasi masalah yang ada
   - Tentukan approach terbaik

3. **IMPLEMENTASI**
   - Mulai dari backend (routes) dulu
   - Test dengan Postman/curl sebelum buat frontend
   - Baru implement frontend (views)
   - Test integration

4. **TESTING**
   - Test happy path (normal flow)
   - Test edge cases
   - Test error scenarios
   - Test di berbagai browser jika perlu

5. **CODE REVIEW**
   - Review sendiri menggunakan checklist
   - Pastikan semua checklist tercentang
   - Refactor jika ada code yang kurang bagus

6. **DOCUMENTATION**
   - Update IMPLEMENTATION-PLAN.md
   - Tambahkan komentar untuk code yang kompleks
   - Update API documentation jika ada endpoint baru

---

## 📚 RESOURCES & REFERENCES

### Dokumentasi Yang Harus Dibaca:
1. **DEVELOPMENT-GUIDE.md** - Complete code examples
2. **purchasing-logistics-context.md** - Database schema & business logic
3. **API_DOCUMENTATION.md** - API endpoints reference

### Libraries Yang Digunakan:
- **mysql2** - Database driver dengan promise support
- **express** - Web framework
- **express-validator** - Server-side validation
- **ejs** - Template engine
- **Tailwind CSS** - CSS framework (via CDN)
- **SweetAlert2** - Beautiful alerts
- **Font Awesome** - Icons

### Best Practices:
- **SOLID Principles** untuk architecture
- **RESTful API** untuk endpoints
- **MVC Pattern** untuk structure
- **Transaction Management** untuk data integrity
- **Error Handling** dengan try-catch
- **Async/Await** untuk asynchronous operations

---

## ⚠️ PENTING - YANG TIDAK BOLEH DILAKUKAN

### ❌ JANGAN:

1. **JANGAN menghapus atau memodifikasi code yang sudah bekerja** tanpa reason yang jelas
2. **JANGAN hardcode values** - gunakan variables atau environment variables
3. **JANGAN menggunakan var** - gunakan const atau let
4. **JANGAN lupa connection.release()** - akan menyebabkan connection leak
5. **JANGAN string concatenation untuk SQL** - gunakan parameterized queries
6. **JANGAN ignore errors** - selalu handle dengan proper error handling
7. **JANGAN commit dengan console.log** - hapus semua debug logs
8. **JANGAN skip validation** - selalu validate input di server side
9. **JANGAN commit sensitive data** - gunakan .env file
10. **JANGAN break existing functionality** - test regression sebelum commit

### ✅ LAKUKAN:

1. **SELALU backup database** sebelum run migration
2. **SELALU gunakan transaction** untuk operasi critical
3. **SELALU release connection** di finally block
4. **SELALU validate input** di server side
5. **SELALU handle errors** dengan try-catch
6. **SELALU test** sebelum consider task selesai
7. **SELALU follow pattern** yang sudah ada (consistency)
8. **SELALU comment** untuk logic yang kompleks
9. **SELALU check** checklist kualitas
10. **SELALU update documentation** setelah changes

---

## 🎓 CONTOH IMPLEMENTASI LENGKAP

Lihat file **DEVELOPMENT-GUIDE.md** untuk:
- Complete incoming module example (500+ lines)
- Modal-based CRUD pattern
- Cascade dropdown implementation
- Stock helper integration
- Error handling examples
- Transaction management examples

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues & Solutions:

**Issue: "Column 'rack_name' doesn't exist"**
```
Solution: Run migration 004 terlebih dahulu untuk rename columns
Command: node scripts/migrate-004.js
```

**Issue: "Connection pool error"**
```
Solution: Pastikan connection.release() dipanggil di finally block
```

**Issue: "Stock tidak terupdate"**
```
Solution: 
1. Check apakah menggunakan stockHelper functions
2. Check apakah dalam transaction
3. Check log untuk error messages
```

**Issue: "Modal tidak muncul"**
```
Solution:
1. Check id modal di HTML
2. Check JavaScript function name
3. Check browser console untuk errors
```

---

## 🎯 PRIORITAS IMPLEMENTASI

### Phase 1: CRITICAL (Harus Selesai Dulu)
1. ✅ Column naming standardization
2. ✅ Stock helper module
3. 🔄 Complete incoming module
4. 🔄 Complete outgoing module
5. 🔄 Complete transfer module
6. 🔄 Complete opname module

### Phase 2: HIGH (Setelah Phase 1 Selesai)
1. Input validation dengan express-validator
2. Enhanced dashboard dengan real-time data
3. Advanced search & filtering
4. Duplicate data cleanup

### Phase 3: MEDIUM (Feature Enhancement)
1. Jamaah management module
2. Reporting & analytics
3. Export to PDF/Excel
4. Email notifications

### Phase 4: LOW (Nice to Have)
1. User management & permissions
2. Barcode integration
3. Mobile app
4. Advanced analytics with Chart.js

---

## 📊 SUCCESS METRICS

### Application Ready When:
- [ ] Zero placeholder pages
- [ ] All CRUD operations working
- [ ] Stock synchronization accurate
- [ ] No critical bugs
- [ ] Response time < 500ms
- [ ] Mobile responsive
- [ ] User can perform daily operations without issues

### Code Quality Achieved When:
- [ ] Consistent naming convention (Indonesian)
- [ ] No workaround code
- [ ] Proper error handling everywhere
- [ ] All functions documented
- [ ] Tests pass
- [ ] No console.log in production
- [ ] Security best practices followed

---

**END OF REFACTORING GUIDE**

**Versi:** 1.0  
**Last Updated:** 21 November 2025  
**Maintainer:** Development Team

**Note:** Dokumen ini adalah living document. Update setiap ada perubahan significant atau lesson learned dari implementation.
