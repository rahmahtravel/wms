const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { sendWhatsAppGroupMessage } = require('../utils/whatsapp/whatsapp');

// Import rekap-ongkir sub-routes
const rekapOngkirRoutes = require('./rekap-ongkir');

// Helper function to fetch complete kelengkapan data for WhatsApp notification
async function getCompleteKelengkapanData(kelengkapanId) {
  try {
    // Get kelengkapan with jamaah information using available fields only
    const [kelengkapanData] = await db.query(`
      SELECT jk.*,
        od.order_id,
        o.nama_pemesan,
        COALESCE(od.nama_jamaah, ppd.nama_penerima, jk.kepala_keluarga_id) as nama_jamaah,
        COALESCE(od.no_hp, ppd.nomor_telp) as nomor_telp,
        COALESCE(od.alamat, ppd.alamat_lengkap) as alamat,
        COALESCE(ppd.nama_penerima, od.nama_jamaah, jk.kepala_keluarga_id) as nama_penerima,
        od.title as title_jamaah
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      WHERE jk.id = ?
    `, [kelengkapanId]);

    if (kelengkapanData.length === 0) {
      throw new Error('Kelengkapan tidak ditemukan');
    }

    // Get selected items with user information
    const [items] = await db.query(`
      SELECT jki.*, pb.nama_barang, pb.kode_barang, pb.size_type, u.name as user_name
      FROM jamaah_kelengkapan_items jki
      LEFT JOIN purchasing_barang pb ON jki.barang_id = pb.id_barang
      LEFT JOIN users u ON jki.user_id = u.id
      WHERE jki.kelengkapan_id = ? AND jki.is_selected = 1
      ORDER BY pb.nama_barang ASC
    `, [kelengkapanId]);

    return {
      kelengkapan: kelengkapanData[0],
      items: items
    };
  } catch (error) {
    console.error('Error fetching complete kelengkapan data:', error);
    throw error;
  }
}

// Helper function to format WhatsApp message for kelengkapan pickup confirmation
function formatKelengkapanWhatsAppMessage(data) {
  const { kelengkapan, items } = data;
  
  // Format current date and time
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  };
  const formattedDate = now.toLocaleString('id-ID', options);
  
  // Format items list
  let itemsList = '';
  if (items && items.length > 0) {
    items.forEach((item, index) => {
      let itemName = item.nama_barang;
      // Add size information if available and not 'none'
      if (item.size_type && item.size_type !== 'none' && item.size_type !== 'NONE') {
        itemName += ` (${item.size_type})`;
      }
      itemsList += `${index + 1}. ${itemName}\n`;
    });
  } else {
    itemsList = 'Tidak ada perlengkapan yang dipilih\n';
  }
  
  // Determine gender based on title field from order_details (ENUM: 'TUAN', 'NONA', 'NYONYA')
  let jenis_kelamin = 'Tidak diketahui';
  if (kelengkapan.title_jamaah) {
    const title = kelengkapan.title_jamaah.toUpperCase().trim();
    // Check title field for gender determination using exact ENUM values
    if (title === 'TUAN') {
      jenis_kelamin = 'Laki-laki';
    } else if (title === 'NONA' || title === 'NYONYA') {
      jenis_kelamin = 'Perempuan';
    }
  }
  
  // Fallback to name pattern matching if title doesn't provide gender info
  if (jenis_kelamin === 'Tidak diketahui' && kelengkapan.nama_jamaah) {
    const nama = kelengkapan.nama_jamaah.toLowerCase();
    // Simple heuristic based on common Indonesian naming patterns
    if (nama.includes('siti') || nama.includes('fatimah') || nama.includes('aisyah') || 
        nama.includes('khadijah') || nama.endsWith(' dewi') || nama.endsWith('wati')) {
      jenis_kelamin = 'Perempuan';
    } else if (nama.includes('muhammad') || nama.includes('ahmad') || nama.includes('abdul') ||
               nama.includes('imam') || nama.includes('ustad')) {
      jenis_kelamin = 'Laki-laki';
    }
  }
  
  // Get nama_pemesan from orders table, fallback to nama_penerima or nama_jamaah
  const nama_pemesan = kelengkapan.nama_pemesan || kelengkapan.nama_penerima || kelengkapan.nama_jamaah || 'N/A';

  // Get user(s) who processed the items (if available)
  let processedBy = 'Sistem';
  if (items && items.length > 0) {
    // Get unique users who processed the items
    const uniqueUsers = [...new Set(items.map(item => item.user_name).filter(name => name))];
    if (uniqueUsers.length > 0) {
      processedBy = uniqueUsers.length === 1 ? uniqueUsers[0] : uniqueUsers.join(', ');
    }
  }
  
  // Build message
  const message = `*KONFIRMASI PENGAMBILAN PERLENGKAPAN*

` +
    `*STATUS: SUDAH DIAMBIL*

` +
    `*DATA JAMAAH:*
` +
    `Nama: ${kelengkapan.nama_jamaah || 'N/A'}
` +
    `Jenis Kelamin: ${jenis_kelamin}
` +
    `Nama Pemesan: ${nama_pemesan}\n\n` +
    `*PERLENGKAPAN YANG DIAMBIL:*
` +
    `${itemsList}\n` +
    `*WAKTU PENGAMBILAN:*
` +
    `${formattedDate}\n\n` +
    `*ALAMAT PENERIMA:*
` +
    `Nama Penerima: ${kelengkapan.nama_penerima || '-'}
` +
    `No. HP: ${kelengkapan.nomor_telp || '-'}
` +
    `Alamat: ${kelengkapan.alamat || 'Alamat tidak tersedia'}\n\n` +
    `*DIPROSES OLEH:*
` +
    `Staff: ${processedBy}\n\n` +
    `Status perlengkapan jamaah telah berhasil diperbarui menjadi "Sudah Diambil".
    
Pesan ini dikirim secara otomatis oleh *Warehouse Management System Rahmah Travel.*`;
  
  return message;
}

