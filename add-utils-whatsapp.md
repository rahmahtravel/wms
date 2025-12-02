### Tugas Anda :

1. Pelajari code app saya secara menyeluruh
2. Pastikan seluruh fitur fitur nya dapat berfungsi dengan baik dan pastikan tidak ada error
3. Coba tolong buatkan sebuah file yaitu whatsapp.js yang dimana file ini berfungsi untuk membantu proses pengambilan API dari watzap.id yang dimana berfungsi untuk mengirimkan pesan otomatis ke whatsapp, nah saya punya refrensi code nya, ini hanya refrensi dan tinggal di sesuaikan saja :
const axios = require("axios");
require("dotenv").config();

// WatZap API Configuration - Updated untuk team Keisha
const WATZAP_CONFIG = {
  name: "WatZap",
  url: "https://api.watzap.id/v1/send_message",
  apiKey: "5Q8ZI2EQSGFALPMJ",
  numberKey: "qsYFC4841uf7n02f", // Default number_key, can be overridden per service
};

// Development mode configuration
const DEV_CONFIG = {
  isEnabled: process.env.WHATSAPP_DEV_MODE === 'true' && process.env.NODE_ENV === 'development',
  devNumber: process.env.DEV_WHATSAPP_NUMBER || '085147148850',
  devGroupId: process.env.DEV_WHATSAPP_GROUP_ID || '120363422153602912@g.us'
};

// Helper function to handle development mode routing
function getDestinationForDev(originalDestination, isGroup = false) {
  if (!DEV_CONFIG.isEnabled) {
    return originalDestination;
  }
  
  console.log(`🔧 DEV MODE: Redirecting ${isGroup ? 'group' : 'individual'} message from ${originalDestination} to ${isGroup ? DEV_CONFIG.devGroupId : DEV_CONFIG.devNumber}`);
  
  return isGroup ? DEV_CONFIG.devGroupId : DEV_CONFIG.devNumber;
}

// Helper function to wrap message with original destination info in dev mode
function wrapMessageForDev(message, originalDestination, isGroup = false) {
  if (!DEV_CONFIG.isEnabled) {
    return message;
  }
  
  const destinationType = isGroup ? 'GROUP' : 'INDIVIDUAL';
  const devHeader = `🔧 [DEV MODE - ${destinationType}]\n` +
                   `📍 Original destination: ${originalDestination}\n` +
                   `⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n` +
                   `${'='.repeat(40)}\n\n`;
  
  return devHeader + message;
}

