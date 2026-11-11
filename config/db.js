const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bus_ticket_system';
    
    console.log(`Connecting to MongoDB at: ${mongoURI.replace(/:([^:@]{1,})@/, ':****@')}`);
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });

    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);

    // Auto-seed initial data if collections are empty
    await autoSeedInitialData();

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Make sure MongoDB service is running or check your MONGODB_URI in .env');
    throw error;
  }
};

const autoSeedInitialData = async () => {
  try {
    const busCount = await Bus.countDocuments();
    if (busCount === 0) {
      const busesPath = path.join(__dirname, '..', 'data', 'buses.json');
      if (fs.existsSync(busesPath)) {
        const rawBuses = JSON.parse(fs.readFileSync(busesPath, 'utf8') || '[]');
        if (rawBuses.length > 0) {
          console.log(`Initial DB setup: Seeding ${rawBuses.length} buses from data/buses.json...`);
          await Bus.insertMany(rawBuses);
          console.log('Buses seeded successfully.');
        }
      }
    }

    const bookingCount = await Booking.countDocuments();
    if (bookingCount === 0) {
      const bookingsPath = path.join(__dirname, '..', 'data', 'bookings.json');
      if (fs.existsSync(bookingsPath)) {
        const rawBookings = JSON.parse(fs.readFileSync(bookingsPath, 'utf8') || '[]');
        if (rawBookings.length > 0) {
          console.log(`Initial DB setup: Seeding ${rawBookings.length} bookings from data/bookings.json...`);
          await Booking.insertMany(rawBookings);
          console.log('Bookings seeded successfully.');
        }
      }
    }
  } catch (err) {
    console.warn('Auto-seed warning:', err.message);
  }
};

module.exports = connectDB;
