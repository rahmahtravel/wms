# Rahmah Travel - Purchasing & Logistics System

Sistem manajemen purchasing dan logistik untuk Rahmah Travel dengan fitur multi-gudang dan multi-cabang.

## Features

### Master Data
- ✅ Manajemen Cabang
- ✅ Kategori Perlengkapan
- ✅ Jenis Barang
- ✅ Supplier
- ✅ Data Barang

### Warehouse Management
- ✅ Lokasi Gudang (Multi-location & Multi-branch)
- ✅ Manajemen Rak
- ✅ Manajemen Bin
- ✅ Stok Barang Real-time
- ✅ Histori Pergerakan Stok

### Transaksi
- ✅ Barang Masuk (Incoming)
- ✅ Barang Keluar (Outgoing)
- ✅ Transfer Antar Gudang/Cabang
- ✅ Stock Opname

### Jamaah & Pengiriman
- ✅ Kelengkapan Jamaah
- ✅ Request Perlengkapan
- ✅ Tracking Pengiriman
- ✅ Rekap Ongkir

### Dashboard & Reporting
- ✅ Dashboard dengan statistik real-time
- ✅ Monitoring stok per lokasi & cabang
- ✅ Alert stok menipis
- ✅ Laporan pergerakan barang

## Tech Stack

- **Backend:** Node.js, Express.js
- **View Engine:** EJS
- **Database:** MySQL
- **Frontend:** Tailwind CSS (CDN), Font Awesome
- **Charts:** Chart.js

## Installation

1. Clone repository atau ekstrak file

2. Install dependencies:
```bash
npm install
```

3. Setup database:
   - Buat database MySQL
   - Import file `database.sql`
   - Atau jalankan script SQL di MySQL:
```bash
mysql -u root -p < database.sql
```

4. Configure environment variables:
   - Copy `.env` file dan sesuaikan konfigurasi:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rahmah_purchasing_logistics
DB_PORT=3306

PORT=3000
NODE_ENV=development

SESSION_SECRET=your_secret_key
```

5. Run application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

6. Open browser:
```
http://localhost:3000
```

## Project Structure

```
purchasing-logistics/
├── config/
│   └── database.js          # Database configuration
├── routes/
│   ├── dashboard.js         # Dashboard routes
│   ├── branches.js          # Branches CRUD
│   ├── categories.js        # Categories CRUD
│   ├── jenisBarang.js       # Jenis Barang CRUD
│   ├── suppliers.js         # Suppliers CRUD
│   ├── barang.js            # Barang CRUD
│   ├── warehouse.js         # Warehouse management
│   ├── stock.js             # Stock management
│   ├── incoming.js          # Incoming transactions
│   ├── outgoing.js          # Outgoing transactions
│   ├── transfer.js          # Transfer management
│   ├── opname.js            # Stock opname
│   └── jamaah.js            # Jamaah & pengiriman
├── views/
│   ├── dashboard/           # Dashboard views
│   ├── branches/            # Branches views
│   ├── categories/          # Categories views
│   ├── jenis-barang/        # Jenis barang views
│   ├── suppliers/           # Suppliers views
│   ├── barang/              # Barang views
│   ├── warehouse/           # Warehouse views
│   ├── stock/               # Stock views
│   ├── incoming/            # Incoming views
│   ├── outgoing/            # Outgoing views
│   ├── transfer/            # Transfer views
│   ├── opname/              # Opname views
│   ├── jamaah/              # Jamaah views
│   └── layout.ejs           # Main layout template
├── public/
│   └── uploads/             # Upload directory
├── .env                     # Environment variables
├── .gitignore              
├── server.js               # Main server file
├── package.json
├── database.sql            # Database schema & sample data
└── README.md

```

## Database Schema

Sistem ini menggunakan 23+ tabel dengan relasi lengkap sesuai dokumentasi di `purchasing-logistics-context.md`. 

Fitur utama database:
- Multi-gudang (warehouse_locations, warehouse_racks, warehouse_bins)
- Multi-cabang (branches dengan relasi ke semua transaksi)
- Tracking stok detail per lokasi, rak, bin, dan unit
- Audit trail lengkap (stock_movements)
- Manajemen jamaah dan pengiriman

## Color Theme

Primary Color: **#f57f17** (Orange)
- Primary Dark: #e65100
- Primary Light: #ffa726

## Features Highlights

### 1. Multi-Warehouse & Multi-Branch
Setiap transaksi barang dicatat dengan detail lokasi gudang, rak, bin, dan cabang yang jelas.

### 2. Real-time Stock Management
Stok barang terupdate otomatis setiap ada transaksi masuk/keluar/transfer.

### 3. Stock Movement Tracking
Semua pergerakan stok tercatat untuk audit trail dan reporting.

### 4. Responsive Design
Tampilan responsif untuk desktop, tablet, dan mobile dengan Tailwind CSS.

### 5. User-Friendly Interface
Interface modern, elegan, dan mudah digunakan dengan navigasi yang intuitif.

## Default Login

Saat ini aplikasi belum memiliki sistem autentikasi. Untuk development, semua fitur dapat diakses langsung.

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run in production mode
npm start
```

## License

© 2024 Rahmah Travel. All rights reserved.

## Support

Untuk pertanyaan dan dukungan, hubungi tim IT Rahmah Travel.
