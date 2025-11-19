// index.js - Arabic Version (Customer Messages Only)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());

// 🌐 Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Pineapple EG WhatsApp Bot', status: 'Running', timestamp: new Date().toISOString() });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working! 🎉', serverTime: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Log all requests
app.use((req, res, next) => {
  console.log('📨 Request:', req.method, req.url);
  next();
});

// 📁 Storage files
const STORAGE_FILE = './customer_phones.json';
const WEBHOOK_LOG_FILE = './webhook_logs.json';

// Initialize storage
let customerPhones = {};
let webhookLogs = {};

function loadStorageData() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      customerPhones = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      console.log(`📋 Loaded ${Object.keys(customerPhones).length} customer phones`);
    }
    if (fs.existsSync(WEBHOOK_LOG_FILE)) {
      webhookLogs = JSON.parse(fs.readFileSync(WEBHOOK_LOG_FILE, 'utf8'));
      console.log(`📊 Loaded ${Object.keys(webhookLogs).length} webhook logs`);
    }
  } catch {
    console.log('📋 Starting with fresh storage');
    customerPhones = {};
    webhookLogs = {};
  }
}

function saveStorageData() {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(customerPhones, null, 2));
  fs.writeFileSync(WEBHOOK_LOG_FILE, JSON.stringify(webhookLogs, null, 2));
}

loadStorageData();

// 🟢 WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'pineapple-bot',
    dataPath: './sessions'
  }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', qr => {
  console.log('📱 Scan this QR code:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ WhatsApp client is ready!'));
client.initialize();

// 🧾 Debug Middleware
app.use((req, res, next) => {
  console.log('📨 Incoming Request:', req.method, req.originalUrl);
  if (req.body && Object.keys(req.body).length > 0)
    console.log('📦 Parsed Body:', JSON.stringify(req.body, null, 2));
  next();
});

// 🎯 Webhook Handler
app.post('/webhooks/wuilt', async (req, res) => {
  try {
    const data = req.body.data;
    const event = data?.event;
    const payload = data?.payload;

    res.status(200).json({ status: 'OK', message: 'Received', timestamp: new Date().toISOString() });
    if (!event || !payload) return console.log('⚠️ Invalid webhook data');

    console.log(`🔔 Received event: ${event}`);

    switch (event) {
      case 'ORDER_PLACED':
        await handleOrderPlaced(payload.order);
        break;
      case 'SHIPMENT_UPDATED':
        await handleShipmentUpdate(payload);
        break;
      case 'ORDER_CANCELED':
        await handleOrderCancel(payload.order);
        break;
      default:
        console.log(`⚡ Unknown event: ${event}`);
    }
  } catch (error) {
    console.error('❌ Webhook Error:', error);
  }
});

// 🛍️ New Order
async function handleOrderPlaced(order) {
  try {
    if (!order?.customer || !order?.shippingAddress) return;
    const customerName = order.customer.name;
    const customerPhone = formatPhone(order.shippingAddress.phone);
    if (!customerPhone) return;

    const orderId = order._id;
    const orderNumber = order.orderSerial;
    const totalAmount = order.totalPrice.amount;

    storeCustomerPhone(orderId, customerPhone, customerName);

    const message = `مرحبًا ${customerName} 💛
تم استلام طلبك رقم #${orderNumber} من Pineapple EG بنجاح

إجمالي الطلب: ${totalAmount} EGP
شكرًا لاختيارك Pineapple EG`;

    await sendWhatsApp(customerPhone, message, customerName);
  } catch (error) {
    console.error('❌ Error in handleOrderPlaced:', error);
  }
}

// 🛍️ New Order
async function handleOrderPlaced(order) {
  try {
    if (!order?.customer || !order?.shippingAddress) return;
    const customerName = order.customer.name;
    const customerPhone = formatPhone(order.shippingAddress.phone);
    if (!customerPhone) return;

    const orderId = order._id;
    const orderNumber = order.orderSerial;
    const totalAmount = order.totalPrice.amount;

    storeCustomerPhone(orderId, customerPhone, customerName);

    const message = `مرحبًا ${customerName} 💛
تم استلام طلبك رقم #${orderNumber} من Pineapple EG بنجاح

إجمالي الطلب: ${totalAmount} EGP
شكرًا لاختيارك Pineapple EG`;

    await sendWhatsApp(customerPhone, message, customerName);
  } catch (error) {
    console.error('❌ Error in handleOrderPlaced:', error);
  }
}

