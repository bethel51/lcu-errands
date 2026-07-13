import mongoose from 'mongoose';
const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';
await mongoose.connect(MONGO_URI);
console.log('Connected to Atlas');

const db = mongoose.connection.db;
const collections = await db.listCollections().toArray();
console.log('Collections:', collections.map(c => c.name));

const footprintCollection = db.collection('digitalfootprints');
const indexes = await footprintCollection.indexes();
console.log('Indexes on digitalfootprints:', JSON.stringify(indexes, null, 2));

await mongoose.disconnect();
