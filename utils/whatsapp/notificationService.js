/**
 * WhatsApp Integration Helper for Purchasing-Logistic System
 * 
 * This file provides easy integration examples for using WhatsApp notifications
 * throughout the purchasing-logistic application.
 */

const whatsapp = require('./whatsapp');

class WhatsAppNotificationService {
  constructor() {
    this.whatsapp = whatsapp;
  }

  /**
   * Send notification when stock is running low
   * Usage: Call this from your stock checking logic
   */
  async notifyLowStock(barangData, adminPhoneNumbers = []) {
    try {
      const data = {
        nama_barang: barangData.nama_barang,
        stock_akhir: barangData.stock_akhir,
        stock_minimal: barangData.stock_minimal,
        satuan: barangData.satuan,
        nama_supplier: barangData.supplier?.nama_supplier || 'Belum ditentukan'
      };

      // Send to admin group
      const groupMessage = 
        `🚨 *PERINGATAN STOCK RENDAH* 🚨\n\n` +
        `Barang: ${data.nama_barang}\n` +
        `Stock: ${data.stock_akhir} ${data.satuan}\n` +
        `Minimum: ${data.stock_minimal} ${data.satuan}\n` +
        `Supplier: ${data.nama_supplier}\n\n` +
        `⚠️ Segera lakukan pemesanan ulang!`;

      await this.whatsapp.sendWarehouseGroupNotification(groupMessage);

      // Send to individual admins if provided
      if (adminPhoneNumbers.length > 0) {
        const promises = adminPhoneNumbers.map(phone => 
          this.whatsapp.sendLowStockAlert(phone, data)
        );
        await Promise.all(promises);
      }

      console.log('✅ Low stock notifications sent successfully');
      return { success: true, message: 'Notifications sent' };

    } catch (error) {
      console.error('❌ Error sending low stock notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification when barang keluar/outgoing
   * Usage: Call this after successful outgoing transaction
   */
  async notifyOutgoing(outgoingData, recipientPhone) {
    try {
      const data = {
        nama_penerima: outgoingData.nama_penerima || 'Penerima',
        nama_barang: outgoingData.nama_barang,
        jumlah: outgoingData.jumlah,
        satuan: outgoingData.satuan,
        tanggal: new Date(outgoingData.tanggal).toLocaleDateString('id-ID'),
        tujuan: outgoingData.tujuan || 'Tidak disebutkan'
      };

      const result = await this.whatsapp.sendOutgoingNotification(recipientPhone, data);
      
      if (result.success) {
        console.log('✅ Outgoing notification sent successfully');
        return { success: true, message: 'Notification sent' };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Error sending outgoing notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification when barang masuk/incoming
   * Usage: Call this after successful incoming transaction
   */
  async notifyIncoming(incomingData, supplierPhone) {
    try {
      const data = {
        nama_supplier: incomingData.nama_supplier || 'Supplier',
        nama_barang: incomingData.nama_barang,
        jumlah: incomingData.jumlah,
        satuan: incomingData.satuan,
        tanggal: new Date(incomingData.tanggal).toLocaleDateString('id-ID'),
        no_faktur: incomingData.no_faktur || null
      };

      const result = await this.whatsapp.sendIncomingNotification(supplierPhone, data);
      
      if (result.success) {
        console.log('✅ Incoming notification sent successfully');
        return { success: true, message: 'Notification sent' };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Error sending incoming notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for stock opname results
   * Usage: Call this after completing stock opname
   */
  async notifyOpnameResults(opnameData, adminPhoneNumbers = []) {
    try {
      const data = {
        tanggal: new Date(opnameData.tanggal).toLocaleDateString('id-ID'),
        sesi_opname: opnameData.sesi_opname,
        total_items: opnameData.total_items,
        total_selisih: opnameData.total_selisih || 0
      };

      // Send to warehouse group
      const groupMessage = 
        `📊 *HASIL STOCK OPNAME* 📊\n\n` +
        `Tanggal: ${data.tanggal}\n` +
        `Sesi: ${data.sesi_opname}\n` +
        `Total Item: ${data.total_items}\n` +
        `Selisih: ${data.total_selisih}\n\n` +
        `${data.total_selisih > 0 ? '⚠️ Ada selisih yang perlu disesuaikan' : '✅ Stock akurat'}`;

      await this.whatsapp.sendWarehouseGroupNotification(groupMessage);

      // Send detailed notification to admins
      if (adminPhoneNumbers.length > 0) {
        const promises = adminPhoneNumbers.map(phone => 
          this.whatsapp.sendOpnameNotification(phone, data)
        );
        await Promise.all(promises);
      }

      console.log('✅ Opname notifications sent successfully');
      return { success: true, message: 'Notifications sent' };

    } catch (error) {
      console.error('❌ Error sending opname notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification for jamaah kelengkapan updates
   * Usage: Call this when kelengkapan status changes
   */
  async notifyKelengkapanUpdate(jamaahData) {
    try {
      const data = {
        nama_jamaah: jamaahData.nama_jamaah,
        nama_paket: jamaahData.nama_paket,
        tanggal_keberangkatan: new Date(jamaahData.tanggal_keberangkatan).toLocaleDateString('id-ID'),
        batch: jamaahData.batch,
        status_pengambilan: jamaahData.status_pengambilan
      };

      const result = await this.whatsapp.sendKelengkapanNotification(jamaahData.no_hp, data);
      
      if (result.success) {
        console.log('✅ Kelengkapan notification sent successfully');
        return { success: true, message: 'Notification sent' };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Error sending kelengkapan notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send transfer notification between warehouses
   * Usage: Call this after successful transfer
   */
  async notifyTransfer(transferData, recipientPhone) {
    try {
      const data = {
        nama_penerima: transferData.nama_penerima || 'Tim Gudang',
        nama_barang: transferData.nama_barang,
        jumlah: transferData.jumlah,
        satuan: transferData.satuan,
        gudang_asal: transferData.gudang_asal,
        gudang_tujuan: transferData.gudang_tujuan,
        tanggal: new Date(transferData.tanggal).toLocaleDateString('id-ID'),
        keterangan: transferData.keterangan || null,
        status: transferData.status || 'DALAM_PROSES'
      };

      const result = await this.whatsapp.sendTransferNotification(recipientPhone, data);
      
      if (result.success) {
        console.log('✅ Transfer notification sent successfully');
        return { success: true, message: 'Notification sent' };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Error sending transfer notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send custom message to admin group
   * Usage: For general admin notifications
   */
  async sendAdminAlert(message) {
    try {
      const result = await this.whatsapp.sendAdminGroupNotification(message);
      
      if (result.success) {
        console.log('✅ Admin alert sent successfully');
        return { success: true, message: 'Alert sent' };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Error sending admin alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send custom message to warehouse group
   * Usage: For warehouse-specific notifications
   */
  async sendWarehouseAlert(message) {
    try {
      const result = await this.whatsapp.sendWarehouseGroupNotification(message);
      
      if (result.success) {
        console.log('✅ Warehouse alert sent successfully');
        return { success: true, message: 'Alert sent' };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Error sending warehouse alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch send notifications to multiple recipients
   * Usage: For sending the same message to multiple people
   */
  async sendBatchNotifications(phoneNumbers, message) {
    try {
      const results = [];
      
      for (const phone of phoneNumbers) {
        try {
          const result = await this.whatsapp.sendWhatsAppMessage(phone, message);
          results.push({
            phone,
            success: result.success,
            error: result.error || null
          });
          
          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          results.push({
            phone,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ Batch notifications: ${successCount}/${phoneNumbers.length} sent successfully`);
      
      return {
        success: true,
        message: `${successCount}/${phoneNumbers.length} notifications sent`,
        results
      };

    } catch (error) {
      console.error('❌ Error sending batch notifications:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new WhatsAppNotificationService();