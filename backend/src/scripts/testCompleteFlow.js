import mongoose from 'mongoose';
import { Errand } from '../models/Errand.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { DigitalFootprint } from '../models/DigitalFootprint.js';
import { Notification } from '../models/Notification.js';

const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';
await mongoose.connect(MONGO_URI);
console.log('Connected');

const errand = await Errand.findById('6a5422abd348701d3fd24ebc');
console.log('Errand:', errand?.title, 'status:', errand?.status, 'erranderId:', errand?.erranderId, 'fee:', errand?.fee);

if (!errand) { console.log('Errand not found'); process.exit(1); }

// Simulate completeErrand step by step
const errander = await User.findById(errand.erranderId);
console.log('Errander:', errander?.name, 'balance:', errander?.balance);

if (!errander) { console.log('No errander found'); process.exit(1); }

const previousBalance = errander.balance;
errander.balance += errand.fee;
await errander.save();
console.log('✅ Balance updated:', previousBalance, '->', errander.balance);

let tx;
try {
  tx = await Transaction.create({
    userId: errander._id,
    amount: errand.fee,
    type: 'errand_earning',
    description: `Payment for completed errand: ${errand.title}`,
    errandId: errand._id,
    senderId: errand.posterId,
    messengerId: errander._id,
    status: 'completed',
  });
  console.log('✅ Transaction created:', tx._id);
} catch (err) {
  errander.balance -= errand.fee;
  await errander.save();
  console.error('❌ Transaction failed:', err.message);
  process.exit(1);
}

errand.status = 'confirmed_completed';
errand.senderConfirmedAt = new Date();
errand.paymentReleased = true;
errand.paymentReleasedAt = new Date();
errand.paymentTransactionId = tx._id.toString();
try {
  await errand.save();
  console.log('✅ Errand saved as confirmed_completed');
} catch (err) {
  console.error('❌ Errand save failed:', err.message);
  process.exit(1);
}

// Try DigitalFootprint update
const set = {
  messengerId: errander._id,
  timeConfirmed: new Date(),
  'deviceInfo.confirmed': 'Test Device',
  'ipAddress.confirmed': '127.0.0.1',
  'locationData.confirmed': errand.dropoffLocation || 'Campus',
  transactionReference: `TX-${tx._id}`,
  status: 'released',
};

try {
  const fp = await DigitalFootprint.findOneAndUpdate(
    { errandId: errand._id },
    {
      $setOnInsert: {
        errandId: errand._id,
        senderId: errand.posterId,
        timePosted: errand.createdAt || new Date(),
      },
      $set: set,
      $push: {
        auditTrail: {
          action: 'CONFIRMED',
          timestamp: new Date(),
          actorName: 'Sender',
          actorRole: 'sender',
          actionTitle: 'Payment Released ✅',
          actionDescription: `Sender confirmed. ₦${errand.fee} released.`,
          details: `Confirmed.`,
        },
        walletMovementLogs: {
          timestamp: new Date(),
          userId: errander._id,
          action: 'CREDIT_WALLET',
          amount: errand.fee,
          previousBalance,
          newBalance: errander.balance,
        }
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  console.log('✅ DigitalFootprint updated:', fp._id);
} catch (err) {
  console.error('❌ DigitalFootprint failed:', err.message);
}

// Try Notification.insertMany
try {
  await Notification.insertMany([
    {
      userId: errand.posterId.toString(),
      title: 'Payment Released! ✅',
      message: 'Test notification',
      type: 'payment_released',
      relatedId: errand._id.toString(),
    }
  ]);
  console.log('✅ Notifications sent');
} catch (err) {
  console.error('❌ Notification failed:', err.message);
}

console.log('\n✅ Done - Full flow completed for real errand');
await mongoose.disconnect();
