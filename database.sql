-- Create Database
CREATE DATABASE IF NOT EXISTS rahmah_purchasing_logistics;
USE rahmah_purchasing_logistics;

-- Table: branches
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: purchasing_categories
CREATE TABLE IF NOT EXISTS purchasing_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: jenis_barang
CREATE TABLE IF NOT EXISTS jenis_barang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_jenis VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: purchasing_suppliers
CREATE TABLE IF NOT EXISTS purchasing_suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    supplier_link VARCHAR(500),
    items TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: purchasing_barang
CREATE TABLE IF NOT EXISTS purchasing_barang (
    id_barang INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    id_jenis_barang INT,
    kode_barang VARCHAR(100) UNIQUE,
    nama_barang VARCHAR(255) NOT NULL,
    satuan VARCHAR(50),
    stock_minimal INT DEFAULT 0,
    stock_akhir INT DEFAULT 0,
    is_required TINYINT DEFAULT 0,
    is_dynamic TINYINT DEFAULT 0,
    size_type ENUM('S', 'M', 'L', 'XL', 'XXL', 'NONE') DEFAULT 'NONE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES purchasing_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (id_jenis_barang) REFERENCES jenis_barang(id) ON DELETE SET NULL
);

-- Table: warehouse_locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_code VARCHAR(50) UNIQUE NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type ENUM('HQ', 'BRANCH', 'TRANSIT') DEFAULT 'BRANCH',
    address TEXT,
    phone VARCHAR(50),
    pic_name VARCHAR(255),
    pic_phone VARCHAR(50),
    branch_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: warehouse_racks
CREATE TABLE IF NOT EXISTS warehouse_racks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    rack_code VARCHAR(50) NOT NULL,
    rack_name VARCHAR(255) NOT NULL,
    description TEXT,
    capacity_weight DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id) ON DELETE CASCADE
);

-- Table: warehouse_bins
CREATE TABLE IF NOT EXISTS warehouse_bins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rack_id INT NOT NULL,
    bin_code VARCHAR(50) NOT NULL,
    bin_name VARCHAR(255) NOT NULL,
    position_level INT,
    position_column CHAR(1),
    capacity_items INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rack_id) REFERENCES warehouse_racks(id) ON DELETE CASCADE
);

-- Table: purchasing_item_units
CREATE TABLE IF NOT EXISTS purchasing_item_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barang INT NOT NULL,
    id_supplier INT,
    invoice_tagihan VARCHAR(255),
    no_invoice VARCHAR(255),
    harga_invoice DECIMAL(15,2),
    jumlah_order INT,
    jumlah_dibayar INT,
    jumlah_masuk INT,
    file_pembayaran VARCHAR(500),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (id_supplier) REFERENCES purchasing_suppliers(id) ON DELETE SET NULL
);

