require('dotenv').config();
const mongoose = require('mongoose');
const net = require('net');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bus_ticket_system';

console.log('====================================================');
console.log('🔍 MongoDB Diagnostic & Connection Verification');
console.log('====================================================\n');

// Step 1: Check port 27017 socket
console.log('1. Checking TCP connection to MongoDB port 27017...');
const socket = new net.Socket();
socket.setTimeout(2500);

socket.on('connect', () => {
  console.log('   ✅ Port 27017 is OPEN and accepting connections on your laptop.');
  socket.destroy();
  testMongooseConnection();
});

socket.on('timeout', () => {
  console.error('   ❌ Connection timed out on port 27017.');
  console.error('   👉 MongoDB service is not responding or blocked by firewall.');
  socket.destroy();
  process.exit(1);
});

socket.on('error', (err) => {
  console.error('   ❌ Could not reach port 27017:', err.message);
  console.error('   👉 MongoDB service might be stopped. Start it via Services (services.msc) or run: net start MongoDB');
  socket.destroy();
  process.exit(1);
});

socket.connect(27017, '127.0.0.1');

// Step 2: Test Mongoose connection and inspect collections
async function testMongooseConnection() {
  console.log('\n2. Connecting via Mongoose to:');
  console.log(`   ${MONGODB_URI}`);

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000
    });

    console.log('   ✅ Successfully connected to MongoDB database:', conn.connection.name);
    console.log('   Host:', conn.connection.host);
    console.log('   Port:', conn.connection.port);

    const Bus = require('./models/Bus');
    const Booking = require('./models/Booking');

    const busCount = await Bus.countDocuments();
    const bookingCount = await Booking.countDocuments();

    console.log('\n3. Database Content:');
    console.log(`   🚌 Buses in 'buses' collection:       ${busCount}`);
    console.log(`   🎟️  Bookings in 'bookings' collection: ${bookingCount}`);

    if (busCount === 0) {
      console.log('\n   ⚠️ Buses collection is empty. Run: npm.cmd run seed');
    } else {
      console.log('\n   Sample bus from MongoDB:');
      const sample = await Bus.findOne({}, { name: 1, from: 1, to: 1, fare: 1 });
      console.log(`   • ${sample.name} (${sample.from} ➔ ${sample.to}) - $${sample.fare}`);
    }

    console.log('\n====================================================');
    console.log('🎉 MongoDB is 100% WORKING and connected to your project!');
    console.log('====================================================');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('   ❌ MongoDB Mongoose connection failed:', err.message);
    process.exit(1);
  }
}
