const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { recordIncomingStock } = require('../lib/stockHelper');

// Incoming list
router.get('/', async (req, res) => {
  try {
    const [incoming] = await db.query(`
      SELECT pi.*, 
        pb.kode_barang, pb.nama_barang, pb.satuan,
        ps.name as nama_supplier,
        wl.nama_lokasi,
        wr.nama_rak,
        wb.nama_bin
      FROM purchasing_incoming pi
      LEFT JOIN purchasing_barang pb ON pi.id_barang = pb.id_barang
      LEFT JOIN purchasing_suppliers ps ON pi.supplier_id = ps.id
      LEFT JOIN warehouse_locations wl ON pi.warehouse_id = wl.id
      LEFT JOIN warehouse_racks wr ON pi.rack_id = wr.id
      LEFT JOIN warehouse_bins wb ON pi.bin_id = wb.id
      ORDER BY pi.tanggal_masuk DESC, pi.created_at DESC
    `);

    const [suppliers] = await db.query('SELECT * FROM purchasing_suppliers ORDER BY name');
    const [barang] = await db.query('SELECT * FROM purchasing_barang ORDER BY nama_barang');
    const [warehouses] = await db.query('SELECT * FROM warehouse_locations');

    res.render('incoming/index', {
      title: 'Barang Masuk', 
      incoming, 
      suppliers,
      barang,
      warehouses,
      body: '' 
    });
  } catch (error) {
    console.error('Error loading incoming:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get incoming data for edit
router.get('/:id/data', async (req, res) => {
  try {
    const [incoming] = await db.query('SELECT * FROM purchasing_incoming WHERE id = ?', [req.params.id]);
    if (incoming.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(incoming[0]);
  } catch (error) {
    console.error('Error getting incoming data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create incoming
router.post('/create', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { 
      supplier_id, id_barang, quantity, harga_satuan, 
      warehouse_id, rack_id, bin_id, 
      tanggal_masuk, no_invoice, tanggal_kadaluarsa, catatan 
    } = req.body;

    const total_harga = parseFloat(quantity) * parseFloat(harga_satuan);
    
    // Insert incoming record
    const [incomingResult] = await connection.query(`
      INSERT INTO purchasing_incoming 
      (supplier_id, id_barang, quantity, harga_satuan, total_harga, 
       warehouse_id, rack_id, bin_id, tanggal_masuk, no_invoice, 
       tanggal_kadaluarsa, catatan, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', NOW())
    `, [supplier_id, id_barang, quantity, harga_satuan, total_harga,
        warehouse_id, rack_id, bin_id, tanggal_masuk, no_invoice,
        tanggal_kadaluarsa, catatan]);

    const incomingId = incomingResult.insertId;

    // Record stock movement using stockHelper
    await recordIncomingStock(connection, {
      barangId: id_barang,
      warehouseId: warehouse_id,
      rackId: rack_id,
      binId: bin_id,
      quantity: quantity,
      referenceType: 'incoming',
      referenceId: incomingId,
      notes: catatan || `Barang masuk dari ${no_invoice}`
    });

    await connection.commit();

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.json({ success: true, message: 'Barang masuk berhasil disimpan' });
    }
    res.redirect('/incoming');
  } catch (error) {
    await connection.rollback();
    console.error('Error creating incoming:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Update incoming
router.post('/update/:id', async (req, res) => {
  try {
    const { 
      supplier_id, id_barang, quantity, harga_satuan,
      warehouse_id, rack_id, bin_id,
      tanggal_masuk, no_invoice, tanggal_kadaluarsa, catatan
    } = req.body;

    const total_harga = parseFloat(quantity) * parseFloat(harga_satuan);

    await db.query(`
      UPDATE purchasing_incoming 
      SET supplier_id = ?, id_barang = ?, quantity = ?, harga_satuan = ?, total_harga = ?,
          warehouse_id = ?, rack_id = ?, bin_id = ?,
          tanggal_masuk = ?, no_invoice = ?, tanggal_kadaluarsa = ?, catatan = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [supplier_id, id_barang, quantity, harga_satuan, total_harga,
        warehouse_id, rack_id, bin_id, tanggal_masuk, no_invoice,
        tanggal_kadaluarsa, catatan, req.params.id]);

    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.json({ success: true, message: 'Data barang masuk berhasil diupdate' });
    }
    res.redirect('/incoming');
  } catch (error) {
    console.error('Error updating incoming:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete incoming
router.post('/delete/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM purchasing_incoming WHERE id = ?', [req.params.id]);
    
    const isAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || 
                   (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      return res.json({ success: true, message: 'Data barang masuk berhasil dihapus' });
    }
    res.redirect('/incoming');
  } catch (error) {
    console.error('Error deleting incoming:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Get barang by supplier
router.get('/api/suppliers/:id/barang', async (req, res) => {
  try {
    const [barang] = await db.query(`
      SELECT DISTINCT pb.* 
      FROM purchasing_barang pb
      WHERE pb.id_barang IN (
        SELECT DISTINCT id_barang FROM purchasing_incoming WHERE supplier_id = ?
      )
      OR pb.id_barang NOT IN (SELECT DISTINCT id_barang FROM purchasing_incoming)
      ORDER BY pb.nama_barang
    `, [req.params.id]);
    res.json(barang);
  } catch (error) {
    console.error('Error getting barang by supplier:', error);
    res.status(500).json({ error: error.message });
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
