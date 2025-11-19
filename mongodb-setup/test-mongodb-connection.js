// Quick MongoDB Connection Test
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartrent';

console.log('Testing MongoDB connection...');
console.log('Connection string:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected successfully!');
    console.log('Database:', mongoose.connection.db.databaseName);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\nMongoDB service is not running!');
      console.error('To start it:');
      console.error('  1. Open PowerShell as Administrator');
      console.error('  2. Run: Start-Service MongoDB');
    }
    process.exit(1);
  }
}

testConnection();