async function sendWhatsAppMessage(phoneNumber, message, apiKey, numberKey) {
  console.log("--- Start sendWhatsAppMessage ---");
  console.log("Input phoneNumber:", phoneNumber);
  console.log("Input message:", message);
  console.log("Input apiKey:", apiKey);
  console.log("Input numberKey:", numberKey);

  // Apply development mode routing and message wrapping
  const originalPhoneNumber = phoneNumber;
  phoneNumber = getDestinationForDev(phoneNumber, false);
  message = wrapMessageForDev(message, originalPhoneNumber, false);

  // Enhanced phone number formatting with better validation
  let formattedNumber = phoneNumber.toString().trim();
  console.log("📱 Original input:", formattedNumber);

  // First, handle +62 format specifically before removing non-numeric characters
  if (formattedNumber.startsWith("+62")) {
    formattedNumber = formattedNumber.substring(1); // Remove the "+" and keep "62"
  }

  // Remove any non-numeric characters
  formattedNumber = formattedNumber.replace(/\D/g, "");
  console.log("📱 After cleaning:", formattedNumber);

  // Handle different Indonesian phone number formats
  if (formattedNumber.startsWith("0")) {
    // Convert 08xx to 628xx
    formattedNumber = "62" + formattedNumber.substring(1);
  } else if (formattedNumber.startsWith("8") && !formattedNumber.startsWith("62")) {
    // Convert 8xx to 628xx (only if doesn't already start with 62)
    formattedNumber = "62" + formattedNumber;
  } else if (!formattedNumber.startsWith("62") && formattedNumber.length >= 10) {
    // Add 62 prefix if not present and looks like a phone number
    formattedNumber = "62" + formattedNumber;
  }

  console.log("📱 After format conversion:", formattedNumber);

  // Enhanced validation for Indonesian mobile number patterns
  const indonesianProviders = [
    "6281", // Telkomsel
    "6282", // Telkomsel 
    "6283", // Telkomsel
    "6285", // Indosat
    "6286", // Indosat
    "6287", // XL
    "6288", // XL
    "6289", // 3 (Tri)
    "62811", // Telkomsel Halo
    "62812", // Telkomsel Halo
    "62813", // Telkomsel Halo
    "62821", // Telkomsel Halo
    "62822", // Telkomsel Halo
    "62823", // Telkomsel Halo
    "62851", // Indosat
    "62852", // Indosat
    "62853", // Indosat
    "62855", // Indosat
    "62856", // Indosat
    "62857", // Indosat
    "62858", // Indosat
    "62859", // Indosat
    "62877", // XL
    "62878", // XL
    "62879", // XL
    "62896", // 3 (Tri)
    "62897", // 3 (Tri)
    "62898", // 3 (Tri)
    "62899", // 3 (Tri)
  ];

  // Find matching provider
  const matchingProvider = indonesianProviders.find(provider =>
    formattedNumber.startsWith(provider)
  );

  if (matchingProvider) {
    console.log(`✅ Valid Indonesian mobile provider detected: ${matchingProvider}`);
  } else {
    console.warn(`⚠️ Unknown or invalid Indonesian mobile provider: ${formattedNumber.substring(0, 5)}`);
  }

  // Validate and correct phone number length
  // Indonesian mobile numbers should be 12-14 digits total (62 + 10-12 digit number)
  if (formattedNumber.length < 12) {
    console.warn(`⚠️ Phone number too short: ${formattedNumber} (${formattedNumber.length} digits)`);
    // Don't auto-fix short numbers as it might add wrong digits
  } else if (formattedNumber.length > 14) {
    console.warn(
      `⚠️ Phone number too long: ${formattedNumber} (${formattedNumber.length} digits), truncating to 13...`
    );
    // Truncate to 13 digits (most common length for Indonesian mobile)
    formattedNumber = formattedNumber.substring(0, 13);
    console.log(`✅ Truncated to: ${formattedNumber}`);
  }

  // Final validation
  if (!formattedNumber.startsWith("62")) {
    console.error(`❌ Invalid format - must start with 62: ${formattedNumber}`);
    return {
      success: false,
      error: `Invalid phone number format. Must be Indonesian mobile number starting with 62. Got: ${formattedNumber}`,
      formattedNumber: formattedNumber,
      provider: "none",
    };
  }

  console.log("Formatted phone number:", formattedNumber);

  try {
    console.log("Attempting to send message via WatZap...");
    const watzapApiKey = apiKey || WATZAP_CONFIG.apiKey;
    const watzapNumberKey = numberKey || WATZAP_CONFIG.numberKey;
    console.log("Using API Key:", watzapApiKey);
    console.log("Using Number Key:", watzapNumberKey);

    const payload = {
      api_key: watzapApiKey,
      number_key: watzapNumberKey,
      phone_no: formattedNumber,
      message: message,
    };

    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Enhanced request with retry logic and better timeout
    let lastError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} - Sending to WatZap API...`);
        
        const response = await axios.post(WATZAP_CONFIG.url, payload, {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          timeout: 15000, // Increased timeout to 15 seconds
          validateStatus: function (status) {
            // Accept 2xx and 4xx responses (to handle API errors properly)
            return status >= 200 && status < 500;
          }
        });

        console.log(`📊 WatZap API Response (attempt ${attempt}):`, response.data);

        // Enhanced status checking - check multiple success patterns
        const isSuccess = 
          // Pattern 1: Standard success
          (response.data.status === "200" && response.data.ack === "successfully") ||
          // Pattern 2: Numeric status success
          (response.data.status === 200 && response.data.ack === "successfully") ||
          // Pattern 3: String "1" status (some APIs use this)
          (response.data.status === "1" && response.data.ack === "successfully") ||
          // Pattern 4: Numeric 1 status
          (response.data.status === 1 && response.data.ack === "successfully") ||
          // Pattern 5: Success without ack field
          (response.data.status === "200" || response.data.status === 200) ||
          // Pattern 6: Direct success indicator
          response.data.success === true ||
          // Pattern 7: Message sent indicator
          response.data.message_sent === true;

        if (isSuccess) {
          console.log(`✅ Message sent successfully on attempt ${attempt}.`);
          return {
            success: true,
            data: response.data,
            formattedNumber: formattedNumber,
            provider: WATZAP_CONFIG.name,
            attempt: attempt,
            retries: attempt - 1
          };
        } else {
          // Check if this is a non-recoverable error that should stop retries immediately
          const isNonRecoverableError = 
            response.data.status === "1005" || // WhatsApp connection issue - fatal error
            response.data.ack === "fatal_error" ||
            response.data.message?.includes("Invalid WhatsApp Number") ||
            response.data.message?.includes("rekoneksikan ulang") ||
            response.data.status === "1003"; // License error

          if (isNonRecoverableError) {
            console.log(`❌ Non-recoverable error detected on attempt ${attempt}, stopping retries:`, response.data);
            return {
              success: false,
              error: `WatZap API returned fatal error: ${response.data.message || JSON.stringify(response.data)}`,
              formattedNumber: formattedNumber,
              provider: WATZAP_CONFIG.name,
              attempt: attempt,
              recoverable: false,
              errorCode: response.data.status,
              errorType: 'fatal_connection_error'
            };
          } else if (attempt < maxRetries) {
            console.log(`⚠️ Recoverable error on attempt ${attempt}, will retry:`, response.data);
            lastError = response.data;
            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          } else {
            // Last attempt failed
            console.log(`❌ WatZap API failed on final attempt ${attempt}:`, response.data);
            return {
              success: false,
              error: `WatZap API returned error after ${attempt} attempts: ${JSON.stringify(response.data)}`,
              formattedNumber: formattedNumber,
              provider: WATZAP_CONFIG.name,
              attempt: attempt,
              recoverable: !isRecoverableError
            };
          }
        }
      } catch (requestError) {
        lastError = requestError;
        
        // Check if this is a network/timeout error (recoverable)
        const isNetworkError = 
          requestError.code === 'ECONNABORTED' ||
          requestError.code === 'ENOTFOUND' ||
          requestError.code === 'ECONNRESET' ||
          requestError.message.includes('timeout');

        console.error(`❌ Request error on attempt ${attempt}:`, requestError.message);
        
        if (requestError.response) {
          console.error(`📄 Error response data:`, requestError.response.data);
        }

        if (isNetworkError && attempt < maxRetries) {
          console.log(`🔄 Network error detected, retrying in a moment...`);
          const waitTime = Math.min(2000 * attempt, 10000); // Progressive wait
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry
        } else if (attempt === maxRetries) {
          // Last attempt, return error
          break;
        }
      }
    }

    // If we get here, all retries failed
    const errorMessage = lastError?.response?.data ? 
      `Failed after ${maxRetries} attempts. Last error: ${JSON.stringify(lastError.response.data)}` :
      `Failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
      
    return {
      success: false,
      error: errorMessage,
      formattedNumber: formattedNumber,
      provider: WATZAP_CONFIG.name,
      attempt: maxRetries,
      retries: maxRetries
    };
    
  } catch (error) {
    console.error("💥 Unexpected error in WhatsApp message sending:", error.message);
    if (error.response) {
      console.error("💥 Unexpected error response:", error.response.data);
    }
    
    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
      formattedNumber: formattedNumber,
      provider: "none",
      attempt: 1,
      retries: 0
    };
  } finally {
    console.log("--- End sendWhatsAppMessage ---");
  }
}

