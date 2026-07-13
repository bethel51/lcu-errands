import mongoose from 'mongoose';
const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';
await mongoose.connect(MONGO_URI);
console.log('Connected');

const db = mongoose.connection.db;
const errandsCol = db.collection('errands');

const recentErrands = await errandsCol.find({}).sort({ updatedAt: -1 }).limit(10).toArray();
recentErrands.forEach(e => {
  console.log(`ID: ${e._id} | Title: "${e.title}" | Status: ${e.status} | Poster: ${e.posterId} | Errander: ${e.erranderId} | Fee: ${e.fee} | Updated: ${e.updatedAt}`);
});

await mongoose.disconnect();
