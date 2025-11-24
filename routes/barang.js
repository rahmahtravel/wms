const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [barang] = await db.query(`
      SELECT pb.*, pc.name as category_name, jb.nama_jenis
      FROM purchasing_barang pb
      LEFT JOIN purchasing_categories pc ON pb.category_id = pc.id
      LEFT JOIN jenis_barang jb ON pb.id_jenis_barang = jb.id
      ORDER BY pb.created_at DESC
    `);
    res.render('barang/index', { title: 'Data Barang', barang, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      size_type 
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

    const values = [
      parsedCategoryId,                       // category_id (INT, nullable)
      parsedJenisBarangId,                    // id_jenis_barang (INT, nullable)
      kode_barang.toString().substring(0, 20), // kode_barang (VARCHAR 20, required)
      nama_barang.toString().substring(0, 255), // nama_barang (VARCHAR 255, required)
      satuan,                                 // satuan (ENUM, required)
      parsedStockMinimal,                     // stock_minimal (INT, default 10)
      0,                                      // stock_akhir (INT, default 0)
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
                  stock_minimal, stock_akhir, is_required, is_dynamic, size_type) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
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
    const { category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, is_required, is_dynamic, size_type } = req.body;
    await db.query(
      'UPDATE purchasing_barang SET category_id = ?, id_jenis_barang = ?, kode_barang = ?, nama_barang = ?, satuan = ?, stock_minimal = ?, is_required = ?, is_dynamic = ?, size_type = ? WHERE id_barang = ?',
      [category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, is_required || 0, is_dynamic || 0, size_type, req.params.id]
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
      SELECT pb.*, pc.name as category_name, jb.nama_jenis
      FROM purchasing_barang pb
      LEFT JOIN purchasing_categories pc ON pb.category_id = pc.id
      LEFT JOIN jenis_barang jb ON pb.id_jenis_barang = jb.id
      WHERE pb.id_barang = ?
    `, [req.params.id]);
    res.json(barang[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, is_required, is_dynamic, size_type } = req.body;
    await db.query(
      'UPDATE purchasing_barang SET category_id = ?, id_jenis_barang = ?, kode_barang = ?, nama_barang = ?, satuan = ?, stock_minimal = ?, is_required = ?, is_dynamic = ?, size_type = ? WHERE id_barang = ?',
      [category_id, id_jenis_barang, kode_barang, nama_barang, satuan, stock_minimal, is_required || 0, is_dynamic || 0, size_type, req.params.id]
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

module.exports = router;
