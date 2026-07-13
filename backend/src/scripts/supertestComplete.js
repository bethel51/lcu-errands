import mongoose from 'mongoose';
import { completeErrand } from '../controllers/errandController.js';
import { Errand } from '../models/Errand.js';
import { User } from '../models/User.js';

const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';
await mongoose.connect(MONGO_URI);
console.log('Connected');

const sender = await User.findOne({ role: 'sender' });
const messenger = await User.findOne({ role: 'messenger' });

if (!sender || !messenger) {
  console.log('Test users not found');
  process.exit(1);
}

const e = await Errand.create({
  title: 'Direct Complete Call',
  description: 'Testing via direct controller function call',
  fee: 50,
  category: 'Meals',
  pickupLocation: 'Campus',
  dropoffLocation: 'Hostel',
  posterId: sender._id,
  erranderId: messenger._id,
  status: 'pending_sender_confirmation',
});

// Mock Express req and res
const req = {
  params: { id: e._id.toString() },
  user: { id: sender._id.toString() },
  body: {},
  headers: { 'user-agent': 'Node.js Test Agent' },
  io: {
    to: (room) => ({
      emit: (event, data) => console.log(`[Socket] Emit to ${room}: ${event}`)
    })
  }
};

let jsonResponse = null;
let statusResponse = null;

const res = {
  status: (code) => {
    statusResponse = code;
    return res;
  },
  json: (data) => {
    jsonResponse = data;
    return res;
  }
};

console.log('Invoking completeErrand controller...');
try {
  await completeErrand(req, res);
  console.log('Controller invocation finished.');
  console.log('Status code:', statusResponse || 200);
  console.log('JSON response:', jsonResponse);
} catch (err) {
  console.error('Controller threw an unhandled error:');
  console.error(err);
}

// Clean up
await Errand.findByIdAndDelete(e._id);
if (jsonResponse && jsonResponse.paymentTransactionId) {
  await mongoose.model('Transaction').findByIdAndDelete(jsonResponse.paymentTransactionId);
  await mongoose.model('DigitalFootprint').deleteOne({ errandId: e._id });
  // restore balance
  messenger.balance -= 50;
  await messenger.save();
}

await mongoose.disconnect();
