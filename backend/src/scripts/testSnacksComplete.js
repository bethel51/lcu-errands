import mongoose from 'mongoose';
import { completeErrand } from '../controllers/errandController.js';
import { User } from '../models/User.js';

const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';
await mongoose.connect(MONGO_URI);
console.log('Connected');

// Snacks Errand ID
const errandId = '6a542abe3de2945cc940f696';
const senderId = '6a1a01eb093495513085900a';

const req = {
  params: { id: errandId },
  user: { id: senderId },
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

console.log('Simulating completion for "Snacks" errand...');
try {
  const next = (err) => {
    console.error('🔥 [Express next() called with error]:');
    console.error(err);
  };
  
  await completeErrand(req, res, next);
  console.log('Controller execution finished.');
  console.log('Status code:', statusResponse || 200);
  console.log('JSON response:', jsonResponse ? 'Success!' : 'No response');
} catch (err) {
  console.error('Unhandled try/catch error:', err);
}

// Wait 5 seconds before disconnecting to allow all async operations to finish
await new Promise(resolve => setTimeout(resolve, 5000));
await mongoose.disconnect();
console.log('Disconnected');
