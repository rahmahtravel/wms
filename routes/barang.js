const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    // Get sorting parameters from query
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';
    
    console.log('=== GET /barang ===');
    console.log('Sort By:', sortBy);
    console.log('Sort Order:', sortOrder);
    console.log('Is AJAX:', req.xhr || req.headers.accept?.indexOf('json') > -1);
    
    // Whitelist valid columns for sorting to prevent SQL injection
    const validColumns = {
      'id_barang': 'pb.id_barang',
      'kode_barang': 'pb.kode_barang',
      'nama_barang': 'pb.nama_barang',
      'category_name': 'pc.name',
      'nama_jenis': 'jb.nama_jenis',
      'stock_akhir': 'pb.stock_akhir',
      'stock_minimal': 'pb.stock_minimal',
      'satuan': 'pb.satuan',
      'created_at': 'pb.created_at',
      'updated_at': 'pb.updated_at'
    };
    
    // Validate sortBy and sortOrder
    const orderByColumn = validColumns[sortBy] || 'pb.created_at';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    console.log('Order by:', orderByColumn, orderDirection);
    
    const [barang] = await db.query(`
      SELECT pb.*, pc.name as category_name, jb.nama_jenis,
             wl.nama_lokasi as warehouse_name, wl.kode_lokasi as warehouse_code, wl.tipe_lokasi as warehouse_type,
             wr.nama_rak as rack_name, wr.kode_rak as rack_code,
             wb.nama_bin as bin_name, wb.kode_bin as bin_code
      FROM purchasing_barang pb
      LEFT JOIN purchasing_categories pc ON pb.category_id = pc.id
      LEFT JOIN jenis_barang jb ON pb.id_jenis_barang = jb.id
      LEFT JOIN warehouse_locations wl ON pb.warehouse_id = wl.id
      LEFT JOIN warehouse_racks wr ON pb.rack_id = wr.id
      LEFT JOIN warehouse_bins wb ON pb.bin_id = wb.id
      ORDER BY ${orderByColumn} ${orderDirection}
    `);
    
    console.log('Total barang found:', barang.length);
    
    // Check if it's an AJAX request
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      console.log('Returning JSON response');
      return res.json({ success: true, barang, count: barang.length });
    }
    
    console.log('Rendering EJS template');
    res.render('barang/index', { 
      title: 'Data Barang', 
      barang, 
      body: '',
      sortBy,
      sortOrder 
    });
  } catch (error) {
    console.error('=== ERROR in GET /barang ===');
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/create', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM purchasing_categories');
    const [jenisBarang] = await db.query('SELECT * FROM jenis_barang');
    res.render('barang/create', { title: 'Tambah Barang', categories, jenisBarang, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('=== POST /barang - Received data ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Content-Type:', req.headers['content-type']);
    
    const { 
      category_id, 
      id_jenis_barang, 
      kode_barang, 
      nama_barang, 
      satuan, 
      stock_minimal, 
      is_required, 
      is_dynamic, 
      size_type,
      warehouse_id,
      rack_id,
      bin_id
    } = req.body;

    // Validasi data required
    if (!kode_barang || !nama_barang || !satuan) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ 
        success: false, 
        error: 'Kode barang, nama barang, dan satuan wajib diisi' 
      });
    }

    // Validasi enum satuan
    const validSatuan = ['pcs', 'set', 'pack'];
    if (!validSatuan.includes(satuan)) {
      console.log('Validation failed: Invalid satuan:', satuan);
      return res.status(400).json({ 
        success: false, 
        error: 'Satuan harus pcs, set, atau pack' 
      });
    }

    // Validasi enum size_type
    const validSizeType = ['none', 'clothing', 'age_group'];
    const finalSizeType = size_type && validSizeType.includes(size_type) ? size_type : 'none';

    // Parse dan prepare values dengan default yang benar
    const parsedCategoryId = category_id ? parseInt(category_id) : null;
    const parsedJenisBarangId = id_jenis_barang ? parseInt(id_jenis_barang) : null;
    const parsedStockMinimal = stock_minimal ? parseInt(stock_minimal) : 10;
    const parsedIsRequired = (is_required === 1 || is_required === '1' || is_required === true) ? 1 : 0;
    const parsedIsDynamic = (is_dynamic === 1 || is_dynamic === '1' || is_dynamic === true) ? 1 : 0;

    // Parse warehouse fields
    const parsedWarehouseId = warehouse_id ? parseInt(warehouse_id) : null;
    const parsedRackId = rack_id ? parseInt(rack_id) : null;
    const parsedBinId = bin_id ? parseInt(bin_id) : null;

    const values = [
      parsedCategoryId,                       // category_id (INT, nullable)
      parsedJenisBarangId,                    // id_jenis_barang (INT, nullable)
      kode_barang.toString().substring(0, 20), // kode_barang (VARCHAR 20, required)
      nama_barang.toString().substring(0, 255), // nama_barang (VARCHAR 255, required)
      satuan,                                 // satuan (ENUM, required)
      parsedStockMinimal,                     // stock_minimal (INT, default 10)
      0,                                      // stock_akhir (INT, default 0)
      parsedWarehouseId,                      // warehouse_id (INT, nullable)
      parsedRackId,                           // rack_id (INT, nullable)
      parsedBinId,                            // bin_id (INT, nullable)
      parsedIsRequired,                       // is_required (TINYINT, default 0)
      parsedIsDynamic,                        // is_dynamic (TINYINT, default 0)
      finalSizeType                           // size_type (ENUM, default 'none')
    ];

    console.log('=== Prepared values for INSERT ===');
    console.log('Values:', values);
    console.log('category_id:', parsedCategoryId, typeof parsedCategoryId);
    console.log('id_jenis_barang:', parsedJenisBarangId, typeof parsedJenisBarangId);
    console.log('kode_barang:', values[2], typeof values[2]);
    console.log('nama_barang:', values[3], typeof values[3]);
    console.log('satuan:', values[4], typeof values[4]);
    console.log('stock_minimal:', parsedStockMinimal, typeof parsedStockMinimal);
    console.log('is_required:', parsedIsRequired, typeof parsedIsRequired);
    console.log('is_dynamic:', parsedIsDynamic, typeof parsedIsDynamic);
    console.log('size_type:', finalSizeType, typeof finalSizeType);

    // Execute INSERT query
    const sql = `INSERT INTO purchasing_barang 
                 (category_id, id_jenis_barang, kode_barang, nama_barang, satuan, 
                  stock_minimal, stock_akhir, warehouse_id, rack_id, bin_id, 
                  is_required, is_dynamic, size_type) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    console.log('=== Executing SQL ===');
    console.log('SQL:', sql);
    
    const [result] = await db.query(sql, values);

    console.log('=== Insert SUCCESS ===');
    console.log('Insert result:', result);
    console.log('Insert ID:', result.insertId);
    console.log('Affected rows:', result.affectedRows);

    // Check if AJAX request
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json')) || 
                   (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    
    if (isAjax) {
      return res.json({ 
        success: true, 
        message: 'Data berhasil ditambahkan ke database',
        insertId: result.insertId,
        affectedRows: result.affectedRows
      });
    }
    
    res.redirect('/barang');
  } catch (error) {
    console.error('=== INSERT ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error sqlMessage:', error.sqlMessage);
    
    res.status(500).json({ 
      success: false, 
      error: error.sqlMessage || error.message || 'Terjadi kesalahan saat menyimpan data',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get form data (categories and jenis_barang) for AJAX
router.get('/form-data', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM purchasing_categories ORDER BY name');
    const [jenisBarang] = await db.query('SELECT * FROM jenis_barang ORDER BY nama_jenis');
    res.json({ categories, jenisBarang });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/edit/:id', async (req, res) => {
  try {
    const [barang] = await db.query('SELECT * FROM purchasing_barang WHERE id_barang = ?', [req.params.id]);
    const [categories] = await db.query('SELECT * FROM purchasing_categories');
    const [jenisBarang] = await db.query('SELECT * FROM jenis_barang');
    res.render('barang/edit', { title: 'Edit Barang', barang: barang[0], categories, jenisBarang, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update/:id', async (req, res) => {
  try {
    const { category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, warehouse_id, rack_id, bin_id, is_required, is_dynamic, size_type } = req.body;
    await db.query(
      'UPDATE purchasing_barang SET category_id = ?, id_jenis_barang = ?, kode_barang = ?, nama_barang = ?, satuan = ?, stock_minimal = ?, warehouse_id = ?, rack_id = ?, bin_id = ?, is_required = ?, is_dynamic = ?, size_type = ? WHERE id_barang = ?',
      [category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, warehouse_id || null, rack_id || null, bin_id || null, is_required || 0, is_dynamic || 0, size_type, req.params.id]
    );
    res.redirect('/barang');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_barang WHERE id_barang = ?', [req.params.id]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/barang');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RESTful endpoints for AJAX operations
router.get('/:id', async (req, res) => {
  try {
    const [barang] = await db.query(`
      SELECT pb.*, pc.name as category_name, jb.nama_jenis,
             wl.nama_lokasi as warehouse_name, wl.kode_lokasi as warehouse_code, wl.tipe_lokasi as warehouse_type,
             wr.nama_rak as rack_name, wr.kode_rak as rack_code,
             wb.nama_bin as bin_name, wb.kode_bin as bin_code
      FROM purchasing_barang pb
      LEFT JOIN purchasing_categories pc ON pb.category_id = pc.id
      LEFT JOIN jenis_barang jb ON pb.id_jenis_barang = jb.id
      LEFT JOIN warehouse_locations wl ON pb.warehouse_id = wl.id AND wl.deleted_at IS NULL
      LEFT JOIN warehouse_racks wr ON pb.rack_id = wr.id AND wr.deleted_at IS NULL
      LEFT JOIN warehouse_bins wb ON pb.bin_id = wb.id AND wb.deleted_at IS NULL
      WHERE pb.id_barang = ?
    `, [req.params.id]);
    res.json(barang[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, warehouse_id, rack_id, bin_id, is_required, is_dynamic, size_type } = req.body;
    await db.query(
      'UPDATE purchasing_barang SET category_id = ?, id_jenis_barang = ?, kode_barang = ?, nama_barang = ?, satuan = ?, stock_minimal = ?, warehouse_id = ?, rack_id = ?, bin_id = ?, is_required = ?, is_dynamic = ?, size_type = ? WHERE id_barang = ?',
      [category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, warehouse_id || null, rack_id || null, bin_id || null, is_required || 0, is_dynamic || 0, size_type, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_barang WHERE id_barang = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint untuk mengambil data warehouse locations
router.get('/api/warehouses', async (req, res) => {
  try {
    console.log('Loading warehouses...');
    
    const [warehouses] = await db.query(`
      SELECT id, kode_lokasi, nama_lokasi, tipe_lokasi, alamat, telepon, pic
      FROM warehouse_locations 
      ORDER BY nama_lokasi ASC
    `);
    
    console.log(`Found ${warehouses.length} warehouses:`, warehouses);
    
    res.json({ success: true, warehouses });
  } catch (error) {
    console.error('Error loading warehouses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint untuk mengambil racks berdasarkan warehouse_id
router.get('/api/racks/:warehouseId', async (req, res) => {
  try {
    console.log('Loading racks for warehouse ID:', req.params.warehouseId);
    
    const [racks] = await db.query(`
      SELECT id, kode_rak, nama_rak, deskripsi
      FROM warehouse_racks 
      WHERE warehouse_id = ?
      ORDER BY nama_rak ASC
    `, [req.params.warehouseId]);
    
    console.log(`Found ${racks.length} racks for warehouse ${req.params.warehouseId}:`, racks);
    
    res.json({ success: true, racks });
  } catch (error) {
    console.error('Error loading racks for warehouse', req.params.warehouseId, ':', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint untuk mengambil bins berdasarkan rack_id
router.get('/api/bins/:rackId', async (req, res) => {
  try {
    const [bins] = await db.query(`
      SELECT id, kode_bin, nama_bin, 
             CONCAT('Level: ', level_posisi, ', Column: ', kolom_posisi) as deskripsi
      FROM warehouse_bins 
      WHERE rack_id = ?
      ORDER BY nama_bin ASC
    `, [req.params.rackId]);
    res.json({ success: true, bins });
  } catch (error) {
    console.error('Error loading bins:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint untuk update warehouse location pada barang
router.post('/api/update-warehouse/:id', async (req, res) => {
  try {
    const { warehouse_id, rack_id, bin_id } = req.body;
    const barangId = req.params.id;
    
    // Validasi input
    const parsedWarehouseId = warehouse_id ? parseInt(warehouse_id) : null;
    const parsedRackId = rack_id ? parseInt(rack_id) : null;
    const parsedBinId = bin_id ? parseInt(bin_id) : null;
    
    // Validasi bahwa warehouse_id valid jika diisi
    if (parsedWarehouseId) {
      const [warehouse] = await db.query(
        'SELECT id FROM warehouse_locations WHERE id = ?',
        [parsedWarehouseId]
      );
      if (warehouse.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Warehouse ID tidak valid atau tidak ditemukan' 
        });
      }
    }
    
    // Validasi bahwa rack_id valid jika diisi
    if (parsedRackId) {
      const [rack] = await db.query(
        'SELECT id FROM warehouse_racks WHERE id = ? AND warehouse_id = ?',
        [parsedRackId, parsedWarehouseId]
      );
      if (rack.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Rack ID tidak valid atau tidak sesuai dengan warehouse' 
        });
      }
    }
    
    // Validasi bahwa bin_id valid jika diisi
    if (parsedBinId) {
      const [bin] = await db.query(
        'SELECT id FROM warehouse_bins WHERE id = ? AND rack_id = ?',
        [parsedBinId, parsedRackId]
      );
      if (bin.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Bin ID tidak valid atau tidak sesuai dengan rack' 
        });
      }
    }
    
    // Update warehouse location pada barang
    await db.query(`
      UPDATE purchasing_barang 
      SET warehouse_id = ?, rack_id = ?, bin_id = ?, updated_at = NOW()
      WHERE id_barang = ?
    `, [parsedWarehouseId, parsedRackId, parsedBinId, barangId]);
    
    res.json({ 
      success: true, 
      message: 'Lokasi warehouse berhasil diupdate',
      data: {
        warehouse_id: parsedWarehouseId,
        rack_id: parsedRackId,
        bin_id: parsedBinId
      }
    });
  } catch (error) {
    console.error('Error updating warehouse location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
