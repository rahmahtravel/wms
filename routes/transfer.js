const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hasColumn } = require('../lib/dbUtils');

// API endpoints for master data
router.get('/api/warehouses', async (req, res) => {
  try {
    const [warehouses] = await db.query('SELECT id, kode_lokasi, nama_lokasi FROM warehouse_locations ORDER BY nama_lokasi');
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/branches', async (req, res) => {
  try {
    const [branches] = await db.query('SELECT id, kode_cabang, nama_cabang FROM branches ORDER BY nama_cabang');
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/barang', async (req, res) => {
  try {
    const [barang] = await db.query('SELECT id_barang, kode_barang, nama_barang FROM purchasing_barang ORDER BY nama_barang');
    res.json(barang);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transfer list
router.get('/', async (req, res) => {
  try {
    const [transfers] = await db.query(`
      SELECT wt.*, wl1.nama_lokasi as from_location, wl2.nama_lokasi as to_location,
             b1.nama_cabang as from_branch, b2.nama_cabang as to_branch
      FROM warehouse_transfers wt
      LEFT JOIN warehouse_locations wl1 ON wt.from_warehouse_id = wl1.id
      LEFT JOIN warehouse_locations wl2 ON wt.to_warehouse_id = wl2.id
      LEFT JOIN branches b1 ON wt.from_branch_id = b1.id
      LEFT JOIN branches b2 ON wt.to_branch_id = b2.id
      ORDER BY wt.created_at DESC
    `);
    res.render('transfer/index', { title: 'Transfer Barang', transfers, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create transfer
router.get('/create', async (req, res) => {
  try {
    const wlHasIsActive = await hasColumn('warehouse_locations', 'is_active');
    const [warehouses] = await db.query(`SELECT * FROM warehouse_locations ${wlHasIsActive ? 'WHERE is_active = 1' : ''}`);
    const [branches] = await db.query('SELECT * FROM branches');
    const [barang] = await db.query('SELECT * FROM purchasing_barang');
    res.render('transfer/create', { title: 'Buat Transfer', warehouses, branches, barang, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id, transfer_date, status, notes, items } = req.body;
    
    // Generate transfer number
    const transfer_number = 'TRF-' + Date.now();
    
    // Insert transfer
    const [result] = await connection.query(
      'INSERT INTO warehouse_transfers (transfer_number, from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id, transfer_date, status, notes, requested_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [transfer_number, from_warehouse_id, to_warehouse_id, from_branch_id || null, to_branch_id || null, transfer_date, status || 'draft', notes || null, 1]
    );
    
    const transfer_id = result.insertId;
    
    // Insert transfer items
    if (items) {
      // Handle items as object with numeric keys or array
      const itemsArray = Array.isArray(items) ? items : Object.values(items);
      for (const item of itemsArray) {
        if (item.id_barang && item.quantity_requested) {
          await connection.query(
            'INSERT INTO warehouse_transfer_items (transfer_id, id_barang, quantity_requested) VALUES (?, ?, ?)',
            [transfer_id, item.id_barang, item.quantity_requested]
          );
        }
      }
    }
    
    await connection.commit();
    
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/transfer');
  } catch (error) {
    await connection.rollback();
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Get transfer data for modal (AJAX)
router.get('/:id/data', async (req, res) => {
  try {
    const [transfers] = await db.query(`
      SELECT wt.*, wl1.nama_lokasi as from_location, wl2.nama_lokasi as to_location,
             b1.nama_cabang as from_branch, b2.nama_cabang as to_branch
      FROM warehouse_transfers wt
      LEFT JOIN warehouse_locations wl1 ON wt.from_warehouse_id = wl1.id
      LEFT JOIN warehouse_locations wl2 ON wt.to_warehouse_id = wl2.id
      LEFT JOIN branches b1 ON wt.from_branch_id = b1.id
      LEFT JOIN branches b2 ON wt.to_branch_id = b2.id
      WHERE wt.id = ?
    `, [req.params.id]);
    
    const [items] = await db.query(`
      SELECT wti.*, pb.nama_barang, pb.kode_barang
      FROM warehouse_transfer_items wti
      LEFT JOIN purchasing_barang pb ON wti.id_barang = pb.id_barang
      WHERE wti.transfer_id = ?
    `, [req.params.id]);
    
    res.json({ transfer: transfers[0], items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update transfer
router.post('/update/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id, transfer_date, status, notes, items } = req.body;
    
    // Update transfer
    await connection.query(
      'UPDATE warehouse_transfers SET from_warehouse_id = ?, to_warehouse_id = ?, from_branch_id = ?, to_branch_id = ?, transfer_date = ?, status = ?, notes = ? WHERE id = ?',
      [from_warehouse_id, to_warehouse_id, from_branch_id || null, to_branch_id || null, transfer_date, status, notes || null, req.params.id]
    );
    
    // Delete existing items
    await connection.query('DELETE FROM warehouse_transfer_items WHERE transfer_id = ?', [req.params.id]);
    
    // Insert new items
    if (items) {
      const itemsObj = Object.values(items);
      for (const item of itemsObj) {
        if (item.id_barang && item.quantity_requested) {
          await connection.query(
            'INSERT INTO warehouse_transfer_items (transfer_id, id_barang, quantity_requested) VALUES (?, ?, ?)',
            [req.params.id, item.id_barang, item.quantity_requested]
          );
        }
      }
    }
    
    await connection.commit();
    
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/transfer');
  } catch (error) {
    await connection.rollback();
    console.error('Update transfer error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Delete transfer
router.post('/delete/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Delete items first (foreign key constraint)
    await connection.query('DELETE FROM warehouse_transfer_items WHERE transfer_id = ?', [req.params.id]);
    
    // Delete transfer
    await connection.query('DELETE FROM warehouse_transfers WHERE id = ?', [req.params.id]);
    
    await connection.commit();
    
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/transfer');
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// View transfer details (page view - keep for backward compatibility)
router.get('/view/:id', async (req, res) => {
  try {
    const [transfers] = await db.query(`
      SELECT wt.*, wl1.nama_lokasi as from_location, wl2.nama_lokasi as to_location,
             b1.nama_cabang as from_branch, b2.nama_cabang as to_branch
      FROM warehouse_transfers wt
      LEFT JOIN warehouse_locations wl1 ON wt.from_warehouse_id = wl1.id
      LEFT JOIN warehouse_locations wl2 ON wt.to_warehouse_id = wl2.id
      LEFT JOIN branches b1 ON wt.from_branch_id = b1.id
      LEFT JOIN branches b2 ON wt.to_branch_id = b2.id
      WHERE wt.id = ?
    `, [req.params.id]);
    
    const [items] = await db.query(`
      SELECT wti.*, pb.nama_barang, pb.kode_barang
      FROM warehouse_transfer_items wti
      LEFT JOIN purchasing_barang pb ON wti.id_barang = pb.id_barang
      WHERE wti.transfer_id = ?
    `, [req.params.id]);
    
    res.render('transfer/view', { title: 'Detail Transfer', transfer: transfers[0], items, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
