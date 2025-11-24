const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Kelengkapan jamaah
router.get('/kelengkapan', async (req, res) => {
  try {
    const [kelengkapan] = await db.query(`
      SELECT jk.*, COALESCE(ppd.nama_penerima, jk.kepala_keluarga_id) as nama_jamaah, ppd.nomor_telp as nomor_telp,
        CASE
          WHEN jk.is_checked = 1 OR jk.status_pengambilan = 'diambil' THEN 'lengkap'
          WHEN jk.is_checked = 0 AND jk.status_pengambilan != 'diambil' THEN 'kurang'
          ELSE 'tidak_lengkap'
        END as status
      FROM jamaah_kelengkapan jk
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      ORDER BY jk.created_at DESC
      LIMIT 100
    `);
    res.render('jamaah/kelengkapan/index', { title: 'Kelengkapan Jamaah', kelengkapan, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific kelengkapan - render page or respond with JSON for XHR
router.get('/kelengkapan/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT jk.*, ppd.nama_penerima as nama_jamaah, ppd.nomor_telp as nomor_telp
      FROM jamaah_kelengkapan jk
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      WHERE jk.id = ?
      LIMIT 1
    `, [req.params.id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Kelengkapan not found' });
    }

    const kelengkapan = rows[0];

    const [items] = await db.query(`
      SELECT jki.*, pb.nama_barang
      FROM jamaah_kelengkapan_items jki
      LEFT JOIN purchasing_barang pb ON jki.barang_id = pb.id_barang
      WHERE jki.kelengkapan_id = ?
    `, [req.params.id]);

    // If the request is an AJAX/XHR (fetch) request, return JSON
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('application/json') || req.xhr) {
      res.json({ ...kelengkapan, items });
    } else {
      res.render('jamaah/kelengkapan/show', { title: 'Detail Kelengkapan', kelengkapan, items, body: '' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create kelengkapan
router.post('/kelengkapan', async (req, res) => {
  try {
    // Accept & map a few safe fields from the frontend modal
    const { nama_jamaah, nomor_telp, kepala_keluarga_id, kain_ihram_mukena, jilbab, koper, catatan, is_checked } = req.body;
    const kepalaValue = kepala_keluarga_id || nama_jamaah || null;
    const [result] = await db.query(`
      INSERT INTO jamaah_kelengkapan (kepala_keluarga_id, kain_ihram_mukena, jilbab, koper, catatan, is_checked, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [kepalaValue, kain_ihram_mukena || 0, jilbab || 0, koper || 0, catatan || null, is_checked ? 1 : 0]);
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update kelengkapan
router.put('/kelengkapan/:id', async (req, res) => {
  try {
    const { nama_jamaah, nomor_telp, status, keterangan } = req.body;

    // Map status to internal status_pengambilan and is_checked
    let status_pengambilan = 'pending';
    let is_checked = 0;
    if (status === 'lengkap') { status_pengambilan = 'diambil'; is_checked = 1; }
    if (status === 'kurang') { status_pengambilan = 'pending'; is_checked = 0; }
    if (status === 'tidak_lengkap') { status_pengambilan = 'pending'; is_checked = 0; }

    // Update jamaah_kelengkapan
    await db.query('UPDATE jamaah_kelengkapan SET status_pengambilan = ?, is_checked = ?, catatan = ?, updated_at = NOW() WHERE id = ?', [status_pengambilan, is_checked, keterangan || null, req.params.id]);

    // If nama_jamaah/nomor_telp provided, update purchasing_public_docs for related order_details_id (if any)
    const [jkRows] = await db.query('SELECT order_details_id FROM jamaah_kelengkapan WHERE id = ?', [req.params.id]);
    if (jkRows && jkRows.length > 0 && jkRows[0].order_details_id) {
      const orderDetailsId = jkRows[0].order_details_id;
      // update or insert purchasing_public_docs row
      await db.query(`
        UPDATE purchasing_public_docs SET nama_penerima = COALESCE(?, nama_penerima), nomor_telp = COALESCE(?, nomor_telp) WHERE order_details_id = ?
      `, [nama_jamaah || null, nomor_telp || null, orderDetailsId]);
    } else if (nama_jamaah) {
      // Update fallback field 'kepala_keluarga_id' when ppd/order_details_id not available
      await db.query('UPDATE jamaah_kelengkapan SET kepala_keluarga_id = ? WHERE id = ?', [nama_jamaah, req.params.id]);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete kelengkapan
router.delete('/kelengkapan/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jamaah_kelengkapan WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request perlengkapan
router.get('/request', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT rp.*, ppd.nama_penerima, ppd.nomor_telp
      FROM request_perlengkapan rp
      LEFT JOIN purchasing_public_docs ppd ON rp.public_docs_id = ppd.id
      ORDER BY rp.requested_at DESC
    `);
    res.render('jamaah/request/index', { title: 'Request Perlengkapan', requests, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pengiriman
router.get('/pengiriman', async (req, res) => {
  try {
    const [pengiriman] = await db.query(`
      SELECT jk.*, ppd.nama_penerima, ppd.alamat_lengkap, ppd.nomor_telp
      FROM jamaah_kelengkapan jk
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      WHERE jk.status_pengiriman IS NOT NULL
      ORDER BY jk.tanggal_pengiriman DESC
    `);
    res.render('jamaah/pengiriman/index', { title: 'Status Pengiriman', pengiriman, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tracking
router.post('/pengiriman/:id/update-tracking', async (req, res) => {
  try {
    const { tracking_status, tracking_location, tracking_notes } = req.body;
    await db.query(
      'UPDATE jamaah_kelengkapan SET tracking_status = ?, tracking_location = ?, tracking_notes = ?, last_tracked_at = NOW() WHERE id = ?',
      [tracking_status, tracking_location, tracking_notes, req.params.id]
    );
    res.redirect('/jamaah/pengiriman');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete request
router.delete('/request/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM request_perlengkapan WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
