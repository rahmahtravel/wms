const express = require("express");
const router = express.Router();
const db = require("../config/database");
const multer = require("multer");

// Route to get kelengkapan data for clipboard
router.get("/kelengkapan/:id/clipboard", async (req, res) => {
  try {
    const [rows] = await db.query(
      `
            SELECT ro.nominal as harga_ongkir
            FROM rekap_ongkir ro
            WHERE ro.kelengkapan_id = ?
        `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Data kelengkapan tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching kelengkapan data:", err);
    res.status(500).json({ error: "Gagal mengambil data kelengkapan" });
  }
});

const path = require("path");
const fs = require("fs");

// Multer setup for bukti_tf and mutasi uploads - using simple timestamp naming like payments system
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "public/uploads/rekap_ongkir/";
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now();
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"];
    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
      return cb(new Error("Hanya file gambar atau PDF yang diperbolehkan"));
    }
    cb(null, true);
  },
});

// GET /rekap-ongkir - display rekap ongkir grouped by nama_pemesan
router.get("/", async (req, res) => {
  try {
    console.log("[REKAP-ONGKIR] Fetching rekap ongkir data...");

    // Get filter parameters
    const { startDate, endDate, paket, status } = req.query;

    console.log("[REKAP-ONGKIR] Filter Parameters:", {
      startDate,
      endDate,
      paket,
      status,
    });

    // Fetch all packages for the filter dropdown
    const [packages] = await db.query(`
      SELECT 
        id, 
        nama_paket, 
        tanggal_keberangkatan, 
        tanggal_kepulangan
      FROM paket_umroh 
      ORDER BY tanggal_keberangkatan asc
    `);

    console.log(
      `[REKAP-ONGKIR] Loaded ${packages.length} packages for dropdown`
    );
    if (paket && paket !== "all") {
      const selectedPkg = packages.find((p) => p.id.toString() === paket);
      if (selectedPkg) {
        console.log(`[REKAP-ONGKIR] Selected package:`, selectedPkg.nama_paket);
      } else {
        console.log(
          `[REKAP-ONGKIR] WARNING: Package ID ${paket} not found in packages list!`
        );
      }
    }

    // Build WHERE conditions
    let whereConditions = ['jk.status_pengambilan = "Di Kirim"'];
    let queryParams = [];

    // Add date filter if provided
    if (startDate && endDate) {
      whereConditions.push("DATE(o.created_at) BETWEEN ? AND ?");
      queryParams.push(startDate, endDate);
      console.log(
        `[REKAP-ONGKIR] Filtering by date range: ${startDate} to ${endDate}`
      );
    }

    // Add package filter if provided
    if (paket && paket !== "all") {
      whereConditions.push("o.paket_id = ?");
      queryParams.push(paket);
      console.log(`[REKAP-ONGKIR] Filtering by paket_id: ${paket}`);
    }

    // Add status filter if provided
    if (status && status !== "all") {
      if (status === "Sudah Bayar") {
        whereConditions.push(
          "(ro.status = 'Sudah Bayar' OR (ro.status IS NULL AND ro.nominal > 0))"
        );
        console.log("[REKAP-ONGKIR] Filtering by status: Sudah Bayar");
      } else if (status === "Belum Bayar") {
        whereConditions.push(
          "(ro.status = 'Belum Bayar' OR (ro.status IS NULL AND (ro.nominal IS NULL OR ro.nominal = 0)))"
        );
        console.log("[REKAP-ONGKIR] Filtering by status: Belum Bayar");
      }
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    console.log("[REKAP-ONGKIR] Final WHERE clause:", whereClause);
    console.log("[REKAP-ONGKIR] Query parameters:", queryParams);

    // Get all orders with status "Di Kirim" with proper table relationships
    const [rows] = await db.query(
      `
      SELECT 
        COALESCE(ro.id, 0) as id,
        o.id as order_id,
        od.id as order_details_id,
        jk.id as kelengkapan_id,
        COALESCE(ro.nominal, 0) as nominal,
        ro.bukti_tf,
        ro.mutasi,
        ro.status,
        ro.created_at,
        ro.updated_at,
        o.nama_pemesan,
        od.nama_jamaah,
        od.alamat as alamat_lengkap,
        od.no_telepon as kontak,
        CONCAT(
          COALESCE(pu.nama_paket, ''), 
          ' (', 
          COALESCE(DATE_FORMAT(pu.tanggal_keberangkatan, '%d/%m/%Y'), ''), 
          ' - ', 
          COALESCE(DATE_FORMAT(pu.tanggal_kepulangan, '%d/%m/%Y'), ''), 
          ')'
        ) as periode,
        jk.status_pengambilan,
        (SELECT COUNT(*) FROM order_details od2 WHERE od2.order_id = o.id) as total_jamaah,
        (SELECT COUNT(*) FROM order_details od3 
         JOIN jamaah_kelengkapan jk3 ON od3.id = jk3.order_details_id 
         WHERE od3.order_id = o.id AND jk3.status_pengambilan = 'Di Kirim') as shipped_count
      FROM jamaah_kelengkapan jk
      INNER JOIN order_details od ON jk.order_details_id = od.id
      INNER JOIN orders o ON od.order_id = o.id
      LEFT JOIN paket_umroh pu ON o.paket_id = pu.id
      LEFT JOIN rekap_ongkir ro ON (ro.kelengkapan_id = jk.id AND ro.order_id = o.id)
      ${whereClause}
      ORDER BY o.id, o.nama_pemesan, od.nama_jamaah ASC
    `,
      queryParams
    );

    console.log(`[REKAP-ONGKIR] Found ${rows.length} records`);

    // Log summary of results
    if (rows.length > 0) {
      const uniqueOrders = new Set(rows.map((r) => r.order_id));
      const uniquePemesan = new Set(rows.map((r) => r.nama_pemesan));
      console.log(`[REKAP-ONGKIR] Summary:`, {
        totalRecords: rows.length,
        uniqueOrders: uniqueOrders.size,
        uniquePemesan: uniquePemesan.size,
      });
    } else {
      console.log(
        `[REKAP-ONGKIR] WARNING: No records found with current filters!`
      );
    }

    // Group the data by order_id for easier frontend handling
    const groupedData = rows.reduce((acc, row) => {
      if (!acc[row.order_id]) {
        acc[row.order_id] = {
          order_id: row.order_id,
          nama_pemesan: row.nama_pemesan,
          bukti_tf: row.bukti_tf,
          mutasi: row.mutasi,
          items: [],
        };
      }
      acc[row.order_id].items.push(row);
      return acc;
    }, {});

    res.render("rekap-ongkir/rekap_ongkir", {
      title: "Rekap Ongkir",
      rekapOngkir: rows,
      packages: packages,
      filters: {
        startDate: startDate || "",
        endDate: endDate || "",
        paket: paket || "all",
        status: status || "all",
      },
      body: "",
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) {
    console.error("Error fetching rekap ongkir:", err);
    res.status(500).render("rekap-ongkir/rekap_ongkir", {
      title: "Rekap Ongkir",
      rekapOngkir: [],
      packages: [],
      filters: {
        startDate: "",
        endDate: "",
        paket: "all",
        status: "all",
      },
      body: "",
      success: null,
      error: "Gagal memuat data rekap ongkir"
    });
  }
});

// POST /rekap-ongkir/:rekap_id - update individual rekap ongkir record
router.post(
  "/:rekap_id",
  upload.fields([
    { name: "bukti_tf", maxCount: 1 },
    { name: "mutasi", maxCount: 1 },
  ]),
  async (req, res) => {
    const rekapId = req.params.rekap_id;
    const nominal = req.body.nominal;

    if (!nominal || isNaN(nominal)) {
      return res.redirect("/jamaah/rekap-ongkir?error=" + encodeURIComponent("Nominal ongkir tidak valid"));
    }

    try {
      // Check if rekap_ongkir record exists
      const [existingRows] = await db.query(
        "SELECT id FROM rekap_ongkir WHERE id = ?",
        [rekapId]
      );

      if (existingRows.length === 0) {
        return res.redirect("/jamaah/rekap-ongkir?error=" + encodeURIComponent("Data rekap ongkir tidak ditemukan"));
      }

      // Prepare file paths if uploaded
      let buktiTfPath = null;
      let mutasiPath = null;

      if (req.files) {
        if (req.files["bukti_tf"] && req.files["bukti_tf"][0]) {
          buktiTfPath = req.files["bukti_tf"][0].filename;
        }
        if (req.files["mutasi"] && req.files["mutasi"][0]) {
          mutasiPath = req.files["mutasi"][0].filename;
        }
      }

      // Update rekap_ongkir record
      await db.query(
        "UPDATE rekap_ongkir SET nominal = ?, " +
          "bukti_tf = COALESCE(?, bukti_tf), " +
          "mutasi = COALESCE(?, mutasi), " +
          "status = CASE WHEN ? > 0 THEN 'Sudah Bayar' ELSE COALESCE(status, 'Belum Bayar') END, " +
          "updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [nominal, buktiTfPath, mutasiPath, nominal, rekapId]
      );

      // After update, check if both bukti_tf and mutasi are present to update status_pengambilan
      const [updatedRows] = await db.query(
        "SELECT kelengkapan_id, bukti_tf, mutasi FROM rekap_ongkir WHERE id = ?",
        [rekapId]
      );

      if (updatedRows.length > 0) {
        const { kelengkapan_id, bukti_tf, mutasi } = updatedRows[0];
        if (bukti_tf && mutasi) {
          // Update status_pengambilan to "Sudah Diambil"
          await db.query(
            "UPDATE jamaah_kelengkapan SET status_pengambilan = ? WHERE id = ?",
            ["Sudah Diambil", kelengkapan_id]
          );

          // Also update the related request_perlengkapan status to "selesai"
          console.log(
            "Updating request_perlengkapan status to 'selesai' for jamaah_kelengkapan ID:",
            kelengkapan_id
          );

          try {
            // Get order_details_id from jamaah_kelengkapan
            const [jamaahResult] = await db.query(
              `SELECT order_details_id FROM jamaah_kelengkapan WHERE id = ?`,
              [kelengkapan_id]
            );

            if (jamaahResult.length > 0) {
              const orderDetailsId = jamaahResult[0].order_details_id;

              // Get the public_docs_id from purchasing_public_docs table using order_details_id
              const [publicDocsResult] = await db.query(
                `SELECT id FROM purchasing_public_docs WHERE order_details_id = ?`,
                [orderDetailsId]
              );

              if (publicDocsResult.length > 0) {
                const publicDocsId = publicDocsResult[0].id;

                // Update request_perlengkapan status to 'selesai'
                await db.query(
                  `UPDATE request_perlengkapan 
                   SET status = 'selesai', 
                       finished_by = ?,
                       finished_at = NOW(),
                       updated_at = NOW()
                   WHERE public_docs_id = ?`,
                  [req.user ? req.user.id : null, publicDocsId]
                );

                console.log(
                  "Successfully updated request_perlengkapan status to 'selesai' from rekap-ongkir"
                );
              } else {
                console.log(
                  "No public_docs found for order_details_id:",
                  orderDetailsId
                );
              }
            } else {
              console.log(
                "No jamaah_kelengkapan found with ID:",
                kelengkapan_id
              );
            }
          } catch (updateError) {
            console.error(
              "Error updating request_perlengkapan status from rekap-ongkir:",
              updateError
            );
            // Don't throw error here to avoid breaking the main update
          }
        }
      }

      res.redirect("/jamaah/rekap-ongkir?success=" + encodeURIComponent("Data ongkir berhasil diperbarui"));
    } catch (err) {
      console.error("Error updating rekap ongkir:", err);
      res.redirect("/jamaah/rekap-ongkir?error=" + encodeURIComponent("Gagal memperbarui data ongkir"));
    }
  }
);

// Batch update route for updating all jamaah under a pemesan
router.post(
  "/batch-update/:orderId",
  upload.fields([
    { name: "bukti_tf", maxCount: 1 },
    { name: "mutasi", maxCount: 1 },
  ]),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const orderId = req.params.orderId;
      let nominalData;

      try {
        nominalData =
          typeof req.body.nominalData === "string"
            ? JSON.parse(req.body.nominalData)
            : req.body.nominalData;
      } catch (e) {
        console.error("Error parsing nominalData:", e);
        throw new Error("Format data nominal tidak valid");
      }

      console.log("Received orderId:", orderId);
      console.log("Received nominalData:", nominalData);
      console.log("Received files:", req.files);

      // Handle file uploads
      let buktiTfPath = null;
      let mutasiPath = null;

      if (req.files) {
        if (req.files["bukti_tf"] && req.files["bukti_tf"][0]) {
          buktiTfPath = req.files["bukti_tf"][0].filename;
          console.log("Bukti TF uploaded:", buktiTfPath);
        }
        if (req.files["mutasi"] && req.files["mutasi"][0]) {
          mutasiPath = req.files["mutasi"][0].filename;
          console.log("Mutasi uploaded:", mutasiPath);
        }
      }

      // Get all kelengkapan_id for this order
      let [kelengkapanList] = await connection.query(
        `
            SELECT 
                jk.id as kelengkapan_id, 
                od.nama_jamaah, 
                o.nama_pemesan,
                ro.id as rekap_id
            FROM jamaah_kelengkapan jk
            JOIN order_details od ON jk.order_details_id = od.id
            JOIN orders o ON od.order_id = o.id
            LEFT JOIN rekap_ongkir ro ON (ro.kelengkapan_id = jk.id AND ro.order_id = o.id)
            WHERE o.id = ?
            ORDER BY od.nama_jamaah ASC
        `,
        [orderId]
      );

      if (kelengkapanList.length === 0) {
        throw new Error("Data kelengkapan tidak ditemukan untuk order ini");
      }

      // Calculate total nominal from all jamaah
      const totalNominal = Object.values(nominalData).reduce((sum, nominal) => {
        const num = parseFloat(nominal);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

      console.log("Total nominal calculated:", totalNominal);
      console.log("Kelengkapan list:", kelengkapanList);

      // Update or create rekap_ongkir records for each jamaah
      for (const kelengkapan of kelengkapanList) {
        const individualNominal = nominalData[kelengkapan.kelengkapan_id] || 0;

        if (kelengkapan.rekap_id) {
          // Update existing record with individual nominal
          await connection.query(
            `
                    UPDATE rekap_ongkir 
                    SET nominal = ?,
                        bukti_tf = COALESCE(?, bukti_tf),
                        mutasi = COALESCE(?, mutasi),
                        status = CASE WHEN ? > 0 THEN 'Sudah Bayar' ELSE COALESCE(status, 'Belum Bayar') END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `,
            [
              individualNominal,
              buktiTfPath,
              mutasiPath,
              individualNominal,
              kelengkapan.rekap_id,
            ]
          );

          console.log(
            `Updated existing rekap_ongkir record: ${kelengkapan.rekap_id} with nominal: ${individualNominal}`
          );
        } else {
          // Create new record with individual nominal
          const [result] = await connection.query(
            `
                    INSERT INTO rekap_ongkir 
                    (order_id, kelengkapan_id, nominal, bukti_tf, mutasi, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, CASE WHEN ? > 0 THEN 'Sudah Bayar' ELSE 'Belum Bayar' END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `,
            [
              orderId,
              kelengkapan.kelengkapan_id,
              individualNominal,
              buktiTfPath,
              mutasiPath,
              individualNominal,
            ]
          );

          console.log(
            `Created new rekap_ongkir record: ${result.insertId} for kelengkapan_id: ${kelengkapan.kelengkapan_id} with nominal: ${individualNominal}`
          );
        }
      }

      // Only update status_pengambilan if BOTH new files are uploaded
      // This prevents automatic status change when only nominal is updated
      if (buktiTfPath && mutasiPath) {
        // Update status for all jamaah in this order
        await connection.query(
          `
                UPDATE jamaah_kelengkapan jk
                JOIN order_details od ON jk.order_details_id = od.id
                SET jk.status_pengambilan = ?
                WHERE od.order_id = ?
            `,
          ["Sudah Diambil", orderId]
        );

        console.log(
          `Status updated to 'Sudah Diambil' for all jamaah in order: ${orderId}`
        );

        // Also update all related request_perlengkapan records to "selesai"
        console.log(
          "Updating request_perlengkapan status to 'selesai' for all jamaah in order:",
          orderId
        );

        try {
          // Get all kelengkapan_ids that were updated
          const [updatedKelengkapan] = await connection.query(
            `SELECT jk.id as kelengkapan_id, jk.order_details_id 
             FROM jamaah_kelengkapan jk
             JOIN order_details od ON jk.order_details_id = od.id
             WHERE od.order_id = ?`,
            [orderId]
          );

          // Update request_perlengkapan for each kelengkapan
          for (const kelengkapan of updatedKelengkapan) {
            // Get the public_docs_id from purchasing_public_docs table using order_details_id
            const [publicDocsResult] = await connection.query(
              `SELECT id FROM purchasing_public_docs WHERE order_details_id = ?`,
              [kelengkapan.order_details_id]
            );

            if (publicDocsResult.length > 0) {
              const publicDocsId = publicDocsResult[0].id;

              // Update request_perlengkapan status to 'selesai'
              await connection.query(
                `UPDATE request_perlengkapan 
                 SET status = 'selesai', 
                     finished_by = ?,
                     finished_at = NOW(),
                     updated_at = NOW()
                 WHERE public_docs_id = ?`,
                [req.user ? req.user.id : null, publicDocsId]
              );

              console.log(
                `Updated request_perlengkapan for kelengkapan_id: ${kelengkapan.kelengkapan_id}`
              );
            } else {
              console.log(
                `No public_docs found for order_details_id: ${kelengkapan.order_details_id}`
              );
            }
          }

          console.log(
            "Successfully updated all request_perlengkapan status to 'selesai' from batch update"
          );
        } catch (updateError) {
          console.error(
            "Error updating request_perlengkapan status from batch update:",
            updateError
          );
          // Don't throw error here to avoid breaking the main update
        }
      } else {
        console.log("Status not updated - both files not provided");
      }

      await connection.commit();

      res.json({
        success: true,
        message: "Data ongkir berhasil diperbarui",
        total_nominal: totalNominal,
        bukti_tf: buktiTfPath,
        mutasi: mutasiPath,
        status_updated: buktiTfPath && mutasiPath,
      });
    } catch (err) {
      await connection.rollback();
      console.error("Error in batch update rekap ongkir:", err);
      res.status(500).json({
        error: err.message || "Gagal menyimpan data ongkir",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    } finally {
      connection.release();
    }
  }
);

// GET /rekap-ongkir/detail-penerima/:order_details_id - get detail penerima for jamaah
router.get("/detail-penerima/:order_details_id", async (req, res) => {
  const orderDetailsId = req.params.order_details_id;

  if (!orderDetailsId) {
    return res.status(400).json({ error: "Order Details ID diperlukan" });
  }

  try {
    console.log(
      `[DETAIL-PENERIMA] Fetching detail penerima for order_details_id: ${orderDetailsId}`
    );

    // First, let's check if the order_details_id exists in order_details table
    const [orderCheck] = await db.query(
      `SELECT id, nama_jamaah FROM order_details WHERE id = ?`,
      [orderDetailsId]
    );

    console.log(`[DETAIL-PENERIMA] Order details check:`, orderCheck);

    if (orderCheck.length === 0) {
      console.log(
        `[DETAIL-PENERIMA] Order details not found for ID: ${orderDetailsId}`
      );
      return res.status(404).json({
        error: "Order Details tidak ditemukan",
        message: "ID Order Details tidak valid",
      });
    }

    // Now check if purchasing_public_docs exists for this order_details_id
    const [purchasingCheck] = await db.query(
      `SELECT * FROM purchasing_public_docs WHERE order_details_id = ?`,
      [orderDetailsId]
    );

    console.log(
      `[DETAIL-PENERIMA] Purchasing public docs check:`,
      purchasingCheck
    );

    // Query to get purchasing_public_docs data with province and kabupaten names
    const [rows] = await db.query(
      `
            SELECT 
                ppd.id,
                ppd.order_details_id,
                ppd.nama_penerima,
                ppd.nomor_telp,
                ppd.alamat_lengkap,
                ppd.kecamatan,
                ppd.kelurahan,
                ppd.provinsi_id,
                ppd.kabupaten_id,
                ppd.created_at,
                ppd.updated_at,
                p.nama_provinsi as provinsi_nama,
                k.nama_kabupaten as kabupaten_nama,
                od.nama_jamaah
            FROM purchasing_public_docs ppd
            LEFT JOIN provinsi p ON ppd.provinsi_id = p.id
            LEFT JOIN kabupaten k ON ppd.kabupaten_id = k.id
            LEFT JOIN order_details od ON ppd.order_details_id = od.id
            WHERE ppd.order_details_id = ?
        `,
      [orderDetailsId]
    );

    console.log(`[DETAIL-PENERIMA] Final query result:`, rows);

    if (rows.length === 0) {
      console.log(
        `[DETAIL-PENERIMA] No data found for order_details_id: ${orderDetailsId}`
      );

      // If no data found, return jamaah info but indicate no receiver data
      return res.json({
        order_details_id: orderDetailsId,
        nama_jamaah: orderCheck[0].nama_jamaah,
        has_receiver_data: false,
        message: "Data penerima belum diinput untuk jamaah ini",
      });
    }

    const detailPenerima = rows[0];
    console.log(
      `[DETAIL-PENERIMA] Found data for ${detailPenerima.nama_jamaah}: ${detailPenerima.nama_penerima}`
    );

    res.json({
      ...detailPenerima,
      has_receiver_data: true,
    });
  } catch (err) {
    console.error("Error fetching detail penerima:", err);
    res.status(500).json({
      error: "Gagal mengambil data detail penerima",
      message: err.message,
    });
  }
});

// Route to update payment status
router.post("/:id/update-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(
      `[UPDATE-STATUS] Updating rekap_ongkir id ${id} to status: ${status}`
    );

    // Validate status
    if (!status || !["Sudah Bayar", "Belum Bayar"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid. Harus "Sudah Bayar" atau "Belum Bayar"',
      });
    }

    // Check if record exists
    const [existing] = await db.query(
      "SELECT id FROM rekap_ongkir WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Record rekap ongkir tidak ditemukan",
      });
    }

    // Update status
    await db.query(
      "UPDATE rekap_ongkir SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id]
    );

    console.log(
      `[UPDATE-STATUS] Successfully updated rekap_ongkir id ${id} to status: ${status}`
    );

    res.json({
      success: true,
      message: `Status pembayaran berhasil diupdate ke ${status}`,
    });
  } catch (err) {
    console.error("Error updating payment status:", err);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengupdate status pembayaran",
    });
  }
});

