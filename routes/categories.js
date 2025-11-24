const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM purchasing_categories ORDER BY created_at DESC');
    res.render('categories/index', { title: 'Kategori Perlengkapan', categories, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/create', (req, res) => {
  res.render('categories/create', { title: 'Tambah Kategori', body: '' });
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    await db.query('INSERT INTO purchasing_categories (name) VALUES (?)', [name]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/categories');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/edit/:id', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM purchasing_categories WHERE id = ?', [req.params.id]);
    res.render('categories/edit', { title: 'Edit Kategori', category: categories[0], body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await db.query('UPDATE purchasing_categories SET name = ? WHERE id = ?', [name, req.params.id]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/categories');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// RESTful PUT handler for update via fetch
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await db.query('UPDATE purchasing_categories SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_categories WHERE id = ?', [req.params.id]);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json')) || (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/categories');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category data as JSON for AJAX editing
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM purchasing_categories WHERE id = ?', [req.params.id]);
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Support DELETE via RESTful endpoint for fetch
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
