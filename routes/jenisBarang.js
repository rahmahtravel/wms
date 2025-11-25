const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    // Get jenis_barang with count of associated items from purchasing_barang
    const [jenisBarang] = await db.query(`
      SELECT 
        jb.id,
        jb.nama_jenis,
        jb.deskripsi,
        jb.created_at,
        jb.updated_at,
        COUNT(DISTINCT pb.id_barang) as total_items
      FROM jenis_barang jb
      LEFT JOIN purchasing_barang pb ON jb.id = pb.id_jenis_barang
      GROUP BY jb.id, jb.nama_jenis, jb.deskripsi, jb.created_at, jb.updated_at
      ORDER BY jb.created_at DESC
    `);
    res.render('jenis-barang/index', { title: 'Jenis Barang', jenisBarang, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/create', (req, res) => {
  res.render('jenis-barang/create', { title: 'Tambah Jenis Barang', body: '' });
});

router.post('/', async (req, res) => {
  try {
    const { nama_jenis, deskripsi } = req.body;
    await db.query('INSERT INTO jenis_barang (nama_jenis, deskripsi) VALUES (?, ?)', [nama_jenis, deskripsi]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/jenis-barang');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/edit/:id', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM jenis_barang WHERE id = ?', [req.params.id]);
    res.render('jenis-barang/edit', { title: 'Edit Jenis Barang', item: items[0], body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update via POST (for form submission)
router.post('/update/:id', async (req, res) => {
  try {
    const { nama_jenis, deskripsi } = req.body;
    await db.query('UPDATE jenis_barang SET nama_jenis = ?, deskripsi = ? WHERE id = ?', 
      [nama_jenis, deskripsi, req.params.id]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/jenis-barang');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update via PUT (for RESTful API)
router.put('/:id', async (req, res) => {
  try {
    const { nama_jenis, deskripsi } = req.body;
    
    if (!nama_jenis || nama_jenis.trim() === '') {
      return res.status(400).json({ error: 'Nama jenis tidak boleh kosong' });
    }
    
    await db.query('UPDATE jenis_barang SET nama_jenis = ?, deskripsi = ? WHERE id = ?', 
      [nama_jenis.trim(), deskripsi || null, req.params.id]);
    
    res.json({ success: true, message: 'Jenis barang berhasil diupdate' });
  } catch (error) {
    console.error('Error updating jenis barang:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get jenis_barang data as JSON for AJAX (detail view)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        jb.id,
        jb.nama_jenis,
        jb.deskripsi,
        jb.created_at,
        jb.updated_at,
        COUNT(DISTINCT pb.id_barang) as total_items
      FROM jenis_barang jb
      LEFT JOIN purchasing_barang pb ON jb.id = pb.id_jenis_barang
      WHERE jb.id = ?
      GROUP BY jb.id, jb.nama_jenis, jb.deskripsi, jb.created_at, jb.updated_at
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Jenis barang tidak ditemukan' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching jenis barang:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jenis_barang WHERE id = ?', [req.params.id]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/jenis-barang');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Support DELETE via RESTful endpoint for fetch
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jenis_barang WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
