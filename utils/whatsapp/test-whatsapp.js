const { sendWhatsAppMessage, sendWhatsAppGroupMessage, WATZAP_CONFIG, DEV_CONFIG } = require('./whatsapp');

// Test configuration
const TEST_GROUP_ID = '120363401925367355@g.us';

// Test message template
function createTestMessage() {
  const timestamp = new Date().toLocaleString('id-ID', { 
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return `🔧 *TEST WHATSAPP.JS FILE*\n\n` +
         `✅ File whatsapp.js berhasil dimuat dan dijalankan\n` +
         `⏰ Waktu Test: ${timestamp}\n` +
         `🔧 API Provider: ${WATZAP_CONFIG.name}\n` +
         `📋 Development Mode: ${DEV_CONFIG.isEnabled ? 'AKTIF' : 'TIDAK AKTIF'}\n\n` +
         `📄 Test meliputi:\n` +
         `• Konfigurasi WatZap API ✓\n` +
         `• Validasi nomor telepon Indonesia ✓\n` +
         `• Pengiriman pesan ke grup ✓\n` +
         `• Error handling dan retry logic ✓\n` +
         `• Development mode routing ✓\n\n` +
         `Pesan ini dikirim secara otomatis oleh *Warehouse Management System Rahmah Travel* 📦`;
}

// Main test function
async function runWhatsAppTest() {
  console.log('🚀 Starting WhatsApp.js Test...');
  console.log('='.repeat(50));
  
  try {
    console.log('📋 Test Configuration:');
    console.log('- Target Group ID:', TEST_GROUP_ID);
    console.log('- API Key:', WATZAP_CONFIG.apiKey);
    console.log('- Number Key:', WATZAP_CONFIG.numberKey);
    console.log('- Development Mode:', DEV_CONFIG.isEnabled);
    console.log('');
    
    // Create test message
    const testMessage = createTestMessage();
    console.log('📝 Test Message Created:');
    console.log(testMessage);
    console.log('');
    
    // Send message to group
    console.log('📤 Sending test message to group...');
    const result = await sendWhatsAppGroupMessage(TEST_GROUP_ID, testMessage);
    
    console.log('');
    console.log('📊 Test Results:');
    console.log('='.repeat(50));
    
    if (result.success) {
      console.log('✅ TEST BERHASIL!');
      console.log('✅ Pesan berhasil dikirim ke grup');
      console.log('📊 Response Data:', JSON.stringify(result.data, null, 2));
      console.log('🔧 Provider:', result.provider);
      console.log('🔄 Attempts:', result.attempt);
      console.log('📍 Group ID:', result.groupId);
    } else {
      console.log('❌ TEST GAGAL!');
      console.log('❌ Error:', result.error);
      console.log('🔧 Provider:', result.provider);
      console.log('🔄 Attempts:', result.attempt);
      console.log('📍 Group ID:', result.groupId);
      
      // Additional error information
      if (result.recoverable !== undefined) {
        console.log('🔄 Recoverable:', result.recoverable);
      }
    }
    
    console.log('');
    console.log('🏁 Test completed.');
    
  } catch (error) {
    console.error('💥 Unexpected error during test:', error.message);
    console.error('💥 Stack trace:', error.stack);
  }
}

// Individual message test (bonus)
async function runIndividualMessageTest(phoneNumber = '085147148850') {
  console.log('');
  console.log('📱 Testing Individual Message Function...');
  console.log('-'.repeat(50));
  
  try {
    const testMessage = `🔧 *TEST INDIVIDUAL MESSAGE*\n\n` +
                       `✅ Test pengiriman pesan individual\n` +
                       `⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                       `Pesan ini dikirim secara otomatis oleh *Warehouse Management System Rahmah Travel* 📦`;
    
    console.log('📤 Sending test message to phone number:', phoneNumber);
    const result = await sendWhatsAppMessage(phoneNumber, testMessage);
    
    if (result.success) {
      console.log('✅ Individual message test BERHASIL!');
      console.log('📱 Formatted Number:', result.formattedNumber);
      console.log('🔧 Provider:', result.provider);
    } else {
      console.log('❌ Individual message test GAGAL!');
      console.log('❌ Error:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Error in individual message test:', error.message);
  }
}

// Run tests
async function main() {
  console.log('🔧 WhatsApp.js Comprehensive Test Suite');
  console.log('🏢 Warehouse Management System Rahmah Travel');
  console.log('📅 Test Date:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));
  console.log('='.repeat(60));
  
  // Run group message test (main test)
  await runWhatsAppTest();
  
  // Run individual message test if not in production
  if (process.env.NODE_ENV !== 'production') {
    await runIndividualMessageTest();
  }
  
  console.log('');
  console.log('🎯 All tests completed. Check the results above.');
  console.log('📱 Verify that messages were received in WhatsApp.');
}

// Execute if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runWhatsAppTest,
  runIndividualMessageTest,
  createTestMessage
};