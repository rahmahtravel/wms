# WhatsApp Integration Documentation

## Deskripsi
Sistem WhatsApp terintegrasi untuk notifikasi otomatis dalam aplikasi Purchasing & Logistik menggunakan API WatZap.id.

## Struktur File
```
utils/whatsapp/
├── whatsapp.js              # Core WhatsApp functionality
├── notificationService.js   # High-level notification service
├── stockMonitor.js          # Automatic stock monitoring
└── README.md               # Dokumentasi ini
```

## Konfigurasi

### Environment Variables (.env)
```env
# WhatsApp Configuration (WatZap.id)
WATZAP_API_KEY=5Q8ZI2EQSGFALPMJ
WATZAP_NUMBER_KEY=qsYFC4841uf7n02f

# WhatsApp Group IDs for notifications
ADMIN_WHATSAPP_GROUP_ID=120363402956725688@g.us
WAREHOUSE_WHATSAPP_GROUP_ID=120363402956725688@g.us

# Development Mode Configuration
WHATSAPP_DEV_MODE=false
DEV_WHATSAPP_NUMBER=085147148850
DEV_WHATSAPP_GROUP_ID=120363422153602912@g.us

# Enable/Disable Stock Monitoring
ENABLE_WHATSAPP_MONITORING=true
```

## Fitur Utama

### 1. Notifikasi Otomatis
- **Barang Keluar**: Notifikasi setelah barang keluar dari gudang
- **Barang Masuk**: Notifikasi setelah barang masuk ke gudang
- **Stock Rendah**: Alert otomatis jika stock di bawah minimum
- **Stock Opname**: Laporan hasil stock opname
- **Transfer Gudang**: Notifikasi transfer antar gudang
- **Kelengkapan Jamaah**: Update status kelengkapan

### 2. Monitoring Otomatis
- Pemeriksaan stock setiap 60 menit
- Alert grup untuk stock rendah
- Monitoring non-blocking (tidak mengganggu operasi utama)

### 3. Development Mode
- Redirect semua pesan ke nomor/grup development
- Header khusus untuk identifikasi pesan development
- Mudah debugging tanpa mengganggu pengguna aktual

## Cara Penggunaan

### 1. Import Service
```javascript
const whatsappService = require('../utils/whatsapp/notificationService');
```

### 2. Contoh Penggunaan di Route

#### Notifikasi Barang Keluar
```javascript
// routes/outgoing.js
const outgoingData = {
  nama_penerima: 'John Doe',
  nama_barang: 'Bantal Leher',
  jumlah: 10,
  satuan: 'pcs',
  tanggal: '2024-01-15',
  tujuan: 'Cabang Jakarta'
};

whatsappService.notifyOutgoing(outgoingData, '08123456789')
  .catch(error => console.error('WhatsApp notification failed:', error));
```

#### Notifikasi Stock Rendah
```javascript
const barangData = {
  nama_barang: 'Mukena Dewasa',
  stock_akhir: 5,
  stock_minimal: 10,
  satuan: 'pcs',
  supplier: { nama_supplier: 'PT Tekstil Nusantara' }
};

whatsappService.notifyLowStock(barangData, ['08111111111', '08222222222']);
```

#### Alert ke Grup Admin
```javascript
whatsappService.sendAdminAlert('🚨 Sistem backup berhasil dijalankan');
```

### 3. Manual Stock Check
```javascript
// Trigger manual check via API
GET /api/whatsapp/check-stock

// Response:
{
  "success": true,
  "message": "Stock check completed"
}
```

## API Endpoints

### Manual Stock Check
- **URL**: `GET /api/whatsapp/check-stock`
- **Auth**: Required
- **Description**: Trigger manual stock level check dan kirim notifikasi jika ada stock rendah

## Template Pesan

### 1. Barang Keluar
```
*Notifikasi Barang Keluar*

Kepada Yth. John Doe

Barang berikut telah dikeluarkan dari gudang:
📦 Bantal Leher
📊 Jumlah: 10 pcs
📅 Tanggal: 15/01/2024
📍 Tujuan: Cabang Jakarta

Terima kasih atas perhatiannya.

---
Sistem Purchasing & Logistik
Rahmah Travel
```

### 2. Stock Rendah (Grup)
```
🚨 *PERINGATAN STOCK RENDAH* 🚨

Ditemukan 3 barang dengan stock rendah:

📦 *Mukena Dewasa*
   Stock: 5 pcs (50%)
   Minimal: 10 pcs

📦 *Buku Doa*
   Stock: 2 pcs (20%)
   Minimal: 10 pcs

⚠️ Mohon segera lakukan pemesanan ulang!
```

### 3. Kelengkapan Jamaah
```
*Update Kelengkapan Jamaah*

Kepada Yth. Ahmad Sutarto

Kelengkapan umroh Anda:
📅 Paket: Umroh Reguler 12 Hari
🗓️ Keberangkatan: 15/02/2024
📋 Batch: FEB2024-A

Status Kelengkapan: *SUDAH_DIAMBIL*

✅ Kelengkapan telah diambil. Selamat menunaikan ibadah umroh!

---
Rahmah Travel
```

