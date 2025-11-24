const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hasColumn } = require('../lib/dbUtils');

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
    
    const { from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id, transfer_date, items } = req.body;
    
    // Generate transfer number
    const transfer_number = 'TRF-' + Date.now();
    
    // Insert transfer
    const [result] = await connection.query(
      'INSERT INTO warehouse_transfers (transfer_number, from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id, transfer_date, status, requested_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [transfer_number, from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id, transfer_date, 'draft', 1]
    );
    
    const transfer_id = result.insertId;
    
    // Insert transfer items (assuming items is JSON array)
    const itemsArray = JSON.parse(items);
    for (const item of itemsArray) {
      await connection.query(
        'INSERT INTO warehouse_transfer_items (transfer_id, id_barang, quantity_requested) VALUES (?, ?, ?)',
        [transfer_id, item.id_barang, item.quantity]
      );
    }
    
    await connection.commit();
    res.redirect('/transfer');
  } catch (error) {
    await connection.rollback();
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// View transfer details
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
