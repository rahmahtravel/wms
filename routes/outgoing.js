const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { recordOutgoingStock, validateStockAvailability } = require('../lib/stockHelper');

// Outgoing list
router.get('/', async (req, res) => {
  try {
    const [outgoing] = await db.query(`
      SELECT pbk.*, 
        pb.kode_barang, pb.nama_barang, pb.satuan,
        wl.nama_lokasi,
        wr.nama_rak,
        wb.nama_bin
      FROM purchasing_barang_keluar pbk
      LEFT JOIN purchasing_barang pb ON pbk.id_barang = pb.id_barang
      LEFT JOIN warehouse_locations wl ON pbk.warehouse_id = wl.id
      LEFT JOIN warehouse_racks wr ON pbk.rack_id = wr.id
      LEFT JOIN warehouse_bins wb ON pbk.bin_id = wb.id
      ORDER BY pbk.tanggal_keluar DESC, pbk.created_at DESC
    `);

    const [barang] = await db.query('SELECT * FROM purchasing_barang ORDER BY nama_barang');
    const [warehouses] = await db.query('SELECT * FROM warehouse_locations ORDER BY nama_lokasi');

    res.render('outgoing/index', { 
      title: 'Barang Keluar', 
      outgoing,
      barang,
      warehouses,
      body: '' 
    });
  } catch (error) {
    console.error('Error loading outgoing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get outgoing data for edit
router.get('/:id/data', async (req, res) => {
  try {
    const [outgoing] = await db.query('SELECT * FROM purchasing_barang_keluar WHERE id = ?', [req.params.id]);
    if (outgoing.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(outgoing[0]);
  } catch (error) {
    console.error('Error getting outgoing data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create outgoing
router.post('/create', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      id_barang, jumlah_keluar, tanggal_keluar, keterangan, 
      warehouse_id, rack_id, bin_id,
      penerima, tujuan
    } = req.body;

    // Validate stock availability using stockHelper
    const validation = await validateStockAvailability(connection, id_barang, warehouse_id, jumlah_keluar);
    if (!validation.available) {
      throw new Error(validation.message);
    }

    // Insert outgoing record
    const [outgoingResult] = await connection.query(`
      INSERT INTO purchasing_barang_keluar 
      (id_barang, jumlah_keluar, tanggal_keluar, keterangan, 
       warehouse_id, rack_id, bin_id, penerima, tujuan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [id_barang, jumlah_keluar, tanggal_keluar, keterangan, 
        warehouse_id, rack_id, bin_id, penerima, tujuan]);

    // Record stock movement using stockHelper (automatic stock update)
    await recordOutgoingStock(connection, {
      barangId: id_barang,
      warehouseId: warehouse_id,
      rackId: rack_id,
      binId: bin_id,
      quantity: jumlah_keluar,
      referenceType: 'outgoing',
      referenceId: outgoingResult.insertId,
      notes: keterangan || `Barang keluar ke ${tujuan || penerima}`
    });

    await connection.commit();
    
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.json({ success: true, message: 'Barang keluar berhasil disimpan' });
    }
    res.redirect('/outgoing');
  } catch (error) {
    await connection.rollback();
    console.error('Error creating outgoing:', error);
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.status(500).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update outgoing
router.post('/update/:id', async (req, res) => {
  try {
    const { 
      id_barang, jumlah_keluar, tanggal_keluar, keterangan,
      warehouse_id, rack_id, bin_id,
      penerima, tujuan
    } = req.body;

    await db.query(`
      UPDATE purchasing_barang_keluar 
      SET id_barang = ?, jumlah_keluar = ?, tanggal_keluar = ?, keterangan = ?,
          warehouse_id = ?, rack_id = ?, bin_id = ?,
          penerima = ?, tujuan = ?, updated_at = NOW()
      WHERE id = ?
    `, [id_barang, jumlah_keluar, tanggal_keluar, keterangan,
        warehouse_id, rack_id, bin_id,
        penerima, tujuan, req.params.id]);

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.json({ success: true, message: 'Data barang keluar berhasil diupdate' });
    }
    res.redirect('/outgoing');
  } catch (error) {
    console.error('Error updating outgoing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete outgoing
router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_barang_keluar WHERE id = ?', [req.params.id]);
    
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.json({ success: true, message: 'Data barang keluar berhasil dihapus' });
    }
    res.redirect('/outgoing');
  } catch (error) {
    console.error('Error deleting outgoing:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get stock availability for a barang in warehouse
router.get('/api/stock-check/:barang_id/:warehouse_id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const validation = await validateStockAvailability(
      connection, 
      req.params.barang_id, 
      req.params.warehouse_id, 
      1 // Minimal quantity untuk check
    );
    res.json({
      available: validation.available,
      currentStock: validation.currentStock,
      message: validation.message
    });
  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// API: Get racks by warehouse
router.get('/api/warehouses/:id/racks', async (req, res) => {
  try {
    const [racks] = await db.query(`
      SELECT * FROM warehouse_racks 
      WHERE warehouse_id = ?
      ORDER BY nama_rak
    `, [req.params.id]);
    res.json(racks);
  } catch (error) {
    console.error('Error getting racks:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get bins by rack
router.get('/api/racks/:id/bins', async (req, res) => {
  try {
    const [bins] = await db.query(`
      SELECT * FROM warehouse_bins 
      WHERE rack_id = ?
      ORDER BY nama_bin
    `, [req.params.id]);
    res.json(bins);
  } catch (error) {
    console.error('Error getting bins:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
