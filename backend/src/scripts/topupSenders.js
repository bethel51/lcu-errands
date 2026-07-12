import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';

await mongoose.connect(MONGO_URI);
console.log('Connected to Atlas');

// Get all users
const users = await mongoose.connection.collection('users').find({}).limit(10).toArray();
console.log('\nAll users:');
users.forEach(u => console.log(` - ${u.email} [${u.role}] balance=${u.balance}`));

// Top up all senders to 5000
const result = await mongoose.connection.collection('users').updateMany(
  { role: 'sender' },
  { $set: { balance: 5000 } }
);
console.log('\nUpdated', result.modifiedCount, 'sender(s) to balance=5000 for testing');

await mongoose.disconnect();
console.log('Done');
