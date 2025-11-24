# Testing Guide - INSERT Data Barang

## 🔍 Cara Mengetes INSERT Data

### 1. **Buka Browser DevTools (F12)**
- Buka tab **Console** untuk melihat log
- Buka tab **Network** untuk melihat request/response

### 2. **Isi Form dengan Data Test**

```
Kategori: Pilih kategori yang ada (contoh: ID 1)
Jenis Barang: Pilih jenis barang yang ada (contoh: ID 1)
Kode Barang: TEST001
Nama Barang: Barang Test 001
Satuan: pcs
Stock Minimal: 10
Tipe Ukuran: none (atau pilih lainnya)
Is Required: ✓ (centang jika perlu)
Is Dynamic: ✓ (centang jika perlu)
```

### 3. **Klik Tombol "Simpan Data"**

### 4. **Lihat Console Browser (F12)**

Anda akan melihat log seperti ini:

```javascript
=== Form Submit Started ===
Form values (raw): {
  category_id: "1",
  id_jenis_barang: "1", 
  kode_barang: "TEST001",
  nama_barang: "Barang Test 001",
  satuan: "pcs",
  stock_minimal: "10",
  size_type: "none",
  is_required: true,
  is_dynamic: false
}

=== Prepared form data ===
Data to send: {
  "category_id": 1,
  "id_jenis_barang": 1,
  "kode_barang": "TEST001",
  "nama_barang": "Barang Test 001",
  "satuan": "pcs",
  "stock_minimal": 10,
  "is_required": 1,
  "is_dynamic": 0,
  "size_type": "none"
}

=== Sending POST request ===
=== Response received ===
Response status: 200
Response ok: true
Response data: {success: true, message: "Data berhasil ditambahkan ke database", insertId: 123}
=== INSERT SUCCESS ===
Insert ID: 123
```

### 5. **Lihat Console Server (Terminal)**

Di terminal server Node.js, Anda akan melihat:

```
=== POST /barang - Received data ===
Request body: {
  "category_id": 1,
  "id_jenis_barang": 1,
  "kode_barang": "TEST001",
  "nama_barang": "Barang Test 001",
  "satuan": "pcs",
  "stock_minimal": 10,
  "is_required": 1,
  "is_dynamic": 0,
  "size_type": "none"
}
Content-Type: application/json

=== Prepared values for INSERT ===
Values: [1, 1, 'TEST001', 'Barang Test 001', 'pcs', 10, 0, 1, 0, 'none']
category_id: 1 number
id_jenis_barang: 1 number
kode_barang: TEST001 string
nama_barang: Barang Test 001 string
satuan: pcs string
stock_minimal: 10 number
is_required: 1 number
is_dynamic: 0 number
size_type: none string

=== Executing SQL ===
SQL: INSERT INTO purchasing_barang ...
=== Insert SUCCESS ===
Insert result: {...}
Insert ID: 123
Affected rows: 1
```

---

## ❌ Troubleshooting Jika Gagal

### Error 1: "Missing required fields"
**Penyebab**: Field wajib tidak diisi
**Solusi**: Pastikan Kategori, Jenis Barang, Kode, Nama, dan Satuan terisi

### Error 2: "Satuan harus pcs, set, atau pack"
**Penyebab**: Nilai satuan tidak valid
**Solusi**: Pilih salah satu dari dropdown: pcs, set, atau pack

### Error 3: SQL Error - Duplicate Entry
**Penyebab**: Kode barang sudah ada di database
**Solusi**: Ganti kode barang dengan yang unik (contoh: TEST002, TEST003)

### Error 4: SQL Error - Foreign Key Constraint
**Penyebab**: category_id atau id_jenis_barang tidak ada di tabel referensi
**Solusi**: 
- Pastikan kategori yang dipilih ada di tabel `purchasing_categories`
- Pastikan jenis barang yang dipilih ada di tabel `jenis_barang`

### Error 5: Network Error / Fetch Failed
**Penyebab**: Server tidak berjalan atau route tidak ditemukan
**Solusi**: 
- Pastikan server Node.js berjalan (`npm start` atau `node server.js`)
- Cek apakah route `/barang` POST ada di `routes/barang.js`

---

## ✅ Verifikasi Data Berhasil INSERT

### 1. **Cek di Database (MySQL/phpMyAdmin)**

```sql
SELECT * FROM purchasing_barang ORDER BY id_barang DESC LIMIT 1;
```

Pastikan data yang baru diinput muncul dengan:
- ✅ id_barang (AUTO_INCREMENT baru)
- ✅ category_id sesuai pilihan
- ✅ id_jenis_barang sesuai pilihan
- ✅ kode_barang = "TEST001"
- ✅ nama_barang = "Barang Test 001"
- ✅ satuan = "pcs"
- ✅ stock_minimal = 10
- ✅ stock_akhir = 0 (default)
- ✅ is_required = 1 atau 0
- ✅ is_dynamic = 1 atau 0
- ✅ size_type = "none"
- ✅ created_at = timestamp sekarang
- ✅ updated_at = timestamp sekarang

### 2. **Cek di Halaman Web**

Setelah sukses INSERT, halaman akan reload otomatis dan data baru akan muncul di tabel.

---

## 🐛 Debug Mode

Untuk melihat detail error:

1. **Console Browser**: Tekan F12 → Tab Console
2. **Network Tab**: F12 → Tab Network → Filter "barang"
3. **Server Log**: Lihat terminal tempat Node.js berjalan

Semua request dan response akan ter-log dengan detail!

---

## 📝 Struktur Data yang Dikirim

```javascript
{
  category_id: 1,              // INT nullable
  id_jenis_barang: 1,          // INT nullable
  kode_barang: "TEST001",      // VARCHAR(20) required
  nama_barang: "Barang Test",  // VARCHAR(255) required
  satuan: "pcs",               // ENUM('pcs','set','pack') required
  stock_minimal: 10,           // INT default 10
  is_required: 1,              // TINYINT 0 or 1
  is_dynamic: 0,               // TINYINT 0 or 1
  size_type: "none"            // ENUM('none','clothing','age_group')
}
```

---

## 🎯 Expected Result

✅ Console browser menampilkan "INSERT SUCCESS"
✅ Alert SweetAlert menampilkan "Berhasil!"
✅ Halaman reload otomatis
✅ Data baru muncul di tabel
✅ Server log menampilkan Insert ID dan Affected rows: 1
