# 🧪 Testing Guide - Purchasing Logistics System

**Created:** November 21, 2025  
**Purpose:** Panduan testing untuk memastikan semua fitur berfungsi dengan baik

---

## 🎯 Pre-Testing Checklist

### 1. Database Migration
```bash
# Jalankan migration untuk fix struktur database
node scripts/migrate-005.js
```

**Expected Output:**
- ✅ Connected to database
- ✅ All statements executed successfully
- ✅ Migration completed successfully

**Verify Tables:**
```sql
-- Check warehouse_stock structure
DESCRIBE warehouse_stock;
-- Should have: barang_id, warehouse_id, quantity, etc.

-- Check stock_movements structure  
DESCRIBE stock_movements;
-- Should have: barang_id, warehouse_id, movement_type, quantity, etc.

-- Check purchasing_incoming structure
DESCRIBE purchasing_incoming;
-- Should have: id, barang_id, quantity, harga_satuan, total_harga, etc.

-- Check purchasing_barang_keluar structure
DESCRIBE purchasing_barang_keluar;
-- Should have: id, id_barang, jumlah_keluar, penerima, tujuan, etc.
```

### 2. Start Application
```bash
npm start
```

**Expected Output:**
- ✅ Server running on port 3000
- ✅ Database connected
- ✅ No error messages

---

## 📋 Test Cases

### TEST CASE 1: Incoming Goods (Barang Masuk)

#### TC1.1: Create New Incoming
**Steps:**
1. Navigate to `/incoming`
2. Click "Tambah Barang Masuk" button
3. Fill form:
   - Supplier: Select any supplier
   - Barang: Select any barang
   - Warehouse: Select warehouse
   - Rack: Auto-loaded based on warehouse
   - Bin: Auto-loaded based on rack
   - Quantity: 10
   - Harga Satuan: 50000
   - No Invoice: INV-001
   - Tanggal Masuk: Today
4. Click "Simpan"

**Expected Result:**
- ✅ Success alert "Barang masuk berhasil disimpan"
- ✅ New row appears in table
- ✅ Total harga = quantity × harga_satuan (10 × 50000 = 500000)
- ✅ Stock updated in database

**Database Verification:**
```sql
-- Check incoming record
SELECT * FROM purchasing_incoming ORDER BY id DESC LIMIT 1;

-- Check stock movement
SELECT * FROM stock_movements 
WHERE reference_type = 'incoming' 
ORDER BY id DESC LIMIT 1;

-- Check warehouse stock
SELECT * FROM warehouse_stock 
WHERE barang_id = [barang_id] AND warehouse_id = [warehouse_id];

-- Check global stock
SELECT stock_akhir FROM purchasing_barang WHERE id_barang = [barang_id];
```

**Expected Database State:**
- ✅ 1 new record in `purchasing_incoming`
- ✅ 1 new record in `stock_movements` with movement_type = 'IN'
- ✅ `warehouse_stock.quantity` increased by 10
- ✅ `purchasing_barang.stock_akhir` updated

#### TC1.2: Edit Existing Incoming
**Steps:**
1. Click edit icon on any incoming record
2. Change quantity from 10 to 15
3. Click "Simpan"

**Expected Result:**
- ✅ Success alert "Data barang masuk berhasil diupdate"
- ✅ Table updated with new quantity

**Note:** Stock tidak berubah saat edit (by design, karena stock sudah tercatat di stock_movements)

#### TC1.3: Delete Incoming
**Steps:**
1. Click delete icon on incoming record
2. Confirm deletion in SweetAlert

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ Success alert "Data barang masuk berhasil dihapus"
- ✅ Record removed from table

#### TC1.4: Search Functionality
**Steps:**
1. Type barang name in search box
2. Observe table filtering

**Expected Result:**
- ✅ Only matching rows displayed
- ✅ Real-time filtering as you type