// 🚚 Shipment Update
async function handleShipmentUpdate(payload) {
  try {
    const { events, order } = payload;
    if (!order || !events) return;

    const orderId = order.orderId;
    const customerPhone = getCustomerPhone(orderId);
    if (!customerPhone) return;

    const customerName = customerPhones[orderId]?.name || 'العميل';
    const orderNumber = order.orderSerial;
    const shippingCompany = order.companyName || order.shippingRateName || 'شركة الشحن';

for (const e of events) {
  if (e === 'OrderShipmentPickedUp') {
    const msg = `تم تسليم طلبك رقم #${orderNumber} لشركة الشحن:
شركة: ${shippingCompany} 🚚
رابط التتبع: https://bosta.co/tracking/${order.trackingNumber}
إمكانية فتح الشحنة: نعم ✅

شكرًا لثقتك في Pineapple EG`;
    await sendWhatsApp(customerPhone, msg, customerName);
  } else if (e === 'OrderShipmentDelivered') {
    const msg = `
 شكرا لثقتك فى 🍍 Pineapple
يارب يكون الاوردر عجب حضرتك 🙏
رايك يهمنا 💛

https://pineappleeg.com`;
    await sendWhatsApp(customerPhone, msg, customerName);
  }
}

  } catch (error) {
    console.error('❌ Error in handleShipmentUpdate:', error);
  }
}

// ❌ Order Cancel
async function handleOrderCancel(order) {
  try {
    const customerName = order.customer?.name || 'العميل';
    const customerPhone = formatPhone(order.shippingAddress?.phone);
    if (!customerPhone) return;

    const orderId = order._id;
    const orderNumber = order.orderSerial;
    const totalAmount = order.totalPrice.amount;

    const msg = `مرحبًا ${customerName} 💛

تم إلغاء طلبك رقم #${orderNumber} من Pineapple EG بناءً على طلبك.

مهتمين نعرف رأيك
هل واجهتك أي مشكلة أثناء الطلب؟ أو ممكن تقولنا سبب الإلغاء؟

رأيك يهمنا جدًا علشان نحسّن تجربتك في المرات الجاية 💛`;

    await sendWhatsApp(customerPhone, msg, customerName);

    delete customerPhones[orderId];
    saveStorageData();
  } catch (error) {
    console.error('❌ Error in handleOrderCancel:', error);
  }
}

// 💾 Storage helpers
function storeCustomerPhone(orderId, phone, name) {
  customerPhones[orderId] = { phone, name, storedAt: new Date().toISOString() };
  saveStorageData();
}

function getCustomerPhone(orderId) {
  return customerPhones[orderId]?.phone;
}

// 🔧 Utils
function formatPhone(rawPhone) {
  if (!rawPhone) return null;
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '2' + cleaned.substring(1);
  else if (cleaned.startsWith('1') && cleaned.length === 10) cleaned = '2' + cleaned;
  else if (!cleaned.startsWith('2') && cleaned.length === 10) cleaned = '2' + cleaned;
  return cleaned.length >= 11 ? cleaned : null;
}

async function sendWhatsApp(phone, message, recipientName) {
  try {
    console.log(`📤 Sending to ${recipientName} (${phone})`);
    const chatId = await client.getNumberId(phone);
    if (!chatId) return console.log(`⚠️ Not on WhatsApp: ${phone}`), false;
    await client.sendMessage(chatId._serialized, message);
    console.log(`✅ Sent to ${recipientName}`);
    return true;
  } catch (error) {
    console.error(`❌ Send failed to ${recipientName}:`, error.message);
    return false;
  }
}

// 🏥 Health Check (extended)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    whatsapp: client.info ? 'Connected' : 'Connecting',
    storage: {
      customerPhones: Object.keys(customerPhones).length,
      webhookLogs: Object.keys(webhookLogs).length
    }
  });
});

// Default 200
app.use((req, res) => res.status(200).json({ status: 'OK' }));

// 🚀 Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`
🕯 Pineapple EG WhatsApp BOT STARTED
📍 Port: ${PORT}
📞 Webhook: POST http://localhost:${PORT}/webhooks/wuilt
❤️ Health: GET http://localhost:${PORT}/health
💾 Storage: ${Object.keys(customerPhones).length} customers
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down Pineapple bot...');
  saveStorageData();
  await client.destroy();
  process.exit(0);
});
