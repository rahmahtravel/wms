# API Documentation - Rahmah Travel P&L System

## Table of Contents
1. [Overview](#overview)
2. [Base Configuration](#base-configuration)
3. [Dashboard Routes](#dashboard-routes)
4. [Master Data Routes](#master-data-routes)
5. [Warehouse Routes](#warehouse-routes)
6. [Stock & Transaction Routes](#stock--transaction-routes)
7. [Jamaah Routes](#jamaah-routes)
8. [Error Handling](#error-handling)

---

## Overview

**Base URL:** `http://localhost:3000`
**Response Format:** HTML (EJS rendered) or JSON for API endpoints
**Authentication:** Currently none (to be implemented)

---

## Base Configuration

### Environment Variables (.env)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rahmah_purchasing_logistics
PORT=3000
SESSION_SECRET=your-secret-key-here
```

### Database Connection
- **Pool Size:** Default MySQL2 pool
- **Connection:** Automatic reconnection on failure
- **Charset:** UTF8MB4

---

## Dashboard Routes

### GET /
Display main dashboard with statistics

**Response:** HTML page
**Data Displayed:**
- Total branches count
- Total suppliers count
- Total barang count
- Total warehouses count
- Total stock units
- Low stock items (qty < minimal_stock)
- Recent incoming items (last 10)
- Recent outgoing items (last 10)

**Queries:**
```sql
-- Count statistics
SELECT COUNT(*) FROM branches
SELECT COUNT(*) FROM purchasing_suppliers
SELECT COUNT(*) FROM purchasing_barang
SELECT COUNT(*) FROM warehouse_locations

-- Total stock
SELECT SUM(quantity) FROM warehouse_stock

-- Low stock items
SELECT * FROM purchasing_barang WHERE id IN (
  SELECT barang_id FROM warehouse_stock WHERE quantity < minimal_stock
)

-- Recent incoming
SELECT pi.*, pb.nama_barang, ps.name as supplier_name
FROM purchasing_incoming pi
LEFT JOIN purchasing_barang pb ON pi.barang_id = pb.id
LEFT JOIN purchasing_suppliers ps ON pi.supplier_id = ps.id
ORDER BY pi.tanggal_masuk DESC LIMIT 10

-- Recent outgoing
SELECT pbk.*, pb.nama_barang
FROM purchasing_barang_keluar pbk
LEFT JOIN purchasing_barang pb ON pbk.barang_id = pb.id
ORDER BY pbk.tanggal_keluar DESC LIMIT 10
```

---

## Master Data Routes

### Branches Routes (/branches)

#### GET /branches
List all branches

**Response:** HTML page
**Query:**
```sql
SELECT * FROM branches ORDER BY id DESC
```

#### GET /branches/create
Display create branch form

**Response:** HTML form

#### POST /branches/create
Create new branch

**Body Parameters:**
- `name` (string, required) - Branch name
- `address` (string) - Branch address
- `phone` (string) - Branch phone

**Validation:**
- name: required, not empty

**Query:**
```sql
INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)
```

**Success:** Redirect to /branches
**Error:** Redirect back with error message

#### GET /branches/edit/:id
Display edit branch form

**URL Parameters:**
- `id` (integer) - Branch ID

**Query:**
```sql
SELECT * FROM branches WHERE id = ?
```

#### POST /branches/edit/:id
Update branch

**URL Parameters:**
- `id` (integer) - Branch ID

**Body Parameters:**
- `name` (string, required)
- `address` (string)
- `phone` (string)

**Query:**
```sql
UPDATE branches SET name=?, address=?, phone=? WHERE id=?
```

#### POST /branches/delete/:id
Delete branch

**URL Parameters:**
- `id` (integer) - Branch ID

**Query:**
```sql
DELETE FROM branches WHERE id=?
```

⚠️ **Note:** Will fail if branch is referenced in other tables (FK constraint)

---

### Categories Routes (/categories)

#### GET /categories
List all purchasing categories

**Query:**
```sql
SELECT * FROM purchasing_categories ORDER BY id DESC
```

#### POST /categories/create
Create new category

**Body Parameters:**
- `name` (string, required) - Category name

**Query:**
```sql
INSERT INTO purchasing_categories (name) VALUES (?)
```

#### POST /categories/edit/:id
Update category

**URL Parameters:**
- `id` (integer) - Category ID

**Body Parameters:**
- `name` (string, required)

**Query:**
```sql
UPDATE purchasing_categories SET name=? WHERE id=?
```

#### POST /categories/delete/:id
Delete category

**URL Parameters:**
- `id` (integer) - Category ID

**Query:**
```sql
DELETE FROM purchasing_categories WHERE id=?
```

---

### Jenis Barang Routes (/jenis-barang)

#### GET /jenis-barang
List all jenis barang

**Query:**
```sql
SELECT * FROM jenis_barang ORDER BY id DESC
```

#### POST /jenis-barang/create
Create new jenis barang

**Body Parameters:**
- `nama_jenis` (string, required) - Type name
- `deskripsi` (string) - Description

**Query:**
```sql
INSERT INTO jenis_barang (nama_jenis, deskripsi) VALUES (?, ?)
```

#### POST /jenis-barang/edit/:id
Update jenis barang

**Query:**
```sql
UPDATE jenis_barang SET nama_jenis=?, deskripsi=? WHERE id=?
```

#### POST /jenis-barang/delete/:id
Delete jenis barang

**Query:**
```sql
DELETE FROM jenis_barang WHERE id=?
```

---

### Suppliers Routes (/suppliers)

#### GET /suppliers
List all suppliers

**Query:**
```sql
SELECT * FROM purchasing_suppliers ORDER BY id DESC
```

#### POST /suppliers/create
Create new supplier

**Body Parameters:**
- `name` (string, required) - Supplier name
- `phone` (string) - Contact phone
- `supplier_link` (string) - Website/shop URL
- `items` (string) - Items supplied

**Query:**
```sql
INSERT INTO purchasing_suppliers (name, phone, supplier_link, items) 
VALUES (?, ?, ?, ?)
```

#### POST /suppliers/edit/:id
Update supplier

**Query:**
```sql
UPDATE purchasing_suppliers 
SET name=?, phone=?, supplier_link=?, items=? 
WHERE id=?
```

#### POST /suppliers/delete/:id
Delete supplier

**Query:**
```sql
DELETE FROM purchasing_suppliers WHERE id=?
```

---

### Barang Routes (/barang)

#### GET /barang
List all barang with relations

**Query:**
```sql
SELECT 
  pb.*,
  pc.name as category_name,
  jb.nama_jenis as jenis_nama
FROM purchasing_barang pb
LEFT JOIN purchasing_categories pc ON pb.category_id = pc.id
LEFT JOIN jenis_barang jb ON pb.id_jenis_barang = jb.id
ORDER BY pb.id DESC
```

#### POST /barang/create
Create new barang

**Body Parameters:**
- `category_id` (integer, required) - FK to purchasing_categories
- `id_jenis_barang` (integer, required) - FK to jenis_barang
- `kode_barang` (string, required, unique) - Item code
- `nama_barang` (string, required) - Item name
- `satuan` (string) - Unit (pcs, unit, box)
- `minimal_stock` (integer) - Minimum stock level
- `is_required` (boolean) - Required for jamaah
- `is_dynamic` (boolean) - Has dynamic sizing
- `size_type` (enum) - S, M, L, XL, XXL, NONE

**Query:**
```sql
INSERT INTO purchasing_barang 
(category_id, id_jenis_barang, kode_barang, nama_barang, satuan, 
 minimal_stock, is_required, is_dynamic, size_type)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

#### POST /barang/edit/:id
Update barang

**Query:**
```sql
UPDATE purchasing_barang 
SET category_id=?, id_jenis_barang=?, kode_barang=?, nama_barang=?,
    satuan=?, minimal_stock=?, is_required=?, is_dynamic=?, size_type=?
WHERE id=?
```

#### POST /barang/delete/:id
Delete barang

**Query:**
```sql
DELETE FROM purchasing_barang WHERE id=?
```

---

## Warehouse Routes

### Locations Routes (/warehouse/locations)

#### GET /warehouse/locations
List all warehouse locations

**Query:**
```sql
SELECT wl.*, b.name as branch_name
FROM warehouse_locations wl
LEFT JOIN branches b ON wl.branch_id = b.id
ORDER BY wl.id DESC
```

#### POST /warehouse/locations/create
Create new warehouse location

**Body Parameters:**
- `kode_lokasi` (string, required, unique) - Location code
- `nama_lokasi` (string, required) - Location name
- `tipe_lokasi` (enum) - HQ, Branch, Transit
- `alamat` (string) - Address
- `telepon` (string) - Phone
- `pic` (string) - Person in Charge
- `branch_id` (integer) - FK to branches

**Query:**
```sql
INSERT INTO warehouse_locations 
(kode_lokasi, nama_lokasi, tipe_lokasi, alamat, telepon, pic, branch_id)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

#### POST /warehouse/locations/edit/:id
Update location

#### POST /warehouse/locations/delete/:id
Delete location

---

### Racks Routes (/warehouse/racks)

#### GET /warehouse/racks
List all racks

**Query:**
```sql
SELECT wr.*, wl.nama_lokasi as warehouse_name
FROM warehouse_racks wr
LEFT JOIN warehouse_locations wl ON wr.warehouse_id = wl.id
ORDER BY wr.id DESC
```

#### POST /warehouse/racks/create
Create new rack

**Body Parameters:**
- `warehouse_id` (integer, required) - FK to warehouse_locations
- `kode_rak` (string, required) - Rack code
- `nama_rak` (string, required) - Rack name
- `deskripsi` (string) - Description
- `kapasitas_berat_kg` (decimal) - Weight capacity

**Query:**
```sql
INSERT INTO warehouse_racks 
(warehouse_id, kode_rak, nama_rak, deskripsi, kapasitas_berat_kg)
VALUES (?, ?, ?, ?, ?)
```

---

### Bins Routes (/warehouse/bins)

#### GET /warehouse/bins
List all bins

**Query:**
```sql
SELECT wb.*, wr.nama_rak as rack_name, wl.nama_lokasi as warehouse_name
FROM warehouse_bins wb
LEFT JOIN warehouse_racks wr ON wb.rack_id = wr.id
LEFT JOIN warehouse_locations wl ON wr.warehouse_id = wl.id
ORDER BY wb.id DESC
```

#### POST /warehouse/bins/create
Create new bin

**Body Parameters:**
- `rack_id` (integer, required) - FK to warehouse_racks
- `kode_bin` (string, required) - Bin code
- `nama_bin` (string, required) - Bin name
- `level_posisi` (integer) - Level position
- `kolom_posisi` (string) - Column position
- `kapasitas_item` (integer) - Item capacity

**Query:**
```sql
INSERT INTO warehouse_bins 
(rack_id, kode_bin, nama_bin, level_posisi, kolom_posisi, kapasitas_item)
VALUES (?, ?, ?, ?, ?, ?)
```

---

## Stock & Transaction Routes

### Stock Routes (/stock)

#### GET /stock
Display stock overview

**Query Parameters:**
- `search` (string) - Search by kode or nama barang
- `warehouse_id` (integer) - Filter by warehouse
- `branch_id` (integer) - Filter by branch

**Query:**
```sql
SELECT 
  ws.*,
  pb.kode_barang,
  pb.nama_barang,
  pb.satuan,
  wl.nama_lokasi,
  wr.nama_rak,
  wb.nama_bin,
  b.name as branch_name
FROM warehouse_stock ws
LEFT JOIN purchasing_barang pb ON ws.barang_id = pb.id
LEFT JOIN warehouse_locations wl ON ws.warehouse_id = wl.id
LEFT JOIN warehouse_racks wr ON ws.rack_id = wr.id
LEFT JOIN warehouse_bins wb ON ws.bin_id = wb.id
LEFT JOIN branches b ON ws.branch_id = b.id
WHERE 1=1
  AND (pb.kode_barang LIKE ? OR pb.nama_barang LIKE ?)
  AND (? IS NULL OR ws.warehouse_id = ?)
  AND (? IS NULL OR ws.branch_id = ?)
ORDER BY pb.nama_barang
```

#### GET /stock/movements
View stock movement history

**Query:**
```sql
SELECT 
  sm.*,
  pb.kode_barang,
  pb.nama_barang,
  wl.nama_lokasi,
  b.name as branch_name
FROM stock_movements sm
LEFT JOIN purchasing_barang pb ON sm.barang_id = pb.id
LEFT JOIN warehouse_locations wl ON sm.warehouse_id = wl.id
LEFT JOIN branches b ON sm.branch_id = b.id
ORDER BY sm.movement_date DESC
```

---

### Incoming Routes (/incoming)

#### GET /incoming
List all incoming transactions

**Query:**
```sql
SELECT 
  pi.*,
  pb.nama_barang,
  ps.name as supplier_name,
  wl.nama_lokasi,
  b.name as branch_name
FROM purchasing_incoming pi
LEFT JOIN purchasing_barang pb ON pi.barang_id = pb.id
LEFT JOIN purchasing_suppliers ps ON pi.supplier_id = ps.id
LEFT JOIN warehouse_locations wl ON pi.warehouse_id = wl.id
LEFT JOIN branches b ON pi.branch_id = b.id
ORDER BY pi.tanggal_masuk DESC
```

#### POST /incoming/create
Create incoming transaction (with stock update)

**Body Parameters:**
- `barang_id` (integer, required) - FK to purchasing_barang
- `jumlah` (integer, required) - Quantity
- `tanggal_masuk` (date, required) - Incoming date
- `supplier_id` (integer) - FK to purchasing_suppliers
- `no_invoice` (string) - Invoice number
- `warehouse_id` (integer, required) - FK to warehouse_locations
- `rack_id` (integer) - FK to warehouse_racks
- `bin_id` (integer) - FK to warehouse_bins
- `branch_id` (integer, required) - FK to branches

**Process (Transaction):**
1. Insert into purchasing_incoming
2. Update or insert warehouse_stock
3. Insert into stock_movements (movement_type='IN')

**Queries:**
```sql
START TRANSACTION;

-- Insert incoming
INSERT INTO purchasing_incoming 
(barang_id, jumlah, tanggal_masuk, supplier_id, no_invoice, 
 warehouse_id, rack_id, bin_id, branch_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Check existing stock
SELECT * FROM warehouse_stock 
WHERE barang_id=? AND warehouse_id=? AND rack_id=? AND bin_id=? AND branch_id=?;

-- Update stock (if exists)
UPDATE warehouse_stock 
SET quantity = quantity + ?,
    available_qty = available_qty + ?,
    last_movement_date = NOW()
WHERE barang_id=? AND warehouse_id=? AND rack_id=? AND bin_id=? AND branch_id=?;

-- Or insert stock (if not exists)
INSERT INTO warehouse_stock 
(barang_id, warehouse_id, rack_id, bin_id, branch_id, quantity, available_qty)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- Log movement
INSERT INTO stock_movements 
(barang_id, warehouse_id, rack_id, bin_id, branch_id, 
 movement_type, quantity, reference_id, movement_date)
VALUES (?, ?, ?, ?, ?, 'IN', ?, ?, NOW());

COMMIT;
```

---

### Outgoing Routes (/outgoing)

#### GET /outgoing
List all outgoing transactions

**Query:**
```sql
SELECT 
  pbk.*,
  pb.nama_barang,
  wl.nama_lokasi,
  b.name as branch_name
FROM purchasing_barang_keluar pbk
LEFT JOIN purchasing_barang pb ON pbk.barang_id = pb.id
LEFT JOIN warehouse_locations wl ON pbk.warehouse_id = wl.id
LEFT JOIN branches b ON pbk.branch_id = b.id
ORDER BY pbk.tanggal_keluar DESC
```

#### POST /outgoing/create
Create outgoing transaction (with stock validation)

**Body Parameters:**
- `barang_id` (integer, required)
- `jumlah` (integer, required)
- `tanggal_keluar` (date, required)
- `keterangan` (string) - Notes
- `warehouse_id` (integer, required)
- `rack_id` (integer)
- `bin_id` (integer)
- `branch_id` (integer, required)

**Process (Transaction):**
1. Check available stock
2. If insufficient, throw error
3. Insert into purchasing_barang_keluar
4. Update warehouse_stock (decrease available_qty)
5. Insert into stock_movements (movement_type='OUT')

**Queries:**
```sql
START TRANSACTION;

-- Check stock availability
SELECT available_qty FROM warehouse_stock
WHERE barang_id=? AND warehouse_id=? AND rack_id=? AND bin_id=? AND branch_id=?;

-- Validation
IF available_qty < jumlah THEN
  ROLLBACK;
  THROW ERROR 'Stok tidak mencukupi';
END IF;

-- Insert outgoing
INSERT INTO purchasing_barang_keluar 
(barang_id, jumlah, tanggal_keluar, keterangan, 
 warehouse_id, rack_id, bin_id, branch_id)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- Update stock
UPDATE warehouse_stock 
SET quantity = quantity - ?,
    available_qty = available_qty - ?,
    last_movement_date = NOW()
WHERE barang_id=? AND warehouse_id=? AND rack_id=? AND bin_id=? AND branch_id=?;

-- Log movement
INSERT INTO stock_movements 
(barang_id, warehouse_id, rack_id, bin_id, branch_id, 
 movement_type, quantity, reference_id, movement_date)
VALUES (?, ?, ?, ?, ?, 'OUT', ?, ?, NOW());

COMMIT;
```

---

### Transfer Routes (/transfer)

#### GET /transfer
List all transfers

**Query:**
```sql
SELECT 
  wt.*,
  wl_from.nama_lokasi as from_warehouse_name,
  wl_to.nama_lokasi as to_warehouse_name,
  b_from.name as from_branch_name,
  b_to.name as to_branch_name
FROM warehouse_transfers wt
LEFT JOIN warehouse_locations wl_from ON wt.from_warehouse_id = wl_from.id
LEFT JOIN warehouse_locations wl_to ON wt.to_warehouse_id = wl_to.id
LEFT JOIN branches b_from ON wt.from_branch_id = b_from.id
LEFT JOIN branches b_to ON wt.to_branch_id = b_to.id
ORDER BY wt.transfer_date DESC
```

#### POST /transfer/create
Create transfer

**Body Parameters:**
- `transfer_number` (string, auto-generated) - Unique transfer number
- `from_warehouse_id` (integer, required)
- `to_warehouse_id` (integer, required)
- `from_branch_id` (integer, required)
- `to_branch_id` (integer, required)
- `transfer_date` (date, required)
- `status` (enum) - draft, pending, in_transit, received, cancelled
- `items` (JSON string) - Array of items: [{"barang_id": 1, "quantity": 10}, ...]

**Process:**
1. Generate transfer_number (e.g., TRF-20240101-001)
2. Insert into warehouse_transfers
3. Insert items into warehouse_transfer_items
4. If status='received', update stock in both locations

**Status Workflow:**
- **draft** → **pending** → **in_transit** → **received**
- Can cancel from any status except received

---

### Opname Routes (/opname)

#### GET /opname/sessions
List all opname sessions

**Query:**
```sql
SELECT 
  sos.*,
  wl.nama_lokasi,
  b.name as branch_name
FROM stock_opname_session sos
LEFT JOIN warehouse_locations wl ON sos.warehouse_id = wl.id
LEFT JOIN branches b ON sos.branch_id = b.id
ORDER BY sos.tanggal_mulai DESC
```

#### POST /opname/session/create
Create opname session

**Body Parameters:**
- `nama_session` (string, required) - Session name
- `tanggal_mulai` (date, required) - Start date
- `warehouse_id` (integer, required)
- `branch_id` (integer, required)
- `keterangan` (string) - Notes
- `status` (enum) - ongoing, completed, cancelled

#### GET /opname/session/:id
View opname details

**Query:**
```sql
-- Session info
SELECT * FROM stock_opname_session WHERE id=?;

-- Opname items
SELECT 
  so.*,
  pb.kode_barang,
  pb.nama_barang,
  wr.nama_rak,
  wb.nama_bin
FROM stock_opname so
LEFT JOIN purchasing_barang pb ON so.barang_id = pb.id
LEFT JOIN warehouse_racks wr ON so.rack_id = wr.id
LEFT JOIN warehouse_bins wb ON so.bin_id = wb.id
WHERE so.session_id = ?
ORDER BY so.id DESC;
```

#### POST /opname/add-item
Add item to opname session

**Body Parameters:**
- `session_id` (integer, required)
- `barang_id` (integer, required)
- `jumlah_fisik` (integer, required) - Physical count
- `rack_id` (integer)
- `bin_id` (integer)
- `keterangan` (string) - Notes for discrepancy

**Process:**
1. Get system stock for comparison
2. Calculate selisih (difference)
3. Insert into stock_opname
4. If session completed, can adjust stock based on physical count

---

## Jamaah Routes

### Kelengkapan Routes (/jamaah/kelengkapan)

#### GET /jamaah/kelengkapan
List all jamaah kelengkapan records

**Query:**
```sql
SELECT * FROM jamaah_kelengkapan ORDER BY id DESC
```

#### POST /jamaah/kelengkapan/create
Create kelengkapan record

**Body Parameters:**
- `kain_ihram_mukena` (string) - With size
- `jilbab` (string) - With size
- `koper` (string)
- `tas_paspor` (string)
- `tas_serut` (string) - With size
- `buku_doa` (string)
- `jaket` (string) - With size
- `syal` (string)
- `status_pengambilan` (enum) - pending, diambil, dikirim

**Query:**
```sql
INSERT INTO jamaah_kelengkapan 
(kain_ihram_mukena, jilbab, koper, tas_paspor, tas_serut, 
 buku_doa, jaket, syal, status_pengambilan)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
```

---

### Request Routes (/jamaah/request)

#### GET /jamaah/request
List all perlengkapan requests

**Query:**
```sql
SELECT * FROM request_perlengkapan ORDER BY id DESC
```

#### POST /jamaah/request/create
Create new request

**Body Parameters:**
- `branch_id` (integer) - FK to branches
- `items` (JSON) - Requested items array
- `status` (enum) - pending, confirmed, finished, cancelled
- `keterangan` (string) - Notes

**Query:**
```sql
INSERT INTO request_perlengkapan 
(branch_id, items, status, keterangan)
VALUES (?, ?, ?, ?)
```

#### POST /jamaah/request/update-status/:id
Update request status

**Body Parameters:**
- `status` (enum) - pending, confirmed, finished, cancelled

**Query:**
```sql
UPDATE request_perlengkapan SET status=? WHERE id=?
```

---

### Pengiriman Routes (/jamaah/pengiriman)

#### GET /jamaah/pengiriman
List all shipments

**Query:**
```sql
SELECT * FROM rekap_ongkir ORDER BY id DESC
```

#### POST /jamaah/pengiriman/create
Create new shipment

**Body Parameters:**
- `kelengkapan_id` (integer) - FK to jamaah_kelengkapan
- `status_tracking` (enum) - pending, processing, shipped, delivered, cancelled
- `lokasi_terakhir` (string) - Last known location
- `notes` (string) - Tracking notes

**Query:**
```sql
INSERT INTO rekap_ongkir 
(kelengkapan_id, status_tracking, lokasi_terakhir, notes)
VALUES (?, ?, ?, ?)
```

#### POST /jamaah/pengiriman/update-tracking/:id
Update tracking status

**Body Parameters:**
- `status_tracking` (enum)
- `lokasi_terakhir` (string)
- `notes` (string)

**Query:**
```sql
UPDATE rekap_ongkir 
SET status_tracking=?, lokasi_terakhir=?, notes=?, updated_at=NOW()
WHERE id=?
```

---

## Error Handling

### Error Response Format

**HTML Error Pages:**
- **404 Not Found:** `views/404.ejs`
- **500 Server Error:** `views/error.ejs`

**Error Messages:**
```javascript
// Success message (redirect with flash)
req.session.successMessage = 'Data berhasil disimpan';
res.redirect('/path');

// Error message (redirect with flash)
req.session.errorMessage = 'Terjadi kesalahan';
res.redirect('back');

// JSON error (for API endpoints)
res.status(500).json({ 
  error: true, 
  message: 'Error message here' 
});
```

### Common Error Codes

| Code | Description | Handling |
|------|-------------|----------|
| 400 | Bad Request | Validation error, missing parameters |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (unique constraint) |
| 422 | Unprocessable Entity | Business logic error (e.g., insufficient stock) |
| 500 | Server Error | Database error, unexpected error |

### Database Error Handling

**Foreign Key Constraint:**
```javascript
if (error.code === 'ER_ROW_IS_REFERENCED_2') {
  return res.status(409).send('Data tidak dapat dihapus karena masih digunakan');
}
```

**Duplicate Entry:**
```javascript
if (error.code === 'ER_DUP_ENTRY') {
  return res.status(409).send('Data sudah ada');
}
```

**Generic Error:**
```javascript
try {
  // operation
} catch (error) {
  console.error('Error:', error);
  res.status(500).render('error', { error });
}
```

---

## Database Transaction Pattern

### Standard Transaction Flow
```javascript
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  
  // Query 1
  await connection.execute('INSERT INTO ...');
  
  // Query 2
  await connection.execute('UPDATE ...');
  
  // Query 3
  await connection.execute('INSERT INTO ...');
  
  await connection.commit();
  res.redirect('/success');
  
} catch (error) {
  await connection.rollback();
  console.error('Transaction error:', error);
  res.status(500).send('Transaction failed');
  
} finally {
  connection.release();
}
```

---

## Data Validation

### Server-Side Validation
```javascript
// Required field check
if (!req.body.field_name || req.body.field_name.trim() === '') {
  return res.status(400).send('Field is required');
}

// Number validation
const quantity = parseInt(req.body.quantity);
if (isNaN(quantity) || quantity <= 0) {
  return res.status(400).send('Invalid quantity');
}

// Date validation
const date = new Date(req.body.date);
if (isNaN(date.getTime())) {
  return res.status(400).send('Invalid date');
}
```

### Enum Validation
```javascript
const validStatuses = ['pending', 'confirmed', 'finished', 'cancelled'];
if (!validStatuses.includes(req.body.status)) {
  return res.status(400).send('Invalid status');
}
```

---

## Pagination (Future Enhancement)

```javascript
// Pagination query pattern
const page = parseInt(req.query.page) || 1;
const limit = 20;
const offset = (page - 1) * limit;

const [rows] = await db.execute(
  'SELECT * FROM table LIMIT ? OFFSET ?',
  [limit, offset]
);

const [countResult] = await db.execute('SELECT COUNT(*) as total FROM table');
const totalPages = Math.ceil(countResult[0].total / limit);
```

---

## Security Notes

⚠️ **Current State:**
- No authentication/authorization implemented
- All routes are publicly accessible
- SQL injection protected via parameterized queries
- XSS protection via EJS auto-escaping

🔒 **Recommended Implementation:**
- Add user authentication (JWT or session-based)
- Implement role-based access control (RBAC)
- Add CSRF protection
- Implement rate limiting
- Add input sanitization middleware
- Enable HTTPS in production

---

**© 2024 Rahmah Travel. All Rights Reserved.**