// Kelengkapan jamaah
router.get('/kelengkapan', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    
    // Get filter parameters
    const searchTerm = req.query.search || '';
    const statusFilter = req.query.status || '';
    const paketFilter = req.query.paket || '';
    
    // Build WHERE clause for filters
    let whereConditions = [];
    let queryParams = [];
    
    // Always exclude cancelled orders
    whereConditions.push("(o.order_type IS NULL OR o.order_type != 'cancel')");
    
    // Always exclude deleted paket_umroh
    whereConditions.push("(p.id IS NULL OR p.deleted_at IS NULL)");
    
    if (searchTerm) {
      whereConditions.push('(COALESCE(od.nama_jamaah, ppd.nama_penerima, jk.kepala_keluarga_id) LIKE ?)');
      queryParams.push(`%${searchTerm}%`);
    }
    
    if (statusFilter) {
      whereConditions.push('jk.status_pengambilan = ?');
      queryParams.push(statusFilter);
    }
    
    if (paketFilter) {
      whereConditions.push('p.id = ?');
      queryParams.push(paketFilter);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination (with filters)
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      ${whereClause}
    `, queryParams);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get paginated data with proper handling of duplicate nama_pemesan per order_id
    const [kelengkapan] = await db.query(`
      SELECT jk.*, 
        od.id as order_detail_id,
        od.order_id,
        o.nama_pemesan,
        COALESCE(od.nama_jamaah, ppd.nama_penerima, jk.kepala_keluarga_id) as nama_jamaah, 
        COALESCE(od.no_hp, ppd.nomor_telp) as nomor_telp,
        -- Prefer paket_umroh tanggal_keberangkatan via orders -> order_details, fallback to kelengkapan dates
        COALESCE(p.tanggal_keberangkatan, jk.tanggal_pengambilan, jk.tanggal_pengiriman) AS tanggal_keberangkatan,
        p.batch AS paket_batch,
        p.nama_paket,
        p.id as paket_id,
        od.title,
        od.clothing_size,
        jk.status_pengambilan,
        -- Shipping information
        jk.ekspedisi,
        jk.no_resi,
        jk.tracking_location,
        jk.tracking_notes,
        DATE_FORMAT(jk.tanggal_pengiriman, '%d/%m/%Y %H:%i') as tanggal_pengiriman_formatted,
        CASE
          WHEN jk.is_checked = 1 OR jk.status_pengambilan = 'Sudah Diambil' THEN 'lengkap'
          WHEN jk.is_checked = 0 AND jk.status_pengambilan != 'Sudah Diambil' THEN 'kurang'
          ELSE 'tidak_lengkap'
        END as status
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      ${whereClause}
      ORDER BY od.order_id DESC, jk.id ASC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    res.render('jamaah/kelengkapan/index', { 
      title: 'Kelengkapan Jamaah', 
      kelengkapan, 
      body: '',
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limit
      },
      filters: {
        search: searchTerm,
        status: statusFilter,
        paket: paketFilter
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific kelengkapan - render page or respond with JSON for XHR
router.get('/kelengkapan/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT jk.*, 
        od.order_id,
        o.nama_pemesan,
        COALESCE(od.nama_jamaah, ppd.nama_penerima, jk.kepala_keluarga_id) as nama_jamaah, 
        COALESCE(od.no_hp, ppd.nomor_telp) as nomor_telp,
        COALESCE(p.tanggal_keberangkatan, jk.tanggal_pengambilan, jk.tanggal_pengiriman) AS tanggal_keberangkatan,
        p.batch AS paket_batch,
        od.no_identitas,
        od.alamat,
        od.email
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
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
    let status_pengambilan = 'Belum Diambil';
    let is_checked = 0;
    if (status === 'lengkap') { status_pengambilan = 'Sudah Diambil'; is_checked = 1; }
    if (status === 'kurang') { status_pengambilan = 'Belum Diambil'; is_checked = 0; }
    if (status === 'tidak_lengkap') { status_pengambilan = 'Belum Diambil'; is_checked = 0; }

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

// Get available items for kelengkapan
router.get('/kelengkapan/items/available', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT pb.id_barang, pb.nama_barang, pb.kode_barang, pb.satuan, pb.stock_minimal, 
             pb.stock_akhir, pb.is_required, pb.size_type, pc.name as category_name
      FROM purchasing_barang pb
      LEFT JOIN purchasing_categories pc ON pb.category_id = pc.id
      WHERE pc.name = 'Perlengkapan Umroh'
      ORDER BY pb.is_required DESC, pb.nama_barang ASC
    `);
    
    // Return old format for backwards compatibility with modal
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current items for a kelengkapan
router.get('/kelengkapan/:id/items', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT jki.*, pb.nama_barang, pb.kode_barang
      FROM jamaah_kelengkapan_items jki
      LEFT JOIN purchasing_barang pb ON jki.barang_id = pb.id_barang
      WHERE jki.kelengkapan_id = ?
    `, [req.params.id]);
    
    // For backwards compatibility with the modal, return the old format
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get checklist items for table display (new format)
router.get('/kelengkapan/:id/checklist-items', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT jki.*, pb.nama_barang, pb.kode_barang
      FROM jamaah_kelengkapan_items jki
      LEFT JOIN purchasing_barang pb ON jki.barang_id = pb.id_barang
      WHERE jki.kelengkapan_id = ?
    `, [req.params.id]);
    
    res.json({
      success: true,
      items: items
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get kelengkapan status
router.get('/kelengkapan/:id/status', async (req, res) => {
  try {
    const [kelengkapan] = await db.query(`
      SELECT jk.status_pengambilan, jk.tanggal_pengambilan, jk.catatan, jk.is_checked,
        od.order_id,
        o.nama_pemesan,
        COALESCE(od.nama_jamaah, ppd.nama_penerima, jk.kepala_keluarga_id) as nama_jamaah, 
        COALESCE(od.no_hp, ppd.nomor_telp) as nomor_telp,
        COALESCE(od.alamat, ppd.alamat_lengkap) as alamat,
        jk.ekspedisi, jk.no_resi, jk.tracking_location, jk.tracking_notes,
        DATE_FORMAT(jk.tanggal_pengiriman, '%Y-%m-%d %H:%i:%s') as tanggal_pengiriman
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      WHERE jk.id = ?
    `, [req.params.id]);
    
    if (kelengkapan.length === 0) {
      return res.status(404).json({ error: 'Kelengkapan tidak ditemukan' });
    }
    
    res.json(kelengkapan[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update shipping data
// Get ongkir data for templates
router.get('/kelengkapan/:id/ongkir', async (req, res) => {
  try {
    const [ongkirData] = await db.query(`
      SELECT 
        jk.ekspedisi,
        ro.nominal,
        ppd.alamat_lengkap,
        COALESCE(od.nama_jamaah, ppd.nama_penerima, jk.kepala_keluarga_id) as nama_jamaah
      FROM jamaah_kelengkapan jk
      LEFT JOIN rekap_ongkir ro ON jk.id = ro.kelengkapan_id
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      WHERE jk.id = ?
      ORDER BY ro.created_at DESC
      LIMIT 1
    `, [req.params.id]);
    
    if (ongkirData.length === 0) {
      return res.status(404).json({ error: 'Data ongkir tidak ditemukan' });
    }
    
    res.json(ongkirData[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update shipping information
router.put('/kelengkapan/:id/shipping', async (req, res) => {
  try {
    const { ekspedisi, no_resi, tracking_location, tracking_notes, status_pengambilan } = req.body;
    
    // Validate required fields
    if (!ekspedisi || !no_resi) {
      return res.status(400).json({
        success: false,
        error: 'Ekspedisi dan No. Resi wajib diisi'
      });
    }
    
    // Update shipping data
    const [result] = await db.query(`
      UPDATE jamaah_kelengkapan 
      SET ekspedisi = ?, 
          no_resi = ?, 
          tracking_location = ?,
          tracking_notes = ?,
          status_pengambilan = ?,
          tanggal_pengiriman = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [ekspedisi, no_resi, tracking_location, tracking_notes, status_pengambilan || 'Di Kirim', req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Data kelengkapan tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      message: 'Data pengiriman berhasil disimpan'
    });
    
  } catch (error) {
    console.error('Error updating shipping:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save selected items for kelengkapan
router.post('/kelengkapan/:id/items', async (req, res) => {
  try {
    const kelengkapanId = req.params.id;
    const { selectedItems, status_pengambilan } = req.body;
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Store previous status for comparison
      const [previousData] = await db.query('SELECT status_pengambilan FROM jamaah_kelengkapan WHERE id = ?', [kelengkapanId]);
      const previousStatus = previousData.length > 0 ? previousData[0].status_pengambilan : null;
      
      // Update status pengambilan if provided
      if (status_pengambilan) {
        const tanggal_pengambilan = (status_pengambilan === 'Sudah Diambil' || status_pengambilan === 'Di Ambil Di Kantor') ? new Date() : null;
        await db.query(`
          UPDATE jamaah_kelengkapan 
          SET status_pengambilan = ?, tanggal_pengambilan = ?, updated_at = NOW()
          WHERE id = ?
        `, [status_pengambilan, tanggal_pengambilan, kelengkapanId]);
        
        // Update request_perlengkapan based on status_pengambilan change
        if (status_pengambilan === 'Sudah Diambil') {
          console.log(`[STATUS UPDATE] status_pengambilan changed to "Sudah Diambil" for kelengkapan ID: ${kelengkapanId}`);
          
          // Get order_details_id from jamaah_kelengkapan to find related request_perlengkapan
          const [kelengkapanData] = await db.query(`
            SELECT order_details_id, kepala_keluarga_id 
            FROM jamaah_kelengkapan 
            WHERE id = ?
          `, [kelengkapanId]);
          
          if (kelengkapanData.length > 0) {
            const orderDetailsId = kelengkapanData[0].order_details_id;
            const kepalaKeluargaId = kelengkapanData[0].kepala_keluarga_id;
            
            console.log(`[STATUS UPDATE] Found order_details_id: ${orderDetailsId} for kelengkapan ID: ${kelengkapanId}`);
            
            // Get the public_docs_id from purchasing_public_docs table using order_details_id
            const [publicDocsData] = await db.query(`
              SELECT ppd.id as public_docs_id
              FROM purchasing_public_docs ppd 
              WHERE ppd.order_details_id = ?
            `, [orderDetailsId]);
            
            let publicDocsId;
            
            if (publicDocsData.length === 0) {
              console.log(`[STATUS UPDATE] No purchasing_public_docs found for order_details_id: ${orderDetailsId}, creating new record`);
              
              // Get jamaah data from order_details to create purchasing_public_docs
              const [orderData] = await db.query(`
                SELECT nama_jamaah, no_hp, alamat 
                FROM order_details 
                WHERE id = ?
              `, [orderDetailsId]);
              
              if (orderData.length > 0) {
                // Create new purchasing_public_docs record
                const insertPublicDocs = await db.query(`
                  INSERT INTO purchasing_public_docs (
                    order_details_id,
                    nama_penerima,
                    nomor_telp,
                    alamat_lengkap,
                    created_at,
                    updated_at
                  ) VALUES (?, ?, ?, ?, NOW(), NOW())
                `, [
                  orderDetailsId,
                  orderData[0].nama_jamaah || 'Jamaah',
                  orderData[0].no_hp || '',
                  orderData[0].alamat || ''
                ]);
                
                publicDocsId = insertPublicDocs.insertId;
                console.log(`[STATUS UPDATE] Created new purchasing_public_docs ID: ${publicDocsId} for order_details_id: ${orderDetailsId}`);
              } else {
                console.log(`[STATUS UPDATE] No order_details data found for ID: ${orderDetailsId}`);
                return;
              }
            } else {
              publicDocsId = publicDocsData[0].public_docs_id;
              console.log(`[STATUS UPDATE] Found existing public_docs_id: ${publicDocsId} for order_details_id: ${orderDetailsId}`);
            }
            
            // Check if there's an existing request_perlengkapan record
            const [existingRequest] = await db.query(`
              SELECT id, status 
              FROM request_perlengkapan 
              WHERE public_docs_id = ?
            `, [publicDocsId]);
            
            if (existingRequest.length > 0) {
              // Update existing request_perlengkapan to "selesai"
              const requestId = existingRequest[0].id;
              const currentStatus = existingRequest[0].status;
              
              console.log(`[STATUS UPDATE] Found existing request_perlengkapan ID: ${requestId}, current status: ${currentStatus}`);
              
              await db.query(`
                UPDATE request_perlengkapan 
                SET status = ?, 
                    finished_by = ?, 
                    finished_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?
              `, ['selesai', req.user ? req.user.id : null, requestId]);
              
              console.log(`[STATUS UPDATE] Updated request_perlengkapan ID: ${requestId} status from "${currentStatus}" to "selesai"`);
            } else {
              // Create new request_perlengkapan record with "selesai" status
              console.log(`[STATUS UPDATE] No existing request_perlengkapan found for public_docs_id: ${publicDocsId}, creating new record`);
              
              const insertResult = await db.query(`
                INSERT INTO request_perlengkapan (
                  public_docs_id, 
                  status, 
                  finished_by, 
                  finished_at, 
                  requested_at, 
                  created_at, 
                  updated_at
                ) VALUES (?, ?, ?, NOW(), NOW(), NOW(), NOW())
              `, [publicDocsId, 'selesai', req.user ? req.user.id : null]);
              
              console.log(`[STATUS UPDATE] Created new request_perlengkapan ID: ${insertResult.insertId} with status "selesai"`);
            }
          } else {
            console.warn(`[STATUS UPDATE] No jamaah_kelengkapan data found for ID: ${kelengkapanId}`);
          }
        } else if (previousStatus === 'Sudah Diambil' && status_pengambilan !== 'Sudah Diambil') {
          // If changing from "Sudah Diambil" to another status, revert request_perlengkapan status
          console.log(`[STATUS UPDATE] status_pengambilan changed from "Sudah Diambil" to "${status_pengambilan}" for kelengkapan ID: ${kelengkapanId}`);
          
          // Get order_details_id from jamaah_kelengkapan to find related request_perlengkapan
          const [kelengkapanData] = await db.query(`
            SELECT order_details_id 
            FROM jamaah_kelengkapan 
            WHERE id = ?
          `, [kelengkapanId]);
          
          if (kelengkapanData.length > 0) {
            const orderDetailsId = kelengkapanData[0].order_details_id;
            
            console.log(`[STATUS UPDATE] Found order_details_id: ${orderDetailsId} for kelengkapan ID: ${kelengkapanId}`);
            
            // Get the public_docs_id from purchasing_public_docs table using order_details_id
            const [publicDocsData] = await db.query(`
              SELECT ppd.id as public_docs_id
              FROM purchasing_public_docs ppd 
              WHERE ppd.order_details_id = ?
            `, [orderDetailsId]);
            
            if (publicDocsData.length > 0) {
              const publicDocsId = publicDocsData[0].public_docs_id;
              console.log(`[STATUS UPDATE] Found public_docs_id: ${publicDocsId} for order_details_id: ${orderDetailsId}`);
              
              // Check if there's an existing request_perlengkapan record
              const [existingRequest] = await db.query(`
                SELECT id, status 
                FROM request_perlengkapan 
                WHERE public_docs_id = ?
              `, [publicDocsId]);
            
            if (existingRequest.length > 0) {
              // Update request_perlengkapan back to "confirmed" status
              const requestId = existingRequest[0].id;
              const currentStatus = existingRequest[0].status;
              
              console.log(`[STATUS UPDATE] Found existing request_perlengkapan ID: ${requestId}, current status: ${currentStatus}`);
              
              await db.query(`
                UPDATE request_perlengkapan 
                SET status = ?, 
                    confirmed_by = ?, 
                    confirmed_at = NOW(),
                    finished_by = NULL,
                    finished_at = NULL,
                    updated_at = NOW()
                WHERE id = ?
              `, ['confirmed', req.user ? req.user.id : null, requestId]);
              
              console.log(`[STATUS UPDATE] Updated request_perlengkapan ID: ${requestId} status from "${currentStatus}" to "confirmed" (reverted from selesai)`);
              }
            } else {
              console.warn(`[STATUS UPDATE] No public_docs_id found for order_details_id: ${orderDetailsId}`);
            }
          } else {
            console.warn(`[STATUS UPDATE] No jamaah_kelengkapan data found for ID: ${kelengkapanId}`);
          }
        }
      }
      
      // === STOCK MANAGEMENT: Get previous selections to calculate stock changes ===
      const [previousSelections] = await db.query(
        'SELECT barang_id FROM jamaah_kelengkapan_items WHERE kelengkapan_id = ? AND is_selected = 1',
        [kelengkapanId]
      );
      
      const previousItemIds = new Set(previousSelections.map(item => item.barang_id));
      const newItemIds = new Set(selectedItems || []);
      
      // Items that were selected but now unselected (restore stock)
      const unselectedItems = [...previousItemIds].filter(id => !newItemIds.has(id));
      
      // Items that are newly selected (reduce stock)
      const newlySelectedItems = [...newItemIds].filter(id => !previousItemIds.has(id));
      
      console.log('=== STOCK UPDATE LOG ===');
      console.log('Kelengkapan ID:', kelengkapanId);
      console.log('Previous items:', Array.from(previousItemIds));
      console.log('New items:', Array.from(newItemIds));
      console.log('Unselected items (restore stock):', unselectedItems);
      console.log('Newly selected items (reduce stock):', newlySelectedItems);
      
      // Restore stock for unselected items (add back to stock)
      if (unselectedItems.length > 0) {
        for (const barangId of unselectedItems) {
          await db.query(`
            UPDATE purchasing_barang 
            SET stock_akhir = stock_akhir + 1, 
                updated_at = NOW()
            WHERE id_barang = ?
          `, [barangId]);
          
          console.log(`[STOCK RESTORED] Barang ID ${barangId}: stock_akhir +1`);
        }
      }
      
      // Reduce stock for newly selected items
      if (newlySelectedItems.length > 0) {
        for (const barangId of newlySelectedItems) {
          // Check current stock before reducing
          const [stockCheck] = await db.query(
            'SELECT stock_akhir, nama_barang FROM purchasing_barang WHERE id_barang = ?',
            [barangId]
          );
          
          if (stockCheck.length > 0) {
            const currentStock = stockCheck[0].stock_akhir;
            const namaBarang = stockCheck[0].nama_barang;
            
            if (currentStock > 0) {
              await db.query(`
                UPDATE purchasing_barang 
                SET stock_akhir = stock_akhir - 1, 
                    updated_at = NOW()
                WHERE id_barang = ?
              `, [barangId]);
              
              console.log(`[STOCK REDUCED] Barang ID ${barangId} (${namaBarang}): stock_akhir -1 (was ${currentStock}, now ${currentStock - 1})`);
            } else {
              console.warn(`[STOCK WARNING] Barang ID ${barangId} (${namaBarang}): stock_akhir is already 0, cannot reduce further`);
            }
          }
        }
      }
      
      console.log('=== END STOCK UPDATE LOG ===');
      // === END STOCK MANAGEMENT ===
      
      // Delete existing items for this kelengkapan
      await db.query('DELETE FROM jamaah_kelengkapan_items WHERE kelengkapan_id = ?', [kelengkapanId]);
      
      // Insert new selected items
      if (selectedItems && selectedItems.length > 0) {
        const currentUserId = req.user ? req.user.id : null; // Get current user ID from JWT token
        const insertValues = selectedItems.map(barangId => [kelengkapanId, barangId, 1, currentUserId, new Date()]); // is_selected = 1, user_id, created_at
        await db.query(`
          INSERT INTO jamaah_kelengkapan_items (kelengkapan_id, barang_id, is_selected, user_id, created_at)
          VALUES ?
        `, [insertValues]);
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      // Send WhatsApp notification if status changed to 'Sudah Diambil'
      if (status_pengambilan === 'Sudah Diambil' && previousStatus !== 'Sudah Diambil') {
        try {
          console.log(`[WHATSAPP-NOTIFICATION] Status changed to 'Sudah Diambil' for kelengkapan ${kelengkapanId}. Sending WhatsApp notification...`);
          
          // Get complete data for WhatsApp message
          const completeData = await getCompleteKelengkapanData(kelengkapanId);
          
          // Format WhatsApp message
          const whatsappMessage = formatKelengkapanWhatsAppMessage(completeData);
          
          // Target WhatsApp group ID
          const targetGroupId = '120363402956725688@g.us';
          
          // Send WhatsApp notification
          const whatsappResult = await sendWhatsAppGroupMessage(
            targetGroupId,
            whatsappMessage,
            process.env.WATZAP_API_KEY,
            process.env.WATZAP_NUMBER_KEY
          );
          
          if (whatsappResult.success) {
            console.log(`[WHATSAPP-NOTIFICATION] Successfully sent WhatsApp notification for kelengkapan ${kelengkapanId}`);
          } else {
            console.error(`[WHATSAPP-NOTIFICATION] Failed to send WhatsApp notification for kelengkapan ${kelengkapanId}:`, whatsappResult.error);
          }
          
        } catch (whatsappError) {
          // Don't fail the main operation if WhatsApp fails
          console.error(`[WHATSAPP-NOTIFICATION] Error sending WhatsApp notification for kelengkapan ${kelengkapanId}:`, whatsappError);
        }
      }
      
      // Prepare response message with stock update info and status change info
      let message = 'Items dan status berhasil disimpan';
      if (unselectedItems.length > 0 || newlySelectedItems.length > 0) {
        message += ` (Stock diupdate: +${unselectedItems.length} item dikembalikan, -${newlySelectedItems.length} item diambil)`;
      }
      
      // Add info about request_perlengkapan status change
      let requestStatusUpdate = null;
      if (status_pengambilan === 'Sudah Diambil' && previousStatus !== 'Sudah Diambil') {
        requestStatusUpdate = {
          action: 'completed',
          from: previousStatus || 'N/A',
          to: 'Sudah Diambil',
          requestStatus: 'selesai'
        };
        message += ' | Request perlengkapan otomatis diselesaikan';
      } else if (previousStatus === 'Sudah Diambil' && status_pengambilan !== 'Sudah Diambil') {
        requestStatusUpdate = {
          action: 'reverted',
          from: 'Sudah Diambil',
          to: status_pengambilan,
          requestStatus: 'confirmed'
        };
        message += ' | Request perlengkapan dikembalikan ke status confirmed';
      }
      
      res.json({ 
        success: true, 
        message: message,
        stockUpdates: {
          restored: unselectedItems.length,
          reduced: newlySelectedItems.length
        },
        requestStatusUpdate: requestStatusUpdate
      });
    } catch (innerError) {
      // Rollback on error
      await db.query('ROLLBACK');
      console.error('[ERROR] Transaction rolled back:', innerError);
      throw innerError;
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request perlengkapan
router.get('/request', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT ppd.id as ppd_id,
        ppd.nama_penerima, 
        ppd.nomor_telp,
        ppd.alamat_lengkap,
        ppd.created_at as ppd_created_at,
        ppd.updated_at as ppd_updated_at,
        od.nama_jamaah,
        od.no_hp,
        od.title,
        od.clothing_size,
        od.id as order_details_id,
        o.paket_id,
        o.id as order_id,
        p.nama_paket,
        p.tanggal_keberangkatan,
        jk.status_pengambilan,
        rp.id as request_id,
        rp.status,
        rp.requested_at,
        rp.confirmed_at,
        rp.finished_at,
        rp.public_docs_id
      FROM purchasing_public_docs ppd
      LEFT JOIN order_details od ON ppd.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN jamaah_kelengkapan jk ON od.id = jk.order_details_id
      LEFT JOIN request_perlengkapan rp ON ppd.id = rp.public_docs_id
      WHERE (p.id IS NULL OR p.deleted_at IS NULL)
      ORDER BY ppd.id DESC
    `);
    
    // Transform data to ensure consistency with frontend expectations
    const transformedRequests = requests.map(item => ({
      id: item.request_id || item.ppd_id, // Use request_id if exists, otherwise ppd_id
      nama_penerima: item.nama_penerima,
      nomor_telp: item.nomor_telp,
      alamat_lengkap: item.alamat_lengkap,
      nama_jamaah: item.nama_jamaah,
      no_hp: item.no_hp,
      title: item.title,
      clothing_size: item.clothing_size,
      nama_paket: item.nama_paket,
      tanggal_keberangkatan: item.tanggal_keberangkatan,
      status_pengambilan: item.status_pengambilan,
      status: item.status || 'pending', // Default to pending if no request exists
      requested_at: item.requested_at || item.ppd_created_at,
      confirmed_at: item.confirmed_at,
      finished_at: item.finished_at,
      public_docs_id: item.ppd_id,
      order_details_id: item.order_details_id,
      order_id: item.order_id,
      paket_id: item.paket_id
    }));
    
    res.render('jamaah/request/index', { 
      title: 'Request Perlengkapan', 
      requests: transformedRequests, 
      body: '' 
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update request perlengkapan status
router.put('/request/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;
    
    // Validate status enum
    const validStatuses = ['pending', 'confirmed', 'selesai'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Status tidak valid. Pilihan: pending, confirmed, selesai' 
      });
    }
    
    // Check if this is a request_id or ppd_id
    // First try to find existing request_perlengkapan record
    const [existingRequest] = await db.query(
      'SELECT id, public_docs_id FROM request_perlengkapan WHERE id = ? OR public_docs_id = ?',
      [requestId, requestId]
    );
    
    let actualRequestId = requestId;
    
    if (existingRequest.length === 0) {
      // This is likely a ppd_id, create new request_perlengkapan record
      const [result] = await db.query(
        `INSERT INTO request_perlengkapan 
         (public_docs_id, status, requested_at, created_at, updated_at) 
         VALUES (?, ?, NOW(), NOW(), NOW())`,
        [requestId, status]
      );
      actualRequestId = result.insertId;
    } else {
      actualRequestId = existingRequest[0].id;
      // Update the existing record
      await db.query(
        `UPDATE request_perlengkapan 
         SET status = ?, 
             updated_at = NOW()
         WHERE id = ?`, 
        [status, actualRequestId]
      );
    }
    
    // Set additional timestamps based on status
    if (status === 'confirmed') {
      await db.query(
        `UPDATE request_perlengkapan 
         SET confirmed_by = ?, 
             confirmed_at = NOW() 
         WHERE id = ?`, 
        [req.user ? req.user.id : null, actualRequestId]
      );
    } else if (status === 'selesai') {
      await db.query(
        `UPDATE request_perlengkapan 
         SET finished_by = ?, 
             finished_at = NOW() 
         WHERE id = ?`, 
        [req.user ? req.user.id : null, actualRequestId]
      );
    }
    
    res.json({ success: true, message: 'Status berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pengiriman
router.get('/pengiriman', async (req, res) => {
  try {
    const [pengiriman] = await db.query(`
      SELECT jk.*, 
        od.order_id,
        -- Display nama_pemesan only for the first occurrence of each order_id
        CASE 
          WHEN ROW_NUMBER() OVER (PARTITION BY od.order_id ORDER BY jk.id ASC) = 1 
          THEN o.nama_pemesan 
          ELSE NULL 
        END as nama_pemesan,
        COALESCE(od.nama_jamaah, ppd.nama_penerima) as nama_penerima, 
        COALESCE(od.alamat, ppd.alamat_lengkap) as alamat_lengkap, 
        COALESCE(od.no_hp, ppd.nomor_telp) as nomor_telp,
        COALESCE(p.tanggal_keberangkatan, jk.tanggal_pengiriman, jk.tanggal_pengambilan) AS tanggal_keberangkatan,
        p.batch AS paket_batch
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      WHERE jk.status_pengiriman IS NOT NULL
        AND (p.id IS NULL OR p.deleted_at IS NULL)
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

// Update kelengkapan status (for rekap-ongkir)
router.post('/kelengkapan/:id/status', async (req, res) => {
  try {
    const { status_pengambilan } = req.body;
    const kelengkapanId = req.params.id;

    console.log(`[KELENGKAPAN-STATUS] Updating kelengkapan ${kelengkapanId} to status: ${status_pengambilan}`);

    // Validate status
    const validStatuses = ['pending', 'Di Kirim', 'Sudah Diambil'];
    if (!validStatuses.includes(status_pengambilan)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }

    // Update the status
    await db.query(
      'UPDATE jamaah_kelengkapan SET status_pengambilan = ?, updated_at = NOW() WHERE id = ?',
      [status_pengambilan, kelengkapanId]
    );

    res.json({
      success: true,
      message: `Status kelengkapan berhasil diupdate ke ${status_pengambilan}`
    });
  } catch (error) {
    console.error('Error updating kelengkapan status:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengupdate status kelengkapan'
    });
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

// Mount rekap-ongkir routes
router.use('/rekap-ongkir', rekapOngkirRoutes);
// Get paket umroh list for filter
router.get('/paket-umroh-list', async (req, res) => {
  try {
    const [paketList] = await db.query(`
      SELECT DISTINCT
        p.id,
        p.nama_paket,
        p.tanggal_keberangkatan,
        p.batch,
        CASE MONTH(p.tanggal_keberangkatan)
          WHEN 1 THEN 'Januari'
          WHEN 2 THEN 'Februari'
          WHEN 3 THEN 'Maret'
          WHEN 4 THEN 'April'
          WHEN 5 THEN 'Mei'
          WHEN 6 THEN 'Juni'
          WHEN 7 THEN 'Juli'
          WHEN 8 THEN 'Agustus'
          WHEN 9 THEN 'September'
          WHEN 10 THEN 'Oktober'
          WHEN 11 THEN 'November'
          WHEN 12 THEN 'Desember'
        END as bulan,
        YEAR(p.tanggal_keberangkatan) as tahun
      FROM paket_umroh p
      WHERE p.tanggal_keberangkatan IS NOT NULL 
        AND p.deleted_at IS NULL
      ORDER BY p.tanggal_keberangkatan ASC, p.batch ASC
    `);
    
    // Group by month-year
    const grouped = {};
    paketList.forEach(paket => {
      const monthKey = `${paket.bulan} ${paket.tahun}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(paket);
    });
    
    console.log('Paket umroh list loaded:', {
      totalPakets: paketList.length,
      groupedKeys: Object.keys(grouped),
      grouped: grouped
    });
    
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics endpoint for kelengkapan jamaah
router.get('/kelengkapan-stats', async (req, res) => {
  try {
    // Get filter parameters for consistency
    const searchTerm = req.query.search || '';
    const statusFilter = req.query.status || '';
    const paketFilter = req.query.paket || '';
    
    // Build WHERE clause for filters (same as main query)
    let whereConditions = [];
    let queryParams = [];
    
    // Always exclude cancelled orders
    whereConditions.push("(o.order_type IS NULL OR o.order_type != 'cancel')");
    
    // Always exclude deleted paket_umroh
    whereConditions.push("(p.id IS NULL OR p.deleted_at IS NULL)");
    
    if (searchTerm) {
      whereConditions.push('(COALESCE(od.nama_jamaah, ppd.nama_penerima, jk.kepala_keluarga_id) LIKE ?)');
      queryParams.push(`%${searchTerm}%`);
    }
    
    if (statusFilter) {
      whereConditions.push('jk.status_pengambilan = ?');
      queryParams.push(statusFilter);
    }
    
    if (paketFilter) {
      whereConditions.push('p.id = ?');
      queryParams.push(paketFilter);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 1. Total Jamaah from order_details (excluding Infant room types)
    let totalJamaahWhere = whereClause;
    let totalJamaahParams = [...queryParams];
    
    if (whereClause.length > 0) {
      totalJamaahWhere = whereClause.replace('jk.status_pengambilan', 'COALESCE(jk.status_pengambilan, "Belum Diambil")') + ' AND (rt.tipe_kamar IS NULL OR rt.tipe_kamar NOT LIKE ?)';
      totalJamaahParams.push('%Infant%');
    } else {
      totalJamaahWhere = 'WHERE (rt.tipe_kamar IS NULL OR rt.tipe_kamar NOT LIKE ?)';
      totalJamaahParams = ['%Infant%'];
    }
    
    const [totalJamaahResult] = await db.query(`
      SELECT COUNT(DISTINCT od.nama_jamaah) as total
      FROM order_details od
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN jamaah_kelengkapan jk ON od.id = jk.order_details_id
      LEFT JOIN purchasing_public_docs ppd ON od.id = ppd.order_details_id
      LEFT JOIN room_types rt ON od.room_type_id = rt.id
      ${totalJamaahWhere}
    `, totalJamaahParams);

    // 2. Belum Diambil from jamaah_kelengkapan (excluding Infant room types)
    let belumDiambilParams = [...queryParams, 'Belum Diambil', '%Infant%'];
    const [belumDiambilResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      LEFT JOIN room_types rt ON od.room_type_id = rt.id
      ${whereClause.length > 0 ? whereClause + ' AND' : 'WHERE'} jk.status_pengambilan = ?
      AND (rt.tipe_kamar IS NULL OR rt.tipe_kamar NOT LIKE ?)
    `, belumDiambilParams);

    // 3. Sudah Diambil from jamaah_kelengkapan (excluding Infant room types)
    let sudahDiambilParams = [...queryParams, 'Sudah Diambil', '%Infant%'];
    const [sudahDiambilResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      LEFT JOIN room_types rt ON od.room_type_id = rt.id
      ${whereClause.length > 0 ? whereClause + ' AND' : 'WHERE'} jk.status_pengambilan = ?
      AND (rt.tipe_kamar IS NULL OR rt.tipe_kamar NOT LIKE ?)
    `, sudahDiambilParams);

    // 4. Dalam Pengiriman (Di Kirim) from jamaah_kelengkapan (excluding Infant room types)
    let dalamPengirimanParams = [...queryParams, 'Di Kirim', '%Infant%'];
    const [dalamPengirimanResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM jamaah_kelengkapan jk
      LEFT JOIN order_details od ON jk.order_details_id = od.id
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN purchasing_public_docs ppd ON jk.order_details_id = ppd.order_details_id
      LEFT JOIN room_types rt ON od.room_type_id = rt.id
      ${whereClause.length > 0 ? whereClause + ' AND' : 'WHERE'} jk.status_pengambilan = ?
      AND (rt.tipe_kamar IS NULL OR rt.tipe_kamar NOT LIKE ?)
    `, dalamPengirimanParams);

    // 5. Count Infant jamaah separately
    let infantJamaahWhere = whereClause;
    let infantJamaahParams = [...queryParams];
    
    if (whereClause.length > 0) {
      infantJamaahWhere = whereClause.replace('jk.status_pengambilan', 'COALESCE(jk.status_pengambilan, "Belum Diambil")') + ' AND rt.tipe_kamar LIKE ?';
      infantJamaahParams.push('%Infant%');
    } else {
      infantJamaahWhere = 'WHERE rt.tipe_kamar LIKE ?';
      infantJamaahParams = ['%Infant%'];
    }
    
    const [infantJamaahResult] = await db.query(`
      SELECT COUNT(DISTINCT od.nama_jamaah) as total
      FROM order_details od
      LEFT JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh p ON o.paket_id = p.id
      LEFT JOIN jamaah_kelengkapan jk ON od.id = jk.order_details_id
      LEFT JOIN purchasing_public_docs ppd ON od.id = ppd.order_details_id
      LEFT JOIN room_types rt ON od.room_type_id = rt.id
      ${infantJamaahWhere}
    `, infantJamaahParams);

    const stats = {
      totalJamaah: totalJamaahResult[0]?.total || 0,
      belumDiambil: belumDiambilResult[0]?.total || 0,
      sudahDiambil: sudahDiambilResult[0]?.total || 0,
      dalamPengiriman: dalamPengirimanResult[0]?.total || 0,
      infantJamaah: infantJamaahResult[0]?.total || 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