async function sendResiNotification(
  phoneNumber,
  nama_penerima,
  ekspedisi,
  no_resi
) {
  // Apply development mode routing and message wrapping
  const originalPhoneNumber = phoneNumber;
  phoneNumber = getDestinationForDev(phoneNumber, false);

  const message =
    `*Informasi Pengiriman Kelengkapan*\n\n` +
    `Yth. ${nama_penerima}\n\n` +
    `Kelengkapan Anda telah dikirim melalui:\n` +
    `Ekspedisi: ${ekspedisi}\n` +
    `No. Resi: ${no_resi}\n\n` +
    `Silakan cek status pengiriman melalui website/aplikasi ekspedisi terkait.\n\n` +
    `Terima kasih 🙏`;

  const wrappedMessage = wrapMessageForDev(message, originalPhoneNumber, false);

  return await sendWhatsAppMessage(phoneNumber, wrappedMessage);
}

async function sendAlumniReferralMessage(
  phoneNumber,
  nama_jamaah,
  baseUrl,
  apiKey,
  numberKey,
  batch = ""
) {
  // Apply development mode routing and message wrapping
  const originalPhoneNumber = phoneNumber;
  phoneNumber = getDestinationForDev(phoneNumber, false);

  const encodedNama = encodeURIComponent(nama_jamaah);
  const encodedBatch = encodeURIComponent(batch);
  const alumniFormUrl = `${baseUrl}/alumni/public-form?nama=${encodedNama}&batch=${encodedBatch}`;
  const googleMapsUrl = "https://g.co/kgs/K5MAbrn"; // Link Google Maps Rahmah Travel

  const message =
    `Terima kasih banyak telah meluangkan waktu untuk mengisi form feedback sebelumnya. 🙏\n\n` +
    `Sebagai langkah selanjutnya untuk bergabung dalam program referral Rahmah Travel, kami mohon kesediaan Bapak/Ibu/Kakak untuk mengisi formulir pendaftaran melalui tautan berikut:\n\n` +
    `📝 Formulir Pendaftaran Referral\n` +
    `${alumniFormUrl}\n\n` +
    `Sebagai salah satu syaratnya, mohon bantuannya juga untuk memberikan ulasan pengalaman umrah bersama kami melalui Google Maps pada tautan berikut:\n\n` +
    `⭐ Review Google Maps\n` +
    `${googleMapsUrl}\n\n` +
    `Dukungan dan masukan dari Bapak/Ibu/Kakak sangat berarti bagi kami dalam memberikan pelayanan terbaik ke depannya.\n\n` +
    `Jazakumullahu khairan atas partisipasi dan kepercayaannya.`;

  const wrappedMessage = wrapMessageForDev(message, originalPhoneNumber, false);

  return await sendWhatsAppMessage(phoneNumber, wrappedMessage, apiKey, numberKey);
}