## Error Handling

### 1. Non-blocking Operations
Semua notifikasi WhatsApp berjalan secara asynchronous dan tidak akan mengganggu operasi utama jika gagal:

```javascript
// Good practice - non-blocking
whatsappService.notifyOutgoing(data, phone)
  .catch(error => console.error('WhatsApp failed:', error));

// Don't do this - blocking
try {
  await whatsappService.notifyOutgoing(data, phone);
} catch (error) {
  throw error; // This will break main operation
}
```

### 2. Retry Logic
WhatsApp service memiliki automatic retry dengan exponential backoff:
- Maximum 3 retries
- Delay: 1s, 2s, 4s
- Timeout: 15 detik per request

### 3. Error Types
- **Network Error**: Retry otomatis
- **Fatal Error**: Stop retry (contoh: invalid API key)
- **Rate Limit**: Exponential backoff

## Development Mode

### Aktivasi
```env
WHATSAPP_DEV_MODE=true
DEV_WHATSAPP_NUMBER=08123456789
DEV_WHATSAPP_GROUP_ID=120363422153602912@g.us
```

### Pesan Development
```
🔧 [DEV MODE - INDIVIDUAL]
📍 Original destination: 08111111111
⏰ 28/11/2024 14:30:00
========================================

*Notifikasi Barang Keluar*
...original message...
```

## Monitoring & Logs

### Log Format
```
📱 Original input: 08123456789
📱 After cleaning: 08123456789
📱 After format conversion: 628123456789
✅ Valid Indonesian mobile provider detected: 6281
🔄 Attempt 1/3 - Sending to WatZap API...
📊 WatZap API Response (attempt 1): {"status":"200","ack":"successfully"}
✅ Message sent successfully on attempt 1.
```

### Stock Monitor Logs
```
🔍 Starting automatic stock check...
⚠️ Found 2 items with low stock
✅ Low stock notifications sent for 2 items
```

## Troubleshooting

### 1. Pesan Tidak Terkirim
- Periksa API Key dan Number Key di `.env`
- Pastikan nomor telepon dalam format Indonesia (62xxx)
- Cek connection internet dan WatZap service status

### 2. Development Mode Tidak Bekerja
- Pastikan `WHATSAPP_DEV_MODE=true` dan `NODE_ENV=development`
- Periksa `DEV_WHATSAPP_NUMBER` dan `DEV_WHATSAPP_GROUP_ID`

### 3. Stock Monitor Tidak Jalan
- Pastikan `ENABLE_WHATSAPP_MONITORING=true`
- Cek logs server untuk error messages
- Restart server jika perlu

## Integration dengan Module Lain

### Jamaah Routes
```javascript
// routes/jamaah.js
const whatsappService = require('../utils/whatsapp/notificationService');

// Update kelengkapan status
router.post('/kelengkapan/:id/update-status', async (req, res) => {
  // ... update database ...
  
  // Send notification
  const jamaahData = {
    nama_jamaah: result.nama_jamaah,
    no_hp: result.no_hp,
    nama_paket: result.nama_paket,
    tanggal_keberangkatan: result.tanggal_keberangkatan,
    batch: result.batch,
    status_pengambilan: req.body.status
  };
  
  whatsappService.notifyKelengkapanUpdate(jamaahData)
    .catch(error => console.error('WhatsApp notification failed:', error));
});
```

### Stock Helper Integration
```javascript
// lib/stockHelper.js
const { stockMonitor } = require('../utils/whatsapp/stockMonitor');

async function recordOutgoingStock(connection, data) {
  // ... existing logic ...
  
  // Trigger stock check after operation
  setTimeout(() => {
    if (stockMonitor.shouldCheckStock()) {
      stockMonitor.checkLowStock();
    }
  }, 5000);
}
```

## Keamanan

### 1. Environment Variables
- Jangan commit file `.env` ke repository
- Gunakan environment variables yang berbeda untuk production
- Rotate API keys secara berkala

### 2. Rate Limiting
- WhatsApp service memiliki built-in delay antar pesan
- Batch operations menggunakan queue system
- Maximum retry untuk mencegah spam

### 3. Validation
- Validasi nomor telepon Indonesia
- Sanitasi input message
- Error handling yang proper

## Performance

### 1. Asynchronous Operations
- Semua WhatsApp operations non-blocking
- Queue system untuk batch messages
- Background stock monitoring

### 2. Database Optimization
- Efficient queries untuk stock checking
- Index pada kolom yang sering diquery
- Connection pooling

### 3. Memory Management
- Singleton pattern untuk services
- Proper cleanup pada intervals
- Error isolation

---

**Dibuat oleh**: GitHub Copilot  
**Terakhir Update**: November 2024  
**Versi**: 1.0.0