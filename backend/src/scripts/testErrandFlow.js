import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Errand } from '../models/Errand.js';
import { Transaction } from '../models/Transaction.js';
import { DigitalFootprint } from '../models/DigitalFootprint.js';

const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';

await mongoose.connect(MONGO_URI);
console.log('Connected to Atlas');

// Find a sender with balance
const sender = await User.findOne({ role: 'sender', balance: { $gt: 0 } });
if (!sender) { console.log('No sender with balance found'); process.exit(1); }

console.log('Using sender:', sender.email, 'balance:', sender.balance);

const fee = 500;
const title = 'Test - Buy food from cafeteria';
const posterId = sender._id;

try {
  // Simulate createErrand
  const user = await User.findById(posterId);
  console.log('\nUser found:', user.email, 'balance:', user.balance);
  
  if (user.balance < fee) {
    console.log('FAIL: Insufficient balance');
    process.exit(0);
  }

  const newErrand = await Errand.create({
    title,
    description: 'Test errand from script',
    category: 'Meals',
    pickupLocation: 'Campus',
    dropoffLocation: 'Hostel B',
    fee,
    posterId,
    status: 'open',
  });
  console.log('\nErrand created:', newErrand._id, newErrand.title);

  const previousBalance = user.balance;
  user.balance -= fee;
  await user.save();
  console.log('Balance deducted:', previousBalance, '->', user.balance);

  const tx = await Transaction.create({
    userId: posterId,
    amount: fee,
    type: 'debit',
    description: `Payment for errand: ${title}`,
    errandId: newErrand._id,
  });
  console.log('Transaction created:', tx._id);

  const fp = await DigitalFootprint.create({
    errandId: newErrand._id,
    senderId: posterId,
    timePosted: new Date(),
    deviceInfo: { posted: 'Test script' },
    ipAddress: { posted: '127.0.0.1' },
    locationData: { posted: 'Hostel B' },
    status: 'held',
    walletMovementLogs: [{
      timestamp: new Date(),
      userId: posterId,
      action: 'DEBIT_ESCROW',
      amount: fee,
      previousBalance,
      newBalance: user.balance,
    }],
    auditTrail: [{
      action: 'POSTED',
      timestamp: new Date(),
      userId: posterId,
      actorName: user.name,
      actorRole: 'sender',
      actionTitle: 'Errand Posted',
      actionDescription: `Errand posted. ₦${fee} moved to Escrow.`,
      ipAddress: '127.0.0.1',
      deviceInfo: 'Test script',
      details: `Errand posted. ₦${fee} moved to Escrow.`,
    }],
  });
  console.log('DigitalFootprint created:', fp._id);

  console.log('\n✅ Full createErrand flow SUCCEEDED');

  // cleanup
  await Errand.findByIdAndDelete(newErrand._id);
  await Transaction.findByIdAndDelete(tx._id);
  await DigitalFootprint.findByIdAndDelete(fp._id);
  user.balance = previousBalance;
  await user.save();
  console.log('Cleanup done - test data removed, balance restored');
} catch (err) {
  console.error('\n❌ ERROR:', err.message);
  console.error(err.stack);
}

await mongoose.disconnect();
