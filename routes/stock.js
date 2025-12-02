const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { hasColumn } = require('../lib/dbUtils');

// Stock overview
router.get('/', async (req, res) => {
  try {
    // Determine correct column names for location/rack/bin/branch to avoid referencing non-existing columns
    const wlHasLocationName = await hasColumn('warehouse_locations', 'location_name');
    const wrHasRackName = await hasColumn('warehouse_racks', 'rack_name');
    const wbHasBinName = await hasColumn('warehouse_bins', 'bin_name');
    const bHasName = await hasColumn('branches', 'name');

    const wlCol = wlHasLocationName ? 'wl.location_name' : 'wl.nama_lokasi';
    const wrCol = wrHasRackName ? 'wr.rack_name' : 'wr.nama_rak';
    const wbCol = wbHasBinName ? 'wb.bin_name' : 'wb.nama_bin';
    const bCol = bHasName ? 'b.name' : 'b.nama_cabang';

    const [stocks] = await db.query(`
      SELECT ws.*, pb.nama_barang, pb.kode_barang,
        ${wlCol} as location_name,
        ${wrCol} as rack_name,
        ${wbCol} as bin_name,
        ${bCol} as branch_name
      FROM warehouse_stock ws
      LEFT JOIN purchasing_barang pb ON ws.id_barang = pb.id_barang
      LEFT JOIN warehouse_locations wl ON ws.warehouse_id = wl.id
      LEFT JOIN warehouse_racks wr ON ws.rack_id = wr.id
      LEFT JOIN warehouse_bins wb ON ws.bin_id = wb.id
      LEFT JOIN branches b ON ws.branch_id = b.id
      ORDER BY ws.created_at DESC
    `);
    res.render('stock/index', { title: 'Stok Barang', stock: stocks || [], body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock movements/history
router.get('/movements', async (req, res) => {
  try {
    const wlHasLocationName2 = await hasColumn('warehouse_locations', 'location_name');
    const bHasName2 = await hasColumn('branches', 'name');
    const wlCol2 = wlHasLocationName2 ? 'wl.location_name' : 'wl.nama_lokasi';
    const bCol2 = bHasName2 ? 'b.name' : 'b.nama_cabang';

    const [movements] = await db.query(`
      SELECT sm.*, 
        pb.nama_barang, pb.kode_barang,
        ${bCol2} as branch_name,
        u.name as user_name,
        uc.name as created_by_name,
        uu.name as updated_by_name,
        ud.name as deleted_by_name
      FROM stock_movements sm
      LEFT JOIN purchasing_barang pb ON sm.id_barang = pb.id_barang
      LEFT JOIN branches b ON sm.branch_id = b.id
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN users uc ON sm.created_by = uc.id
      LEFT JOIN users uu ON sm.updated_by = uu.id
      LEFT JOIN users ud ON sm.deleted_by = ud.id
      WHERE sm.deleted_at IS NULL
      ORDER BY sm.movement_date DESC
      LIMIT 500
    `);

    // Get data for dropdowns
    const [barangs] = await db.query('SELECT id_barang, kode_barang, nama_barang FROM purchasing_barang ORDER BY nama_barang');
    const [branches] = await db.query('SELECT id, nama_cabang FROM branches ORDER BY nama_cabang');

    res.render('stock/movements', { 
      title: 'Histori Pergerakan Stok', 
      movements, 
      barangs,
      branches,
      body: '' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get movement data for edit
router.get('/movements/:id/data', async (req, res) => {
  try {
    const [movements] = await db.query(`
      SELECT sm.*, 
        pb.nama_barang, pb.kode_barang,
        b.nama_cabang as branch_name,
        u.name as user_name,
        uc.name as created_by_name,
        uu.name as updated_by_name,
        ud.name as deleted_by_name
      FROM stock_movements sm
      LEFT JOIN purchasing_barang pb ON sm.id_barang = pb.id_barang
      LEFT JOIN branches b ON sm.branch_id = b.id
      LEFT JOIN users u ON sm.user_id = u.id
      LEFT JOIN users uc ON sm.created_by = uc.id
      LEFT JOIN users uu ON sm.updated_by = uu.id
      LEFT JOIN users ud ON sm.deleted_by = ud.id
      WHERE sm.id = ?
    `, [req.params.id]);
    res.json(movements[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create movement
router.post('/movements', async (req, res) => {
  try {
    const { 
      id_barang, unit_id, branch_id,
      movement_type, reference_type, reference_id,
      quantity_before, quantity_change, quantity_after,
      notes
    } = req.body;
    
    const userId = req.session.user ? req.session.user.id : null;
    
    await db.query(`
      INSERT INTO stock_movements (
        id_barang, unit_id, branch_id,
        movement_type, reference_type, reference_id,
        quantity_before, quantity_change, quantity_after,
        notes, user_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id_barang, unit_id || null, branch_id || null,
      movement_type, reference_type, reference_id || null,
      quantity_before || 0, quantity_change, quantity_after || 0,
      notes || null, userId, userId
    ]);

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/stock/movements');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update movement
router.post('/movements/update/:id', async (req, res) => {
  try {
    const { 
      id_barang, unit_id, branch_id,
      movement_type, reference_type, reference_id,
      quantity_before, quantity_change, quantity_after,
      notes
    } = req.body;
    
    const userId = req.session.user ? req.session.user.id : null;
    
    await db.query(`
      UPDATE stock_movements SET
        id_barang = ?, unit_id = ?, branch_id = ?,
        movement_type = ?, reference_type = ?, reference_id = ?,
        quantity_before = ?, quantity_change = ?, quantity_after = ?,
        notes = ?, updated_by = ?
      WHERE id = ?
    `, [
      id_barang, unit_id || null, branch_id || null,
      movement_type, reference_type, reference_id || null,
      quantity_before || 0, quantity_change, quantity_after || 0,
      notes || null, userId, req.params.id
    ]);

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/stock/movements');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete movement (soft delete)
router.post('/movements/delete/:id', async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user.id : null;
    await db.query(
      'UPDATE stock_movements SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
      [userId, req.params.id]
    );

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) return res.json({ success: true });
    res.redirect('/stock/movements');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoints for stock modal dropdowns
router.get('/api/barang', async (req, res) => {
  try {
    const [barang] = await db.query('SELECT id_barang, kode_barang, nama_barang FROM purchasing_barang ORDER BY nama_barang');
    res.json(barang);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/warehouse-locations', async (req, res) => {
  try {
    const [locations] = await db.query('SELECT id, kode_lokasi, nama_lokasi FROM warehouse_locations WHERE deleted_at IS NULL ORDER BY nama_lokasi');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/warehouse-racks', async (req, res) => {
  try {
    const [racks] = await db.query('SELECT id, kode_rak, nama_rak FROM warehouse_racks WHERE deleted_at IS NULL ORDER BY nama_rak');
    res.json(racks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/warehouse-bins', async (req, res) => {
  try {
    const [bins] = await db.query('SELECT id, kode_bin, nama_bin FROM warehouse_bins WHERE deleted_at IS NULL ORDER BY nama_bin');
    res.json(bins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/branches', async (req, res) => {
  try {
    const [branches] = await db.query('SELECT id, nama_cabang FROM branches ORDER BY nama_cabang');
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock data by ID for edit
router.get('/:id/data', async (req, res) => {
  try {
    const [stock] = await db.query(
      `SELECT ws.*, pb.kode_barang, pb.nama_barang,
       wl.kode_lokasi, wl.nama_lokasi,
       wr.kode_rak, wr.nama_rak,
       wb.kode_bin, wb.nama_bin,
       b.nama_cabang
       FROM warehouse_stock ws
       LEFT JOIN purchasing_barang pb ON ws.id_barang = pb.id_barang
       LEFT JOIN warehouse_locations wl ON ws.warehouse_id = wl.id
       LEFT JOIN warehouse_racks wr ON ws.rack_id = wr.id
       LEFT JOIN warehouse_bins wb ON ws.bin_id = wb.id
       LEFT JOIN branches b ON ws.branch_id = b.id
       WHERE ws.id = ?`,
      [req.params.id]
    );
    res.json(stock[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new stock entry
router.post('/', async (req, res) => {
  try {
    const { id_barang, warehouse_id, branch_id, rack_id, bin_id, quantity, available_qty, reserved_qty } = req.body;
    const userId = req.session.user ? req.session.user.id : null;

    // Validate required fields
    if (!id_barang || !warehouse_id || !branch_id || quantity === undefined || available_qty === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Field barang, lokasi gudang, cabang, quantity, dan available qty wajib diisi' 
      });
    }

    // Check if stock entry already exists
    const [existing] = await db.query(
      `SELECT id FROM warehouse_stock 
       WHERE id_barang = ? AND warehouse_id = ? AND branch_id = ? 
       AND (rack_id = ? OR (rack_id IS NULL AND ? IS NULL))
       AND (bin_id = ? OR (bin_id IS NULL AND ? IS NULL))`,
      [id_barang, warehouse_id, branch_id, rack_id || null, rack_id || null, bin_id || null, bin_id || null]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Stock untuk kombinasi barang, lokasi, cabang, rak, dan bin ini sudah ada. Silakan edit data yang sudah ada.' 
      });
    }

    // Insert new stock entry
    await db.query(
      `INSERT INTO warehouse_stock 
       (id_barang, warehouse_id, branch_id, rack_id, bin_id, quantity, available_qty, reserved_qty, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_barang, warehouse_id, branch_id, rack_id || null, bin_id || null, quantity, available_qty, reserved_qty || 0, userId]
    );

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json')) ||
                   (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    
    if (isAjax) {
      return res.json({ success: true, message: 'Stock berhasil ditambahkan' });
    }
    res.redirect('/stock');
  } catch (error) {
    console.error('Error creating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update stock entry
router.post('/update/:id', async (req, res) => {
  try {
    const { id_barang, warehouse_id, branch_id, rack_id, bin_id, quantity, available_qty, reserved_qty } = req.body;
    const userId = req.session.user ? req.session.user.id : null;

    // Validate required fields
    if (!id_barang || !warehouse_id || !branch_id || quantity === undefined || available_qty === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Field barang, lokasi gudang, cabang, quantity, dan available qty wajib diisi' 
      });
    }

    // Check if trying to change to existing combination (exclude current record)
    const [existing] = await db.query(
      `SELECT id FROM warehouse_stock 
       WHERE id_barang = ? AND warehouse_id = ? AND branch_id = ? 
       AND (rack_id = ? OR (rack_id IS NULL AND ? IS NULL))
       AND (bin_id = ? OR (bin_id IS NULL AND ? IS NULL))
       AND id != ?`,
      [id_barang, warehouse_id, branch_id, rack_id || null, rack_id || null, bin_id || null, bin_id || null, req.params.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Stock untuk kombinasi barang, lokasi, cabang, rak, dan bin ini sudah ada.' 
      });
    }

    // Update stock entry
    await db.query(
      `UPDATE warehouse_stock 
       SET id_barang = ?, warehouse_id = ?, branch_id = ?, rack_id = ?, bin_id = ?, 
           quantity = ?, available_qty = ?, reserved_qty = ?, updated_at = NOW() 
       WHERE id = ?`,
      [id_barang, warehouse_id, branch_id, rack_id || null, bin_id || null, quantity, available_qty, reserved_qty || 0, req.params.id]
    );

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json')) ||
                   (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    
    if (isAjax) {
      return res.json({ success: true, message: 'Stock berhasil diupdate' });
    }
    res.redirect('/stock');
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete stock entry
router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM warehouse_stock WHERE id = ?', [req.params.id]);

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json')) ||
                   (req.headers['content-type'] && req.headers['content-type'].includes('application/json'));
    
    if (isAjax) {
      return res.json({ success: true, message: 'Stock berhasil dihapus' });
    }
    res.redirect('/stock');
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