// Update jamaah specific rekap ongkir (for individual jamaah)
router.post(
  "/jamaah-update/:orderDetailsId",
  upload.fields([
    { name: "bukti_tf", maxCount: 1 },
    { name: "mutasi", maxCount: 1 },
  ]),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const orderDetailsId = req.params.orderDetailsId;
      let nominalData;

      try {
        nominalData =
          typeof req.body.nominalData === "string"
            ? JSON.parse(req.body.nominalData)
            : req.body.nominalData;
      } catch (e) {
        console.error("Error parsing nominalData:", e);
        throw new Error("Format data nominal tidak valid");
      }

      console.log("Received orderDetailsId:", orderDetailsId);
      console.log("Received nominalData:", nominalData);
      console.log("Received files:", req.files);

      // Handle file uploads
      let buktiTfPath = null;
      let mutasiPath = null;

      if (req.files) {
        if (req.files["bukti_tf"] && req.files["bukti_tf"][0]) {
          buktiTfPath = req.files["bukti_tf"][0].filename;
          console.log("Bukti TF uploaded:", buktiTfPath);
        }
        if (req.files["mutasi"] && req.files["mutasi"][0]) {
          mutasiPath = req.files["mutasi"][0].filename;
          console.log("Mutasi uploaded:", mutasiPath);
        }
      }

      // Get kelengkapan data for this specific jamaah
      let [kelengkapanList] = await connection.query(
        `
            SELECT 
                jk.id as kelengkapan_id, 
                od.nama_jamaah, 
                od.order_id,
                o.nama_pemesan,
                ro.id as rekap_id
            FROM jamaah_kelengkapan jk
            JOIN order_details od ON jk.order_details_id = od.id
            JOIN orders o ON od.order_id = o.id
            LEFT JOIN rekap_ongkir ro ON (ro.kelengkapan_id = jk.id AND ro.order_id = o.id)
            WHERE od.id = ?
            ORDER BY jk.id DESC
            LIMIT 1
        `,
        [orderDetailsId]
      );

      console.log("Found kelengkapan data:", kelengkapanList);

      if (kelengkapanList.length === 0) {
        throw new Error("Data kelengkapan jamaah tidak ditemukan");
      }

      const kelengkapanData = kelengkapanList[0];
      const kelengkapanId = kelengkapanData.kelengkapan_id;
      const orderId = kelengkapanData.order_id;

      // Get nominal for this jamaah
      const nominal =
        nominalData[kelengkapanId] || nominalData[orderDetailsId] || 0;

      console.log(
        `Processing jamaah: ${kelengkapanData.nama_jamaah}, nominal: ${nominal}`
      );

      if (kelengkapanData.rekap_id) {
        // Update existing record
        console.log(
          `Updating existing rekap_ongkir record ID: ${kelengkapanData.rekap_id}`
        );

        let updateFields = ["nominal = ?"];
        let updateValues = [nominal];

        if (buktiTfPath) {
          updateFields.push("bukti_tf = ?");
          updateValues.push(buktiTfPath);
        }
        if (mutasiPath) {
          updateFields.push("mutasi = ?");
          updateValues.push(mutasiPath);
        }

        updateFields.push("updated_at = NOW()");
        updateValues.push(kelengkapanData.rekap_id);

        await connection.query(
          `UPDATE rekap_ongkir SET ${updateFields.join(", ")} WHERE id = ?`,
          updateValues
        );
      } else {
        // Insert new record
        console.log(
          `Creating new rekap_ongkir record for kelengkapan_id: ${kelengkapanId}`
        );

        await connection.query(
          `INSERT INTO rekap_ongkir (order_id, kelengkapan_id, nominal, bukti_tf, mutasi, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [orderId, kelengkapanId, nominal, buktiTfPath, mutasiPath]
        );
      }

      await connection.commit();

      console.log("Jamaah rekap ongkir update completed successfully");

      res.json({
        success: true,
        message: `Data ongkir untuk ${kelengkapanData.nama_jamaah} berhasil diperbarui!`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error in jamaah rekap ongkir update:", error);
      res.status(500).json({
        success: false,
        message:
          error.message || "Terjadi kesalahan saat memperbarui data ongkir",
      });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
