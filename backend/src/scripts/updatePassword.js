import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGO_URI = 'mongodb+srv://leadcityerrand:bethelisaboy@cluster0.kymzrlu.mongodb.net/leadcity?retryWrites=true&w=majority&appName=Cluster0';

await mongoose.connect(MONGO_URI);
console.log('Connected to Atlas');

const hashedPassword = await bcrypt.hash('password123', 10);

const result = await mongoose.connection.collection('users').updateOne(
  { email: 'betheltest2026_new@lcu.edu.ng' },
  { $set: { password: hashedPassword } }
);

console.log('Updated user password:', result.modifiedCount);

await mongoose.disconnect();
