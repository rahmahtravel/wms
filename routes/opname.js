const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hasColumn, pickColumn } = require('../lib/dbUtils');

// Stock opname - Main list
router.get('/', async (req, res) => {
  try {
    // Get all stock opname records with related data
    const [opnameRecords] = await db.query(`
      SELECT 
        so.*,
        pb.nama_barang,
        pb.kode_barang,
        u.name as user_name
      FROM stock_opname so
      LEFT JOIN purchasing_barang pb ON so.id_barang = pb.id_barang
      LEFT JOIN users u ON so.user_id = u.id
      ORDER BY so.tanggal_stockopname DESC
    `);
    
    // Get barang for dropdown
    const [barangList] = await db.query('SELECT id_barang, kode_barang, nama_barang FROM purchasing_barang ORDER BY nama_barang');
    
    // Get users for dropdown
    const [users] = await db.query('SELECT id, name FROM users WHERE deleted_at IS NULL ORDER BY name');
    
    res.render('opname/index', { 
      title: 'Stock Opname', 
      opnameRecords, 
      barangList,
      users,
      currentPath: '/opname'
    });
  } catch (error) {
    console.error('Error in /opname:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create opname record
router.post('/', async (req, res) => {
  try {
    const { session_id, id_barang, jumlah, no_seri_unit, status, keterangan } = req.body;
    
    // Parse no_seri_unit if it's a string
    const serialNumbers = no_seri_unit ? (typeof no_seri_unit === 'string' ? JSON.parse(no_seri_unit) : no_seri_unit) : null;
    
    await db.query(
      'INSERT INTO stock_opname (session_id, id_barang, jumlah, no_seri_unit, tanggal_stockopname, status, user_id, keterangan) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)',
      [session_id || null, id_barang, jumlah || 0, serialNumbers ? JSON.stringify(serialNumbers) : null, status || 'draft', req.session.user?.id || 1, keterangan]
    );
    res.redirect('/opname');
  } catch (error) {
    console.error('Error creating opname:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get opname data for edit
router.get('/data/:id', async (req, res) => {
  try {
    const [records] = await db.query('SELECT * FROM stock_opname WHERE id = ?', [req.params.id]);
    if (records.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(records[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update opname record
router.post('/update/:id', async (req, res) => {
  try {
    const { session_id, id_barang, jumlah, no_seri_unit, status, keterangan } = req.body;
    
    // Parse no_seri_unit if it's a string
    const serialNumbers = no_seri_unit ? (typeof no_seri_unit === 'string' ? JSON.parse(no_seri_unit) : no_seri_unit) : null;
    
    await db.query(
      'UPDATE stock_opname SET session_id = ?, id_barang = ?, jumlah = ?, no_seri_unit = ?, status = ?, keterangan = ? WHERE id = ?',
      [session_id || null, id_barang, jumlah || 0, serialNumbers ? JSON.stringify(serialNumbers) : null, status || 'draft', keterangan, req.params.id]
    );
    res.redirect('/opname');
  } catch (error) {
    console.error('Error updating opname:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete opname record
router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM stock_opname WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Data stock opname berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create session
router.get('/create', async (req, res) => {
  try {
    const wlHasIsActive = await hasColumn('warehouse_locations', 'is_active');
    const [warehouses] = await db.query(`SELECT * FROM warehouse_locations ${wlHasIsActive ? 'WHERE is_active = 1' : ''}`);
    const [branches] = await db.query('SELECT * FROM branches');
    res.render('opname/create', { title: 'Buat Sesi Opname', warehouses, branches, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { session_name, tanggal_mulai, warehouse_id, branch_id, keterangan } = req.body;
    await db.query(
      'INSERT INTO stock_opname_session (session_name, tanggal_mulai, status, warehouse_id, branch_id, user_id, total_items, total_scanned, keterangan) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)',
      [session_name, tanggal_mulai, 'ongoing', warehouse_id, branch_id, 1, keterangan]
    );
    res.redirect('/opname');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single record data for detail view (AJAX)
router.get('/record/:id/data', async (req, res) => {
  try {
    const [records] = await db.query(`
      SELECT so.*, 
             pb.nama_barang, 
             pb.kode_barang,
             u.name as user_name
      FROM stock_opname so
      LEFT JOIN purchasing_barang pb ON so.id_barang = pb.id_barang
      LEFT JOIN users u ON so.user_id = u.id
      WHERE so.id = ?
    `, [req.params.id]);
    
    if (records.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    
    res.json(records[0]);
  } catch (error) {
    console.error('Error fetching record data:', error);
    res.status(500).json({ error: error.message });
  }
});

// View single opname record details
router.get('/session/:id', async (req, res) => {
  try {
    // Fetch single opname record with related data
    const [records] = await db.query(`
      SELECT so.*, 
             pb.nama_barang, 
             pb.kode_barang,
             u.name as user_name
      FROM stock_opname so
      LEFT JOIN purchasing_barang pb ON so.id_barang = pb.id_barang
      LEFT JOIN users u ON so.user_id = u.id
      WHERE so.id = ?
    `, [req.params.id]);
    
    if (records.length === 0) {
      return res.status(404).render('404', { 
        title: '404 - Not Found',
        message: 'Data stock opname tidak ditemukan' 
      });
    }
    
    res.render('opname/view', { 
      title: 'Detail Stock Opname', 
      record: records[0]
    });
  } catch (error) {
    console.error('Error fetching opname detail:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add opname item
router.post('/session/:id/add-item', async (req, res) => {
  try {
    const { id_barang, jumlah, rack_id, bin_id, warehouse_id, branch_id, keterangan } = req.body;
    await db.query(
      'INSERT INTO stock_opname (session_id, id_barang, jumlah, tanggal_stockopname, status, warehouse_id, rack_id, bin_id, branch_id, user_id, keterangan) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, id_barang, jumlah, 'completed', warehouse_id, rack_id, bin_id, branch_id, 1, keterangan]
    );
    
    // Update session totals
    await db.query(
      'UPDATE stock_opname_session SET total_scanned = total_scanned + 1 WHERE id = ?',
      [req.params.id]
    );
    
    res.redirect(`/opname/session/${req.params.id}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session data for edit
router.get('/session/:id/data', async (req, res) => {
  try {
    const [sessions] = await db.query('SELECT * FROM stock_opname_session WHERE id = ?', [req.params.id]);
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    }
    res.json(sessions[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session
router.post('/update/:id', async (req, res) => {
  try {
    const { session_name, tanggal_mulai, warehouse_id, branch_id, keterangan } = req.body;
    await db.query(
      'UPDATE stock_opname_session SET session_name = ?, tanggal_mulai = ?, warehouse_id = ?, branch_id = ?, keterangan = ? WHERE id = ?',
      [session_name, tanggal_mulai, warehouse_id, branch_id, keterangan, req.params.id]
    );
    res.redirect('/opname');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session
router.post('/delete/:id', async (req, res) => {
  try {
    // Delete all opname items first
    await db.query('DELETE FROM stock_opname WHERE session_id = ?', [req.params.id]);
    // Delete session
    await db.query('DELETE FROM stock_opname_session WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Sesi opname berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