#### TC1.5: Cascade Dropdown
**Steps:**
1. Open create modal
2. Select warehouse
3. Observe rack dropdown
4. Select rack
5. Observe bin dropdown

**Expected Result:**
- ✅ Rack dropdown populated with racks from selected warehouse
- ✅ Bin dropdown populated with bins from selected rack
- ✅ "Loading..." shown while fetching

---

### TEST CASE 2: Outgoing Goods (Barang Keluar)

#### TC2.1: Check Stock Availability
**Steps:**
1. Navigate to `/outgoing`
2. Click "Tambah Barang Keluar"
3. Select Barang
4. Select Warehouse

**Expected Result:**
- ✅ Stock info box appears below warehouse selection
- ✅ Shows current available stock
- ✅ Green background if stock > 0
- ✅ Red background if stock = 0

#### TC2.2: Create Outgoing with Sufficient Stock
**Prerequisite:** Barang has stock >= 5 in selected warehouse

**Steps:**
1. Fill form:
   - Barang: Select barang with stock
   - Warehouse: Select warehouse
   - Rack: Select rack
   - Bin: Select bin
   - Jumlah Keluar: 5
   - Penerima: "John Doe"
   - Tujuan: "Cabang Jakarta"
   - Tanggal Keluar: Today
2. Click "Simpan"

**Expected Result:**
- ✅ Success alert "Barang keluar berhasil disimpan"
- ✅ New row appears in table
- ✅ Stock decreased by 5

**Database Verification:**
```sql
-- Check outgoing record
SELECT * FROM purchasing_barang_keluar ORDER BY id DESC LIMIT 1;

-- Check stock movement
SELECT * FROM stock_movements 
WHERE reference_type = 'outgoing' 
ORDER BY id DESC LIMIT 1;

-- Check warehouse stock decreased
SELECT * FROM warehouse_stock 
WHERE barang_id = [barang_id] AND warehouse_id = [warehouse_id];
```

**Expected Database State:**
- ✅ 1 new record in `purchasing_barang_keluar`
- ✅ 1 new record in `stock_movements` with movement_type = 'OUT'
- ✅ `warehouse_stock.quantity` decreased by 5
- ✅ `purchasing_barang.stock_akhir` decreased by 5

#### TC2.3: Prevent Outgoing with Insufficient Stock
**Prerequisite:** Barang has stock < 10 in selected warehouse

**Steps:**
1. Fill form:
   - Barang: Select barang
   - Warehouse: Select warehouse
   - Jumlah Keluar: 100 (more than available)
2. Click "Simpan"

**Expected Result:**
- ✅ Warning alert "Stock tersedia hanya [X], tidak bisa mengeluarkan 100!"
- ✅ Form submission blocked
- ✅ No data saved to database

#### TC2.4: Stock Validation on Input Change
**Steps:**
1. Open create modal
2. Select barang and warehouse with stock = 10
3. Type quantity = 15
4. Tab out of quantity field

**Expected Result:**
- ✅ Warning alert appears
- ✅ Shows "Jumlah keluar (15) melebihi stock tersedia (10)!"

---

### TEST CASE 3: Stock Synchronization

#### TC3.1: Verify Stock Calculation
**Steps:**
1. Create incoming: +10 units
2. Check warehouse_stock
3. Create outgoing: -3 units
4. Check warehouse_stock
5. Check global stock

**Expected Result:**
- ✅ After incoming: warehouse_stock = 10
- ✅ After outgoing: warehouse_stock = 7
- ✅ purchasing_barang.stock_akhir = 7
- ✅ stock_movements has 2 records (1 IN, 1 OUT)

**SQL Verification:**
```sql
-- Calculate stock from movements
SELECT 
  barang_id,
  warehouse_id,
  SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END) as total_in,
  SUM(CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END) as total_out,
  SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END) - 
  SUM(CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END) as calculated_stock
FROM stock_movements
GROUP BY barang_id, warehouse_id;

-- Compare with warehouse_stock
SELECT * FROM warehouse_stock;

-- Should match!
```

