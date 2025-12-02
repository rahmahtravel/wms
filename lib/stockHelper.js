const db = require('../config/database');

/**
 * UPDATE WAREHOUSE STOCK
 * 
 * Fungsi ini menghitung ulang stock di warehouse_stock berdasarkan
 * semua transaksi di stock_movements (IN - OUT).
 * 
 * @param {Connection} connection - MySQL connection object (untuk transaction)
 * @param {number} barangId - ID barang yang akan di-update
 * @param {number} warehouseId - ID warehouse yang akan di-update
 * @returns {Promise<{success: boolean, newStock: number}>}
 */
async function updateWarehouseStock(connection, barangId, warehouseId) {
  try {
    // Step 1: Hitung total IN dan OUT dari stock_movements
    const [movements] = await connection.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END), 0) as total_out
      FROM stock_movements
      WHERE barang_id = ? AND warehouse_id = ?
    `, [barangId, warehouseId]);

    const currentStock = movements[0].total_in - movements[0].total_out;

    // Step 2: Check apakah record sudah ada
    const [existing] = await connection.query(`
      SELECT id FROM warehouse_stock 
      WHERE barang_id = ? AND warehouse_id = ?
    `, [barangId, warehouseId]);

    // Step 3: Update atau Insert
    if (existing.length > 0) {
      await connection.query(`
        UPDATE warehouse_stock 
        SET quantity = ?, updated_at = NOW()
        WHERE barang_id = ? AND warehouse_id = ?
      `, [currentStock, barangId, warehouseId]);
    } else {
      await connection.query(`
        INSERT INTO warehouse_stock (barang_id, warehouse_id, quantity, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `, [barangId, warehouseId, currentStock]);
    }

    return { success: true, newStock: currentStock };
  } catch (error) {
    console.error('Error in updateWarehouseStock:', error);
    throw error;
  }
}

/**
 * UPDATE GLOBAL STOCK
 * 
 * Fungsi ini menghitung total stock dari SEMUA warehouse
 * dan update ke purchasing_barang.stock_akhir
 * 
 * @param {Connection} connection - MySQL connection object
 * @param {number} barangId - ID barang yang akan di-update
 * @returns {Promise<{success: boolean, newGlobalStock: number}>}
 */
async function updateGlobalStock(connection, barangId) {
  try {
    // Step 1: Sum stock dari semua warehouse
    const [result] = await connection.query(`
      SELECT COALESCE(SUM(quantity), 0) as total_stock
      FROM warehouse_stock
      WHERE barang_id = ?
    `, [barangId]);

    const totalStock = result[0].total_stock;

    // Step 2: Update stock_akhir di purchasing_barang
    await connection.query(`
      UPDATE purchasing_barang 
      SET stock_akhir = ?, updated_at = NOW()
      WHERE id_barang = ?
    `, [totalStock, barangId]);

    return { success: true, newGlobalStock: totalStock };
  } catch (error) {
    console.error('Error in updateGlobalStock:', error);
    throw error;
  }
}

/**
 * VALIDATE STOCK AVAILABILITY
 * 
 * Cek apakah stock mencukupi sebelum melakukan transaksi keluar
 * 
 * @param {Connection} connection - MySQL connection object
 * @param {number} barangId - ID barang
 * @param {number} warehouseId - ID warehouse
 * @param {number} requiredQuantity - Jumlah yang dibutuhkan
 * @returns {Promise<{available: boolean, currentStock: number, message: string}>}
 */
async function validateStockAvailability(connection, barangId, warehouseId, requiredQuantity) {
  try {
    const [stockData] = await connection.query(`
      SELECT quantity FROM warehouse_stock
      WHERE barang_id = ? AND warehouse_id = ?
    `, [barangId, warehouseId]);

    const currentStock = stockData.length > 0 ? stockData[0].quantity : 0;

    if (currentStock >= requiredQuantity) {
      return {
        available: true,
        currentStock: currentStock,
        message: 'Stock tersedia'
      };
    } else {
      return {
        available: false,
        currentStock: currentStock,
        message: `Stock tidak mencukupi. Tersedia: ${currentStock}, Dibutuhkan: ${requiredQuantity}`
      };
    }
  } catch (error) {
    console.error('Error in validateStockAvailability:', error);
    throw error;
  }
}

/**
 * RECORD INCOMING STOCK
 * 
 * Helper function untuk mencatat barang masuk dengan automatic stock update
 * 
 * @param {Connection} connection - MySQL connection (harus dalam transaction)
 * @param {object} data - {barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes}
 * @returns {Promise<{success: boolean, movementId: number}>}
 */
async function recordIncomingStock(connection, data) {
  const { barangId, quantity, referenceType, referenceId, notes } = data;

  try {
    // Step 1: Insert movement record (warehouse info now in purchasing_barang)
    const [movementResult] = await connection.query(`
      INSERT INTO stock_movements 
      (id_barang, movement_type, quantity_change, 
       reference_type, reference_id, notes, created_at)
      VALUES (?, 'IN', ?, ?, ?, ?, NOW())
    `, [barangId, quantity, referenceType, referenceId, notes]);

    // Step 2: Update global stock directly
    await connection.query(`
      UPDATE purchasing_barang 
      SET stock_akhir = stock_akhir + ?
      WHERE id_barang = ?
    `, [quantity, barangId]);

    return { success: true, movementId: movementResult.insertId };
  } catch (error) {
    console.error('Error in recordIncomingStock:', error);
    throw error;
  }
}

/**
 * RECORD OUTGOING STOCK
 * 
 * Helper function untuk mencatat barang keluar dengan validation
 * 
 * @param {Connection} connection - MySQL connection (harus dalam transaction)
 * @param {object} data - {barangId, warehouseId, rackId, binId, quantity, referenceType, referenceId, notes}
 * @returns {Promise<{success: boolean, movementId: number}>}
 */
async function recordOutgoingStock(connection, data) {
  const { barangId, quantity, referenceType, referenceId, notes } = data;

  try {
    // Step 1: Validate stock availability from purchasing_barang
    const [barangData] = await connection.query(`
      SELECT stock_akhir FROM purchasing_barang WHERE id_barang = ?
    `, [barangId]);

    const currentStock = barangData[0]?.stock_akhir || 0;
    if (currentStock < quantity) {
      throw new Error(`Stock tidak mencukupi. Tersedia: ${currentStock}, Dibutuhkan: ${quantity}`);
    }

    // Step 2: Insert movement record
    const [movementResult] = await connection.query(`
      INSERT INTO stock_movements 
      (id_barang, movement_type, quantity_change, 
       reference_type, reference_id, notes, created_at)
      VALUES (?, 'OUT', ?, ?, ?, ?, NOW())
    `, [barangId, -quantity, referenceType, referenceId, notes]);

    // Step 3: Update global stock
    await connection.query(`
      UPDATE purchasing_barang 
      SET stock_akhir = stock_akhir - ?
      WHERE id_barang = ?
    `, [quantity, barangId]);

    return { success: true, movementId: movementResult.insertId };
  } catch (error) {
    console.error('Error in recordOutgoingStock:', error);
    throw error;
  }
}

/**
 * TRANSFER STOCK BETWEEN WAREHOUSES
 * 
 * Transfer stock dari warehouse satu ke warehouse lain dengan atomic transaction
 * 
 * @param {Connection} connection - MySQL connection (harus dalam transaction)
 * @param {object} transferData - {barangId, sourceWarehouseId, destinationWarehouseId, quantity, notes, userId}
 * @returns {Promise<{success: boolean, transferId: number}>}
 */
async function transferStock(connection, transferData) {
  const { barangId, sourceWarehouseId, destinationWarehouseId, quantity, notes, userId } = transferData;

  try {
    // Step 1: Validate source stock (simplified - check global stock)
    const [barangData] = await connection.query(`
      SELECT stock_akhir FROM purchasing_barang WHERE id_barang = ?
    `, [barangId]);

    const currentStock = barangData[0]?.stock_akhir || 0;
    if (currentStock < quantity) {
      throw new Error(`Transfer gagal. Stock tidak mencukupi. Tersedia: ${currentStock}, Dibutuhkan: ${quantity}`);
    }

    // Step 2: Create transfer record
    const [transferResult] = await connection.query(`
      INSERT INTO warehouse_transfers 
      (from_warehouse_id, to_warehouse_id, transfer_date, status, requested_by, notes, created_at)
      VALUES (?, ?, NOW(), 'completed', ?, ?, NOW())
    `, [sourceWarehouseId, destinationWarehouseId, userId, notes]);

    const transferId = transferResult.insertId;

    // Step 3: Record movement (warehouse location tracked in purchasing_barang, not movement)
    await connection.query(`
      INSERT INTO stock_movements 
      (id_barang, movement_type, quantity_change, reference_type, reference_id, notes, created_at)
      VALUES (?, 'TRANSFER', 0, 'TRANSFER', ?, ?, NOW())
    `, [barangId, transferId, notes]);

    // Note: Stock stays the same globally, only location changes
    // Actual warehouse location is managed in purchasing_barang table

    return { success: true, transferId };
  } catch (error) {
    console.error('Error in transferStock:', error);
    throw error;
  }
}

/**
 * GET STOCK SUMMARY
 * 
 * Mendapatkan summary stock untuk dashboard atau reports
 * 
 * @param {number|null} barangId - Filter by barang (optional)
 * @param {number|null} warehouseId - Filter by warehouse (optional)
 * @returns {Promise<Array>} Array of stock summary
 */
async function getStockSummary(barangId = null, warehouseId = null) {
  try {
    let query = `
      SELECT 
        ws.barang_id,
        pb.kode_barang,
        pb.nama_barang,
        ws.warehouse_id,
        wl.nama_lokasi as warehouse_name,
        ws.quantity as current_stock,
        pb.stock_minimal as min_stock,
        pb.satuan,
        CASE 
          WHEN ws.quantity <= pb.stock_minimal THEN 'low'
          WHEN ws.quantity <= (pb.stock_minimal * 1.5) THEN 'medium'
          ELSE 'good'
        END as stock_status,
        ws.updated_at
      FROM warehouse_stock ws
      JOIN purchasing_barang pb ON ws.barang_id = pb.id_barang
      JOIN warehouse_locations wl ON ws.warehouse_id = wl.id
      WHERE 1=1
    `;

    const params = [];

    if (barangId) {
      query += ' AND ws.barang_id = ?';
      params.push(barangId);
    }

    if (warehouseId) {
      query += ' AND ws.warehouse_id = ?';
      params.push(warehouseId);
    }

    query += ' ORDER BY pb.nama_barang, wl.nama_lokasi';

    const [results] = await db.query(query, params);
    return results;
  } catch (error) {
    console.error('Error in getStockSummary:', error);
    throw error;
  }
}

// Export semua functions
module.exports = {
  updateWarehouseStock,
  updateGlobalStock,
  validateStockAvailability,
  recordIncomingStock,
  recordOutgoingStock,
  transferStock,
  getStockSummary
};