-- Table: warehouse_stock
CREATE TABLE IF NOT EXISTS warehouse_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barang INT NOT NULL,
    warehouse_id INT NOT NULL,
    rack_id INT,
    bin_id INT,
    unit_id INT,
    branch_id INT,
    quantity INT DEFAULT 0,
    reserved_qty INT DEFAULT 0,
    available_qty INT DEFAULT 0,
    last_movement_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (rack_id) REFERENCES warehouse_racks(id) ON DELETE SET NULL,
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES purchasing_item_units(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: purchasing_incoming
CREATE TABLE IF NOT EXISTS purchasing_incoming (
    id_masuk INT AUTO_INCREMENT PRIMARY KEY,
    id_barang INT NOT NULL,
    jumlah INT NOT NULL,
    tanggal_masuk DATE NOT NULL,
    supplier VARCHAR(255),
    no_invoice VARCHAR(255),
    user_id INT,
    supplier_id INT,
    warehouse_id INT,
    rack_id INT,
    bin_id INT,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES purchasing_suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    FOREIGN KEY (rack_id) REFERENCES warehouse_racks(id) ON DELETE SET NULL,
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: purchasing_barang_keluar
CREATE TABLE IF NOT EXISTS purchasing_barang_keluar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barang INT NOT NULL,
    jumlah_keluar INT NOT NULL,
    tanggal_keluar DATE NOT NULL,
    keterangan TEXT,
    unit_ids TEXT,
    warehouse_id INT,
    rack_id INT,
    bin_id INT,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    FOREIGN KEY (rack_id) REFERENCES warehouse_racks(id) ON DELETE SET NULL,
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: warehouse_transfers
CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_number VARCHAR(100) UNIQUE NOT NULL,
    from_warehouse_id INT NOT NULL,
    to_warehouse_id INT NOT NULL,
    from_branch_id INT,
    to_branch_id INT,
    transfer_date DATE NOT NULL,
    status ENUM('draft', 'pending', 'in_transit', 'received', 'cancelled') DEFAULT 'draft',
    requested_by INT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    shipped_by INT,
    shipped_at TIMESTAMP NULL,
    received_by INT,
    received_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouse_locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (to_branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: warehouse_transfer_items
CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id INT NOT NULL,
    id_barang INT NOT NULL,
    unit_id INT,
    from_rack_id INT,
    from_bin_id INT,
    to_rack_id INT,
    to_bin_id INT,
    quantity_requested INT NOT NULL,
    quantity_shipped INT DEFAULT 0,
    quantity_received INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES purchasing_item_units(id) ON DELETE SET NULL
);

-- Table: stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barang INT NOT NULL,
    warehouse_id INT NOT NULL,
    rack_id INT,
    bin_id INT,
    unit_id INT,
    branch_id INT,
    movement_type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'OPNAME') NOT NULL,
    reference_type ENUM('INCOMING', 'OUTGOING', 'TRANSFER', 'ADJUSTMENT', 'OPNAME') NOT NULL,
    reference_id INT,
    quantity_before INT DEFAULT 0,
    quantity_change INT NOT NULL,
    quantity_after INT DEFAULT 0,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (rack_id) REFERENCES warehouse_racks(id) ON DELETE SET NULL,
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES purchasing_item_units(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: stock_opname_session
CREATE TABLE IF NOT EXISTS stock_opname_session (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    status ENUM('ongoing', 'completed', 'cancelled') DEFAULT 'ongoing',
    user_id INT,
    total_items INT DEFAULT 0,
    total_scanned INT DEFAULT 0,
    keterangan TEXT,
    warehouse_id INT,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: stock_opname
CREATE TABLE IF NOT EXISTS stock_opname (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    id_barang INT NOT NULL,
    jumlah INT NOT NULL,
    no_seri_unit VARCHAR(255),
    tanggal_stockopname DATE NOT NULL,
    status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
    user_id INT,
    keterangan TEXT,
    warehouse_id INT,
    rack_id INT,
    bin_id INT,
    unit_id INT,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES stock_opname_session(id) ON DELETE CASCADE,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_locations(id) ON DELETE SET NULL,
    FOREIGN KEY (rack_id) REFERENCES warehouse_racks(id) ON DELETE SET NULL,
    FOREIGN KEY (bin_id) REFERENCES warehouse_bins(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES purchasing_item_units(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: purchasing_rejects
CREATE TABLE IF NOT EXISTS purchasing_rejects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barang INT NOT NULL,
    jumlah INT NOT NULL,
    alasan TEXT,
    tanggal_reject DATE NOT NULL,
    user_id INT,
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Table: purchasing_public_docs
CREATE TABLE IF NOT EXISTS purchasing_public_docs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_details_id INT,
    nama_penerima VARCHAR(255),
    nomor_telp VARCHAR(50),
    alamat_lengkap TEXT,
    provinsi_id INT,
    kabupaten_id INT,
    kecamatan VARCHAR(255),
    kelurahan VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: request_perlengkapan
CREATE TABLE IF NOT EXISTS request_perlengkapan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    public_docs_id INT,
    status ENUM('pending', 'confirmed', 'finished', 'cancelled') DEFAULT 'pending',
    requested_by INT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_by INT,
    confirmed_at TIMESTAMP NULL,
    finished_by INT,
    finished_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (public_docs_id) REFERENCES purchasing_public_docs(id) ON DELETE CASCADE
);

-- Table: jamaah_kelengkapan
CREATE TABLE IF NOT EXISTS jamaah_kelengkapan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_details_id INT,
    id_barang INT,
    kepala_keluarga_id VARCHAR(255),
    kain_ihram_mukena TINYINT DEFAULT 0,
    ukuran_kain_ihram_mukena VARCHAR(10),
    jilbab TINYINT DEFAULT 0,
    ukuran_jilbab VARCHAR(10),
    koper TINYINT DEFAULT 0,
    tas_paspor TINYINT DEFAULT 0,
    tas_serut TINYINT DEFAULT 0,
    ukuran_tas_serut VARCHAR(10),
    buku_doa TINYINT DEFAULT 0,
    jaket TINYINT DEFAULT 0,
    ukuran_jaket VARCHAR(10),
    syal TINYINT DEFAULT 0,
    status_pengambilan ENUM('pending', 'diambil', 'dikirim') DEFAULT 'pending',
    status_alamat ENUM('lengkap', 'tidak_lengkap') DEFAULT 'tidak_lengkap',
    ekspedisi ENUM('JNE', 'JNT', 'SiCepat', 'AnterAja', 'Lainnya'),
    status_pengiriman ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    tanggal_pengiriman DATE,
    tracking_status VARCHAR(255),
    tracking_location VARCHAR(255),
    tracking_notes TEXT,
    tracking_history LONGTEXT,
    last_tracked_at TIMESTAMP NULL,
    no_resi VARCHAR(255),
    tanggal_pengambilan TIMESTAMP NULL,
    catatan TEXT,
    is_checked TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barang) REFERENCES purchasing_barang(id_barang) ON DELETE SET NULL
);

-- Table: jamaah_kelengkapan_items
CREATE TABLE IF NOT EXISTS jamaah_kelengkapan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kelengkapan_id INT NOT NULL,
    barang_id INT NOT NULL,
    unit_id INT,
    is_selected TINYINT DEFAULT 0,
    ukuran VARCHAR(10),
    jenis_barang_id INT,
    is_stock_reduced TINYINT DEFAULT 0,
    stock_reduced_at TIMESTAMP NULL,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (kelengkapan_id) REFERENCES jamaah_kelengkapan(id) ON DELETE CASCADE,
    FOREIGN KEY (barang_id) REFERENCES purchasing_barang(id_barang) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES purchasing_item_units(id) ON DELETE SET NULL,
    FOREIGN KEY (jenis_barang_id) REFERENCES jenis_barang(id) ON DELETE SET NULL
);

-- Table: rekap_ongkir
CREATE TABLE IF NOT EXISTS rekap_ongkir (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    kelengkapan_id INT,
    nominal INT,
    bukti_tf VARCHAR(500),
    mutasi VARCHAR(500),
    status ENUM('pending', 'paid', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (kelengkapan_id) REFERENCES jamaah_kelengkapan(id) ON DELETE SET NULL
);