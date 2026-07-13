import mongoose from 'mongoose';
const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';
await mongoose.connect(MONGO_URI);
console.log('Connected');

const db = mongoose.connection.db;
const logsCol = db.collection('logs');

const recentLogs = await logsCol.find({}).sort({ timestamp: -1 }).limit(20).toArray();
console.log('Recent Logs:', JSON.stringify(recentLogs, null, 2));

await mongoose.disconnect();
