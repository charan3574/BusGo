require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');

const seedDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bus_ticket_system';
  console.log(`Connecting to MongoDB at ${mongoURI}...`);

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB.');

    const busesPath = path.join(__dirname, '..', 'data', 'buses.json');
    const bookingsPath = path.join(__dirname, '..', 'data', 'bookings.json');

    const busesData = fs.existsSync(busesPath) ? JSON.parse(fs.readFileSync(busesPath, 'utf8') || '[]') : [];
    const bookingsData = fs.existsSync(bookingsPath) ? JSON.parse(fs.readFileSync(bookingsPath, 'utf8') || '[]') : [];

    console.log('Clearing existing Bus & Booking collections in MongoDB...');
    await Bus.deleteMany({});
    await Booking.deleteMany({});

    if (busesData.length > 0) {
      await Bus.insertMany(busesData);
      console.log(`Inserted ${busesData.length} buses.`);
    }

    if (bookingsData.length > 0) {
      await Booking.insertMany(bookingsData);
      console.log(`Inserted ${bookingsData.length} bookings.`);
    }

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
