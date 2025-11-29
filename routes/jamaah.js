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
        -- Display nama_pemesan only for the first occurrence of each order_id
        CASE 
          WHEN ROW_NUMBER() OVER (PARTITION BY od.order_id ORDER BY jk.id ASC) = 1 
          THEN o.nama_pemesan 
          ELSE NULL 
        END as nama_pemesan,
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
      ORDER BY od.id DESC, jk.created_at DESC
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
        jk.ekspedisi, jk.no_resi, jk.tracking_notes,
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
router.put('/kelengkapan/:id/shipping', async (req, res) => {
  try {
    const { ekspedisi, no_resi, tracking_notes, status_pengambilan } = req.body;
    
    // Validate required fields
    if (!ekspedisi || !no_resi) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ekspedisi dan nomor resi wajib diisi' 
      });
    }
    
    // Update shipping data
    await db.query(`
      UPDATE jamaah_kelengkapan 
      SET ekspedisi = ?, 
          no_resi = ?, 
          tracking_notes = ?,
          status_pengambilan = ?,
          tanggal_pengiriman = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [ekspedisi, no_resi, tracking_notes, status_pengambilan || 'Di Kirim', req.params.id]);
    
    res.json({
      success: true,
      message: 'Data pengiriman berhasil disimpan'
    });
    
  } catch (error) {
    console.error('Error updating shipping data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update shipping information
router.put('/kelengkapan/:id/shipping', async (req, res) => {
  try {
    const { ekspedisi, no_resi, tracking_notes, status_pengambilan } = req.body;
    
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
          tracking_notes = ?,
          status_pengambilan = ?,
          tanggal_pengiriman = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [ekspedisi, no_resi, tracking_notes, status_pengambilan || 'Di Kirim', req.params.id]);
    
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
      }
      
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
      
      res.json({ success: true, message: 'Items dan status berhasil disimpan' });
    } catch (innerError) {
      // Rollback on error
      await db.query('ROLLBACK');
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
        MONTHNAME(p.tanggal_keberangkatan) as bulan,
        YEAR(p.tanggal_keberangkatan) as tahun
      FROM paket_umroh p
      WHERE p.tanggal_keberangkatan IS NOT NULL
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

    // 4. Count Infant jamaah separately
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
      infantJamaah: infantJamaahResult[0]?.total || 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
