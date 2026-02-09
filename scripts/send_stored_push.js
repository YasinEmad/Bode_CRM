require('dotenv').config();
const webpush = require('web-push');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('VAPID keys not set');
  process.exit(1);
}

webpush.setVapidDetails('mailto:admin@localhost', VAPID_PUBLIC, VAPID_PRIVATE);

async function run() {
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  const col = mongoose.connection.collection('pushsubscriptions');
  const doc = await col.findOne({});
  if (!doc) {
    console.error('No subscription found in pushsubscriptions collection');
    process.exit(1);
  }
  const subscription = doc.subscription;
  console.log('Found subscription endpoint:', subscription.endpoint);

  try {
    const payload = { title: 'Server test', message: 'Test from scripts/send_stored_push.js' };
    const res = await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push sent, response:', res);
  } catch (err) {
    console.error('Push send failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
