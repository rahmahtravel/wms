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
      SELECT sm.*, pb.nama_barang,
        ${wlCol2} as location_name,
        ${bCol2} as branch_name
      FROM stock_movements sm
      LEFT JOIN purchasing_barang pb ON sm.id_barang = pb.id_barang
      LEFT JOIN warehouse_locations wl ON sm.warehouse_id = wl.id
      LEFT JOIN branches b ON sm.branch_id = b.id
      ORDER BY sm.movement_date DESC
      LIMIT 100
    `);
    res.render('stock/movements', { title: 'Histori Pergerakan Stok', movements, body: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
