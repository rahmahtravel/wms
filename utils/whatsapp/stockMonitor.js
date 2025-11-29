/**
 * Stock Monitoring Middleware for WhatsApp Notifications
 * 
 * This middleware automatically checks stock levels and sends notifications
 * when stock is running low.
 */

const db = require('../config/database');
const whatsappService = require('../utils/whatsapp/notificationService');

class StockMonitor {
  constructor() {
    this.isCheckingStock = false;
    this.lastCheckTime = null;
    this.checkIntervalMinutes = 60; // Check every hour
  }

  /**
   * Check all stock levels and send notifications for low stock
   */
  async checkLowStock() {
    if (this.isCheckingStock) {
      console.log('Stock checking already in progress, skipping...');
      return;
    }

    try {
      this.isCheckingStock = true;
      console.log('🔍 Starting automatic stock check...');

      const [lowStockItems] = await db.query(`
        SELECT 
          pb.id_barang,
          pb.kode_barang,
          pb.nama_barang,
          pb.satuan,
          pb.stock_akhir,
          pb.stock_minimal,
          ps.name as nama_supplier,
          ps.phone as supplier_phone
        FROM purchasing_barang pb
        LEFT JOIN purchasing_suppliers ps ON pb.category_id = ps.id
        WHERE pb.stock_akhir <= pb.stock_minimal 
        AND pb.stock_minimal > 0
        ORDER BY (pb.stock_akhir / GREATEST(pb.stock_minimal, 1)) ASC
      `);

      if (lowStockItems.length > 0) {
        console.log(`⚠️ Found ${lowStockItems.length} items with low stock`);
        
        // Group notification message
        let groupMessage = `🚨 *PERINGATAN STOCK RENDAH* 🚨\n\n`;
        groupMessage += `Ditemukan ${lowStockItems.length} barang dengan stock rendah:\n\n`;
        
        for (const item of lowStockItems) {
          const percentage = Math.round((item.stock_akhir / item.stock_minimal) * 100);
          groupMessage += `📦 *${item.nama_barang}*\n`;
          groupMessage += `   Stock: ${item.stock_akhir} ${item.satuan} (${percentage}%)\n`;
          groupMessage += `   Minimal: ${item.stock_minimal} ${item.satuan}\n\n`;
        }
        
        groupMessage += `⚠️ Mohon segera lakukan pemesanan ulang!`;
        
        // Send to warehouse group
        await whatsappService.sendWarehouseAlert(groupMessage);
        
        // Send individual notifications if needed (uncomment if required)
        /*
        for (const item of lowStockItems.slice(0, 5)) { // Limit to 5 most critical
          if (item.supplier_phone) {
            await whatsappService.notifyLowStock(item, [item.supplier_phone]);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between messages
          }
        }
        */
        
        console.log(`✅ Low stock notifications sent for ${lowStockItems.length} items`);
      } else {
        console.log('✅ All stock levels are adequate');
      }

      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error during stock check:', error);
    } finally {
      this.isCheckingStock = false;
    }
  }

  /**
   * Check if it's time to run automatic stock check
   */
  shouldCheckStock() {
    if (!this.lastCheckTime) return true;
    
    const now = new Date();
    const timeDiff = (now - this.lastCheckTime) / (1000 * 60); // minutes
    
    return timeDiff >= this.checkIntervalMinutes;
  }

  /**
   * Middleware function to check stock after stock-affecting operations
   */
  async checkStockAfterOperation(req, res, next) {
    // Run the original operation first
    next();

    // Then check stock asynchronously (non-blocking)
    setTimeout(async () => {
      if (this.shouldCheckStock()) {
        await this.checkLowStock();
      }
    }, 5000); // Wait 5 seconds after operation completes
  }

  /**
   * Start automatic stock monitoring with interval
   */
  startMonitoring() {
    console.log(`🔄 Starting automatic stock monitoring (every ${this.checkIntervalMinutes} minutes)`);
    
    // Initial check
    setTimeout(() => this.checkLowStock(), 30000); // Check after 30 seconds
    
    // Set up interval
    setInterval(() => {
      if (this.shouldCheckStock()) {
        this.checkLowStock();
      }
    }, this.checkIntervalMinutes * 60 * 1000);
  }

  /**
   * Manual trigger for immediate stock check
   */
  async triggerManualCheck() {
    console.log('🔍 Manual stock check triggered');
    await this.checkLowStock();
  }
}

// Export singleton instance
const stockMonitor = new StockMonitor();

module.exports = {
  stockMonitor,
  
  // Middleware for automatic checking after operations
  checkStockMiddleware: (req, res, next) => {
    stockMonitor.checkStockAfterOperation(req, res, next);
  },
  
  // Manual check route handler
  manualStockCheck: async (req, res) => {
    try {
      await stockMonitor.triggerManualCheck();
      res.json({ success: true, message: 'Stock check completed' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};