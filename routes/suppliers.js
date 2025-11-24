const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    // Get suppliers with their associated item names from purchasing_incoming
    const [suppliers] = await db.query(`
      SELECT 
        s.*,
        GROUP_CONCAT(DISTINCT b.nama_barang ORDER BY b.nama_barang SEPARATOR ', ') as item_names
      FROM purchasing_suppliers s
      LEFT JOIN purchasing_incoming pi ON s.id = pi.supplier_id
      LEFT JOIN purchasing_barang b ON pi.id_barang = b.id_barang
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.render('suppliers/index', { title: 'Data Supplier', suppliers, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/create', (req, res) => {
  res.render('suppliers/create', { title: 'Tambah Supplier', body: '' });
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, supplier_link } = req.body;
    await db.query('INSERT INTO purchasing_suppliers (name, phone, supplier_link) VALUES (?, ?, ?)', 
      [name, phone, supplier_link]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/suppliers');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/edit/:id', async (req, res) => {
  try {
    const [suppliers] = await db.query('SELECT * FROM purchasing_suppliers WHERE id = ?', [req.params.id]);
    res.render('suppliers/edit', { title: 'Edit Supplier', supplier: suppliers[0], body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update/:id', async (req, res) => {
  try {
    const { name, phone, supplier_link } = req.body;
    await db.query('UPDATE purchasing_suppliers SET name = ?, phone = ?, supplier_link = ? WHERE id = ?', 
      [name, phone, supplier_link, req.params.id]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/suppliers');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_suppliers WHERE id = ?', [req.params.id]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/suppliers');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RESTful endpoints for AJAX operations
router.get('/:id', async (req, res) => {
  try {
    const [suppliers] = await db.query('SELECT * FROM purchasing_suppliers WHERE id = ?', [req.params.id]);
    res.json(suppliers[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, supplier_link } = req.body;
    await db.query('UPDATE purchasing_suppliers SET name = ?, phone = ?, supplier_link = ? WHERE id = ?', 
      [name, phone, supplier_link, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_suppliers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
