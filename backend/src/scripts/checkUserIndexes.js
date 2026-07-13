import mongoose from 'mongoose';
const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';
await mongoose.connect(MONGO_URI);
console.log('Connected');

const db = mongoose.connection.db;
const usersCol = db.collection('users');
const indexes = await usersCol.indexes();
console.log('Indexes on users:', JSON.stringify(indexes, null, 2));

// Count users with null or undefined matricNumber
const nullCount = await usersCol.countDocuments({ matricNumber: null });
const undefinedCount = await usersCol.countDocuments({ matricNumber: { $exists: false } });
console.log('Users with null matricNumber:', nullCount);
console.log('Users with missing matricNumber:', undefinedCount);

await mongoose.disconnect();