// Queue for WhatsApp messages to prevent overwhelming the API
const whatsappQueue = [];
let isProcessingQueue = false;

// Function to process WhatsApp queue asynchronously
async function processWhatsAppQueue() {
  if (isProcessingQueue || whatsappQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  console.log(
    `📋 Processing ${whatsappQueue.length} WhatsApp messages in queue...`
  );

  while (whatsappQueue.length > 0) {
    const { groupId, message, apiKey, numberKey, resolve, reject } =
      whatsappQueue.shift();

    try {
      const result = await sendWhatsAppGroupMessage(
        groupId,
        message,
        apiKey,
        numberKey
      );
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Small delay between messages to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  isProcessingQueue = false;
  console.log("✅ WhatsApp queue processing completed");
}

// Function to send WhatsApp message asynchronously (non-blocking)
function sendWhatsAppGroupMessageAsync(groupId, message, apiKey, numberKey) {
  return new Promise((resolve, reject) => {
    whatsappQueue.push({
      groupId,
      message,
      apiKey,
      numberKey,
      resolve,
      reject,
    });
    processWhatsAppQueue();
  });
}
async function sendWhatsAppGroupMessage(
  groupId,
  message,
  apiKey,
  numberKey,
  maxRetries = 3
) {
  console.log("--- Start sendWhatsAppGroupMessage ---");
  console.log("Input groupId:", groupId);
  console.log("Input message:", message);
  console.log("Input apiKey:", apiKey);
  console.log("Input numberKey:", numberKey);
  console.log("Max retries:", maxRetries);

  // Apply development mode routing and message wrapping
  const originalGroupId = groupId;
  groupId = getDestinationForDev(groupId, true);
  message = wrapMessageForDev(message, originalGroupId, true);

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 Attempt ${attempt}/${maxRetries} - Attempting to send group message via WatZap...`
      );

      const watzapApiKey = apiKey || WATZAP_CONFIG.apiKey;
      const watzapNumberKey = numberKey || WATZAP_CONFIG.numberKey;
      console.log("Using API Key:", watzapApiKey);
      console.log("Using Number Key:", watzapNumberKey);

      // Use the same payload structure as other working services
      const payload = {
        api_key: watzapApiKey,
        number_key: watzapNumberKey,
        group_id: groupId, // Use group_id for group messages
        message: message,
      };

      console.log("Group Message Payload:", payload);

      // Use the specific group message endpoint
      const groupUrl = "https://api.watzap.id/v1/send_message_group";
      const response = await axios.post(groupUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000, // Increased timeout for group messages
      });

      console.log("WatZap Group API Response:", response.data);

      // Check for success - match the working service criteria
      if (
        response.data.status === "1" ||
        response.data.status === "200" ||
        response.data.status === 1 ||
        response.data.status === 200
      ) {
        console.log("✅ Group message sent successfully on attempt", attempt);
        return {
          success: true,
          data: response.data,
          groupId: groupId,
          provider: WATZAP_CONFIG.name,
          attempt: attempt,
        };
      } else {
        // Check if this is a recoverable error (connection issues)
        const isRecoverableError =
          response.data.status === "1005" ||
          response.data.ack === "fatal_error" ||
          response.data.message?.includes("koneksi");

        if (!isRecoverableError || attempt === maxRetries) {
          console.log(
            "❌ WatZap Group API returned non-recoverable error on attempt",
            attempt,
            ":",
            response.data
          );
          return {
            success: false,
            error: `WatZap Group API returned non-success status: ${JSON.stringify(
              response.data
            )}`,
            groupId: groupId,
            provider: WATZAP_CONFIG.name,
            attempt: attempt,
            recoverable: isRecoverableError,
          };
        } else {
          console.log(
            `⚠️ WatZap Group API returned recoverable error on attempt ${attempt}, will retry:`,
            response.data
          );
          lastError = response.data;
        }
      }
    } catch (error) {
      console.error(
        `❌ Error sending group message via WatZap on attempt ${attempt}:`,
        error.message
      );
      if (error.response) {
        console.error("WatZap Group API Error Response:", error.response.data);
      }

      lastError = error;

      // If this is the last attempt, return the error
      if (attempt === maxRetries) {
        return {
          success: false,
          error: `Failed to send group message via ${WATZAP_CONFIG.name} after ${maxRetries} attempts: ${error.message}`,
          groupId: groupId,
          provider: "none",
          attempt: attempt,
        };
      }
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  console.log("--- End sendWhatsAppGroupMessage ---");
  return {
    success: false,
    error: `Failed to send group message after ${maxRetries} attempts. Last error: ${
      lastError?.message || JSON.stringify(lastError)
    }`,
    groupId: groupId,
    provider: "none",
    attempt: maxRetries,
  };
}

// Function to send WhatsApp message with image to group using WatZap API
async function sendWhatsAppMessageWithImageToGroup(
  groupId,
  message,
  imageSource,
  apiKey,
  numberKey
) {
  console.log("--- Start sendWhatsAppMessageWithImageToGroup ---");
  console.log("Input groupId:", groupId);
  console.log("Input message:", message);
  console.log("Input imageSource:", imageSource);

  // Apply development mode routing and message wrapping
  const originalGroupId = groupId;
  groupId = getDestinationForDev(groupId, true);
  message = wrapMessageForDev(message, originalGroupId, true);

  try {
    console.log("Attempting to send group message with image via WatZap...");
    const watzapApiKey = apiKey || WATZAP_CONFIG.apiKey;
    const watzapNumberKey = numberKey || WATZAP_CONFIG.numberKey;
    console.log("Using API Key:", watzapApiKey);
    console.log("Using Number Key:", watzapNumberKey);

    if (imageSource) {
      console.log("ℹ️ Image source provided:", imageSource);
      
      // Only send_image_group endpoint is supported
      // Documentation: https://api-docs.watzap.id/#364590a5-69aa-434e-a940-8ee060da6e2d
      // Note: This endpoint ONLY supports image URL, NOT base64
      
      if (
        imageSource.startsWith("http://") ||
        imageSource.startsWith("https://")
      ) {
        console.log("🔄 Sending image to group using send_image_group endpoint...");

        try {
          const imagePayload = {
            api_key: watzapApiKey,
            number_key: watzapNumberKey,
            group_id: groupId,
            url: imageSource,
            message: message,
            separate_caption: "0", // 0 = caption below image, 1 = separate message
          };

          console.log("📤 Sending image payload:", imagePayload);

          const imageResponse = await axios.post(
            "https://api.watzap.id/v1/send_image_group",
            imagePayload,
            {
              headers: { "Content-Type": "application/json" },
              timeout: 30000,
            }
          );

          console.log(
            "📤 WatZap send_image_group API Response:",
            imageResponse.data
          );

          if (
            imageResponse.data &&
            (imageResponse.data.status === "200" ||
              imageResponse.data.status === "1") &&
            imageResponse.data.ack === "successfully"
          ) {
            console.log(
              "✅ Image sent successfully to group using send_image_group endpoint."
            );
            return {
              success: true,
              data: imageResponse.data,
              groupId: groupId,
              provider: WATZAP_CONFIG.name,
              method: "send_image_group",
            };
          } else {
            console.log(
              "⚠️ send_image_group returned non-success status:",
              imageResponse.data
            );
          }
        } catch (sendImageError) {
          console.error(
            "❌ send_image_group failed:",
            sendImageError.message
          );
          if (sendImageError.response) {
            console.error(
              "send_image_group API Error Response:",
              sendImageError.response.data
            );
          }
        }
      } else {
        console.log("⚠️ Image source is not a URL (base64/file path not supported by send_image_group)");
        console.log("⚠️ Falling back to text message...");
      }

      // Image sending failed or not a URL, fallback to text message
      console.log(
        "⚠️ Image sending failed, falling back to text message..."
      );
      return await sendWhatsAppGroupMessage(
        groupId,
        message,
        apiKey,
        numberKey
      );
    } else {
      // No image, send text message only
      console.log("📝 No image provided, sending text message only...");
      return await sendWhatsAppGroupMessage(
        groupId,
        message,
        apiKey,
        numberKey
      );
    }
  } catch (error) {
    console.error(
      "💥 Error in sendWhatsAppMessageWithImageToGroup:",
      error.message
    );
    if (error.response) {
      console.error("💥 Error Response:", error.response.data);
    }

    // Fallback to text message if everything fails
    console.log("🔄 Falling back to text message only...");
    return await sendWhatsAppGroupMessage(groupId, message, apiKey, numberKey);
  } finally {
    console.log("--- End sendWhatsAppMessageWithImageToGroup ---");
  }
}

// Function to send WhatsApp message to group (text only) - Simple version consistent with orders
async function sendWhatsAppMessageToGroupSimple(
  groupId,
  message,
  apiKey,
  numberKey
) {
  console.log("--- Start sendWhatsAppMessageToGroupSimple ---");
  console.log("Input groupId:", groupId);
  console.log("Input message:", message);

  // Apply development mode routing and message wrapping
  const originalGroupId = groupId;
  groupId = getDestinationForDev(groupId, true);
  message = wrapMessageForDev(message, originalGroupId, true);

  try {
    console.log(
      "Attempting to send text message to group via WatZap (simple method)..."
    );
    const watzapApiKey = apiKey || WATZAP_CONFIG.apiKey;
    const watzapNumberKey = numberKey || WATZAP_CONFIG.numberKey;
    console.log("Using API Key:", watzapApiKey);
    console.log("Using Number Key:", watzapNumberKey);

    // Use the same approach as in orders/index.js - treat group like a phone number
    const payload = {
      api_key: watzapApiKey,
      number_key: watzapNumberKey,
      phone_no: groupId, // Use phone_no for group ID (consistent with orders code)
      message: message,
    };

    console.log("Group Simple Payload:", payload);

    // Use the standard send_message endpoint (same as orders)
    const response = await axios.post(WATZAP_CONFIG.url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log("WatZap Group Simple API Response:", response.data);

    // Check for success status (same as individual messages)
    if (
      response.data &&
      (response.data.status === "200" || response.data.status === "1") &&
      response.data.ack === "successfully"
    ) {
      console.log("Message sent successfully to group (simple method).");
      return {
        success: true,
        data: response.data,
        groupId: groupId,
        provider: WATZAP_CONFIG.name,
        method: "simple",
      };
    } else {
      console.log(
        "WatZap Group Simple API returned non-success status:",
        response.data
      );
      return {
        success: false,
        error: `WatZap Group Simple API returned non-success status: ${JSON.stringify(
          response.data
        )}`,
        groupId: groupId,
        provider: WATZAP_CONFIG.name,
      };
    }
  } catch (error) {
    console.error("Error sending group message via WatZap:", error.message);
    if (error.response) {
      console.error("WatZap Group API Error Response:", error.response.data);
    }
    return {
      success: false,
      error: `Failed to send group message via ${WATZAP_CONFIG.name}: ${error.message}`,
      groupId: groupId,
      provider: "none",
    };
  } finally {
    console.log("--- End sendWhatsAppMessageToGroupSimple ---");
  }
}

const NABUNG_GROUP_ID = "120363402956725688@g.us";

/**
 * Mengirim notifikasi penarikan dana ke grup admin nabung.
 * @param {string} message - Pesan yang akan dikirim.
 */
async function sendNabungGroupNotification(message) {
  const originalGroupId = NABUNG_GROUP_ID;
  console.log(`--- Mengirim notifikasi ke grup nabung: ${originalGroupId} ---`);
  
  // Apply development mode routing
  const targetGroupId = getDestinationForDev(originalGroupId, true);
  const wrappedMessage = wrapMessageForDev(message, originalGroupId, true);
  
  // Menggunakan fungsi yang sudah ada untuk mengirim pesan grup
  return await sendWhatsAppGroupMessage(targetGroupId, wrappedMessage);
}

/**
 * Mengirim notifikasi penarikan dana ke nasabah.
 * @param {string} phone_no - Nomor telepon nasabah.
 * @param {string} message - Pesan yang akan dikirim.
 */
async function sendNabungUserNotification(phone_no, message) {
  const originalPhoneNo = phone_no;
  console.log(`--- Mengirim notifikasi ke nasabah: ${originalPhoneNo} ---`);
  
  // Apply development mode routing
  const targetPhoneNo = getDestinationForDev(originalPhoneNo, false);
  const wrappedMessage = wrapMessageForDev(message, originalPhoneNo, false);
  
  // Menggunakan fungsi yang sudah ada untuk mengirim pesan perorangan dengan config default
  return await sendWhatsAppMessage(targetPhoneNo, wrappedMessage, WATZAP_CONFIG.apiKey, WATZAP_CONFIG.numberKey);
}

// Helper to detect WhatsApp disconnection related errors from provider responses/messages
function isWhatsAppDisconnectedError(err) {
  try {
    if (!err) return false;
    
    const errorString = typeof err === 'string' ? err : JSON.stringify(err).toLowerCase();
    const lowerError = errorString.toLowerCase();
    
    // WatZap API specific disconnect indicators
    const disconnectIndicators = [
      'whatsapp instance not started',
      'instance not started', 
      'wa instance not active',
      'device not connected',
      'session expired',
      'qr code needed',
      'connection lost',
      'websocket closed',
      'not authenticated',
      'session not found',
      'device offline',
      'status: 1005', // WatZap specific code for instance not started
      'status":"1005"', // JSON format detection
      'ack: fatal_error',
      'ack":"fatal_error"', // JSON format detection
      'fatal_error',
      'connection timeout',
      'network error',
      'service unavailable'
    ];
    
    return disconnectIndicators.some(indicator => lowerError.includes(indicator));
  } catch (_) {
    return false;
  }
}

// Function to format phone number (extracted from sendWhatsAppMessage for reuse)
function formatPhoneNumber(phoneNumber) {
  let formattedNumber = phoneNumber.toString().trim();

  if (formattedNumber.startsWith("+62")) {
    formattedNumber = formattedNumber.substring(1);
  }

  formattedNumber = formattedNumber.replace(/\D/g, "");

  if (formattedNumber.startsWith("0")) {
    formattedNumber = "62" + formattedNumber.substring(1);
  } else if (formattedNumber.startsWith("8")) {
    formattedNumber = "62" + formattedNumber;
  } else if (!formattedNumber.startsWith("62")) {
    formattedNumber = "62" + formattedNumber;
  }

  if (formattedNumber.length > 13) {
    formattedNumber = formattedNumber.substring(0, 13);
  }

  return formattedNumber;
}

module.exports = {
  sendWhatsAppMessage,
  sendResiNotification,
  sendAlumniReferralMessage,
  sendWhatsAppMessageWithImageToGroup,
  sendWhatsAppGroupMessage,
  sendWhatsAppGroupMessageAsync,
  sendWhatsAppMessageToGroupSimple,
  sendNabungGroupNotification,
  sendNabungUserNotification,
  isWhatsAppDisconnectedError,
  formatPhoneNumber,
};


- nah ini, tinggal di sesuaikan saja data data nya, yang dimana file ini di simpan nanti di folder utils/, nanti dibuat lagi folder baru. Nah lalu untuk ini :
// WatZap API Configuration - Updated untuk team Keisha
const WATZAP_CONFIG = {
  name: "WatZap",
  url: "https://api.watzap.id/v1/send_message",
  apiKey: "5Q8ZI2EQSGFALPMJ",
  numberKey: "qsYFC4841uf7n02f", // Default number_key, can be overridden per service
};

pastikan dibuat sama seperti ini juga, coba tolong di analisis lagi, cari tahu lagi, pelajari lagi, perbaiki serta sesuaikan, pastikan sampai benar benar dapat berfungsi dengan baik dan pastikan outputnya benar benar bisa sesuai request


### NOTED :
Jangan sampai menghilangkan, menghapus, dan merusak fungsi fungsi code sebelumnya atau fungsi logic code yang sudah ada, cukup focus untuk memperbaiki dan menyesuaikan hal tersebut saja sampai benar benar bisa berfungsi dengan baik.