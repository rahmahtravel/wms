const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all branches
router.get('/', async (req, res) => {
  try {
    const [branches] = await db.query('SELECT * FROM branches ORDER BY id ASC');
    res.render('branches/index', { title: 'Data Cabang', branches, body: '' });
  } catch (error) {
    console.error('Branches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create branch page
router.get('/create', (req, res) => {
  res.render('branches/create', { title: 'Tambah Cabang', body: '' });
});

// Store branch
router.post('/', async (req, res) => {
  try {
    const { nama_cabang, alamat, telepon, email, whatsapp, deskripsi } = req.body;
    await db.query(
      'INSERT INTO branches (nama_cabang, alamat, telepon, email, whatsapp, deskripsi) VALUES (?, ?, ?, ?, ?, ?)',
      [nama_cabang, alamat, telepon, email, whatsapp, deskripsi]
    );
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/branches');
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Edit branch page
router.get('/edit/:id', async (req, res) => {
  try {
    const [branches] = await db.query('SELECT * FROM branches WHERE id = ?', [req.params.id]);
    if (branches.length === 0) {
      return res.status(404).send('Branch not found');
    }
    res.render('branches/edit', { title: 'Edit Cabang', branch: branches[0], body: '' });
  } catch (error) {
    console.error('Edit branch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update branch
router.post('/edit/:id', async (req, res) => {
  try {
    const { nama_cabang, alamat, telepon, email, whatsapp, deskripsi } = req.body;
    await db.query(
      'UPDATE branches SET nama_cabang = ?, alamat = ?, telepon = ?, email = ?, whatsapp = ?, deskripsi = ? WHERE id = ?',
      [nama_cabang, alamat, telepon, email, whatsapp, deskripsi, req.params.id]
    );
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/branches');
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete branch
router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM branches WHERE id = ?', [req.params.id]);
    res.redirect('/branches');
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