---

### TEST CASE 4: Transaction Rollback

#### TC4.1: Test Rollback on Error
**Steps:**
1. Temporarily break database connection
2. Try to create incoming
3. Observe error

**Expected Result:**
- ✅ Error alert shown to user
- ✅ No partial data in database
- ✅ Transaction rolled back
- ✅ Stock unchanged

---

### TEST CASE 5: UI/UX Testing

#### TC5.1: Responsive Design
**Steps:**
1. Open application in mobile browser (or use DevTools mobile view)
2. Navigate to incoming and outgoing pages
3. Try to use all features

**Expected Result:**
- ✅ Layout adapts to mobile screen
- ✅ Modal scrollable on small screens
- ✅ Buttons touchable
- ✅ Table scrollable horizontally
- ✅ Search box full width on mobile

#### TC5.2: Modal Behavior
**Steps:**
1. Open create modal
2. Click outside modal
3. Press ESC key
4. Click X button

**Expected Result:**
- ✅ Modal closes on outside click
- ✅ Modal closes on ESC key
- ✅ Modal closes on X button
- ✅ No data loss warning (form data cleared)

#### TC5.3: Loading States
**Steps:**
1. Open create modal
2. Select warehouse
3. Observe rack dropdown

**Expected Result:**
- ✅ "Loading..." text appears
- ✅ Dropdown disabled while loading
- ✅ Racks appear after loading

---

## 🐛 Common Issues & Solutions

### Issue 1: "Column 'barang_id' not found"
**Cause:** Migration not run or incomplete
**Solution:**
```bash
node scripts/migrate-005.js
```

### Issue 2: Stock not updating
**Cause:** stockHelper not properly imported
**Solution:**
Check `routes/incoming.js` and `routes/outgoing.js` have:
```javascript
const { recordIncomingStock, recordOutgoingStock } = require('../lib/stockHelper');
```

### Issue 3: Cascade dropdown not working
**Cause:** API endpoints not responding
**Solution:**
1. Check browser console for errors
2. Verify routes registered in server.js
3. Check API endpoint URLs match

### Issue 4: "Connection released" error
**Cause:** Connection released before commit
**Solution:**
Ensure `connection.release()` is in `finally` block, after commit/rollback

---

## ✅ Testing Completion Checklist

- [ ] All incoming CRUD operations work
- [ ] All outgoing CRUD operations work
- [ ] Stock synchronization accurate
- [ ] Cascade dropdowns functional
- [ ] Search functionality works
- [ ] Stock validation prevents negative stock
- [ ] Transaction rollback on error
- [ ] Responsive design on mobile
- [ ] No console errors
- [ ] No server errors in log
- [ ] Database constraints respected
- [ ] SweetAlert2 messages appropriate

---

## 📊 Performance Testing

### Load Time Test
**Target:** Page load < 500ms

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to `/incoming`
4. Check "Load" time

**Expected Result:**
- ✅ Initial load < 500ms
- ✅ AJAX requests < 200ms

### Stress Test
**Target:** Handle 100 concurrent requests

**Steps:**
1. Use Apache Bench or similar tool:
```bash
ab -n 100 -c 10 http://localhost:3000/incoming
```

**Expected Result:**
- ✅ No errors
- ✅ Average response time < 1s
- ✅ No database connection issues

---

## 🎯 Success Criteria

**Testing Complete When:**
- ✅ All test cases pass
- ✅ No critical bugs found
- ✅ Performance targets met
- ✅ User experience smooth
- ✅ Data integrity maintained
- ✅ Error handling works properly

**Ready for Production When:**
- ✅ All testing complete
- ✅ Code reviewed
- ✅ Documentation updated
- ✅ Backup strategy in place
- ✅ Rollback plan prepared

---

**END OF TESTING GUIDE**
