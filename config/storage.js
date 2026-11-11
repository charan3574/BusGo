const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let storageMode = 'json'; // 'mongodb' or 'json'
let BusModel = null;
let BookingModel = null;

const busesFilePath = path.join(__dirname, '..', 'data', 'buses.json');
const bookingsFilePath = path.join(__dirname, '..', 'data', 'bookings.json');

// In-memory cache for JSON file mode
let inMemoryBuses = [];
let inMemoryBookings = [];

function loadJsonData() {
  try {
    if (fs.existsSync(busesFilePath)) {
      const data = fs.readFileSync(busesFilePath, 'utf8');
      inMemoryBuses = JSON.parse(data || '[]');
    } else {
      inMemoryBuses = [];
    }
  } catch (err) {
    console.error('Error reading buses.json:', err.message);
    inMemoryBuses = [];
  }

  try {
    if (fs.existsSync(bookingsFilePath)) {
      const data = fs.readFileSync(bookingsFilePath, 'utf8');
      inMemoryBookings = JSON.parse(data || '[]');
    } else {
      inMemoryBookings = [];
    }
  } catch (err) {
    console.error('Error reading bookings.json:', err.message);
    inMemoryBookings = [];
  }
}

function persistBookings() {
  try {
    fs.writeFileSync(bookingsFilePath, JSON.stringify(inMemoryBookings, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write bookings.json:', err.message);
  }
}

function persistBuses() {
  try {
    fs.writeFileSync(busesFilePath, JSON.stringify(inMemoryBuses, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write buses.json:', err.message);
  }
}

// Generate PNR
function generatePNR() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pnr = 'BUS-';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

const storage = {
  async init() {
    loadJsonData();
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bus_ticket_system';
    
    try {
      console.log(`Checking MongoDB connection at: ${mongoURI.replace(/:([^:@]{1,})@/, ':****@')}...`);
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 2000
      });
      storageMode = 'mongodb';
      BusModel = require('../models/Bus');
      BookingModel = require('../models/Booking');

      console.log(`🍃 Connected to MongoDB: ${conn.connection.host} / ${conn.connection.name}`);

      // Auto-seed MongoDB if empty
      const count = await BusModel.countDocuments();
      if (count === 0 && inMemoryBuses.length > 0) {
        console.log(`Seeding ${inMemoryBuses.length} initial buses into MongoDB...`);
        await BusModel.insertMany(inMemoryBuses);
      }
      const bCount = await BookingModel.countDocuments();
      if (bCount === 0 && inMemoryBookings.length > 0) {
        console.log(`Seeding ${inMemoryBookings.length} initial bookings into MongoDB...`);
        await BookingModel.insertMany(inMemoryBookings);
      }

      return { mode: 'mongodb', host: conn.connection.host, name: conn.connection.name };
    } catch (err) {
      storageMode = 'json';
      console.log(`⚡ MongoDB not detected (${err.message}).`);
      console.log(`📁 Running in Zero-Config Local Storage mode (using data/buses.json & data/bookings.json).`);
      return { mode: 'json' };
    }
  },

  getMode() {
    return storageMode;
  },

  async getHealth() {
    const isMongo = storageMode === 'mongodb' && mongoose.connection.readyState === 1;
    const totalBuses = isMongo ? await BusModel.countDocuments() : inMemoryBuses.length;
    const totalBookings = isMongo ? await BookingModel.countDocuments() : inMemoryBookings.length;

    return {
      status: 'healthy',
      database: {
        type: isMongo ? 'MongoDB' : 'Local Persistent Storage (JSON)',
        storageMode: isMongo ? 'mongodb' : 'json',
        connected: true,
        name: isMongo ? (mongoose.connection.name || 'bus_ticket_system') : 'bus_ticket_system (local)',
        host: isMongo ? (mongoose.connection.host || '127.0.0.1') : 'localhost',
        totalBuses,
        totalBookings
      },
      uptime: process.uptime()
    };
  },

  async getCities() {
    if (storageMode === 'mongodb') {
      const fromCities = await BusModel.distinct('from');
      const toCities = await BusModel.distinct('to');
      const allCities = [...new Set([...fromCities, ...toCities])].sort();
      return { fromCities, toCities, allCities };
    } else {
      const fromSet = new Set();
      const toSet = new Set();
      inMemoryBuses.forEach(b => {
        if (b.from) fromSet.add(b.from);
        if (b.to) toSet.add(b.to);
      });
      const fromCities = Array.from(fromSet).sort();
      const toCities = Array.from(toSet).sort();
      const allCities = Array.from(new Set([...fromCities, ...toCities])).sort();
      return { fromCities, toCities, allCities };
    }
  },

  async searchBuses({ from, to, date, busType, sortBy }) {
    let buses = [];
    let activeBookings = [];

    if (storageMode === 'mongodb') {
      const filter = {};
      if (from) filter.from = new RegExp(`^${from.trim()}$`, 'i');
      if (to) filter.to = new RegExp(`^${to.trim()}$`, 'i');
      if (busType && busType !== 'all') filter.busType = new RegExp(busType.trim(), 'i');

      buses = await BusModel.find(filter).lean();
      if (date) {
        activeBookings = await BookingModel.find({ date, status: 'CONFIRMED' }).lean();
      }
    } else {
      buses = inMemoryBuses.filter(bus => {
        if (from && bus.from.toLowerCase() !== from.trim().toLowerCase()) return false;
        if (to && bus.to.toLowerCase() !== to.trim().toLowerCase()) return false;
        if (busType && busType !== 'all' && !bus.busType.toLowerCase().includes(busType.trim().toLowerCase())) return false;
        return true;
      });

      if (date) {
        activeBookings = inMemoryBookings.filter(b => b.date === date && b.status === 'CONFIRMED');
      }
    }

    const enriched = buses.map(bus => {
      let bookedSeatsCount = 0;
      if (date) {
        const busBookings = activeBookings.filter(b => b.busId === bus.id);
        const bookedSet = new Set();
        busBookings.forEach(b => (b.seats || []).forEach(s => bookedSet.add(s)));
        bookedSeatsCount = bookedSet.size;
      }
      const availableSeats = Math.max(0, bus.totalSeats - bookedSeatsCount);

      return {
        ...bus,
        availableSeats,
        bookedSeatsCount
      };
    });

    if (sortBy === 'fare_asc') {
      enriched.sort((a, b) => a.fare - b.fare);
    } else if (sortBy === 'fare_desc') {
      enriched.sort((a, b) => b.fare - a.fare);
    } else if (sortBy === 'departure_asc') {
      enriched.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    } else if (sortBy === 'rating_desc') {
      enriched.sort((a, b) => b.rating - a.rating);
    }

    return enriched;
  },

  async getBusById(id, date) {
    let bus = null;
    let relevantBookings = [];

    if (storageMode === 'mongodb') {
      bus = await BusModel.findOne({ id }).lean();
      if (!bus) return null;

      if (date) {
        relevantBookings = await BookingModel.find({ busId: id, date, status: 'CONFIRMED' }).lean();
      }
    } else {
      bus = inMemoryBuses.find(b => b.id === id);
      if (!bus) return null;

      if (date) {
        relevantBookings = inMemoryBookings.filter(b => b.busId === id && b.date === date && b.status === 'CONFIRMED');
      }
    }

    const bookedSeats = [];
    const femaleReservedSeats = [];

    relevantBookings.forEach(booking => {
      (booking.seats || []).forEach(seatId => bookedSeats.push(seatId));
      (booking.passengers || []).forEach(p => {
        if (p.gender && p.gender.toLowerCase() === 'female' && p.seat) {
          femaleReservedSeats.push(p.seat);
        }
      });
    });

    return {
      ...bus,
      date: date || null,
      bookedSeats,
      femaleReservedSeats
    };
  },

  async createBooking(bookingPayload) {
    const { busId, date, seats, passengers, boardingPoint, droppingPoint, contact } = bookingPayload;
    
    let bus = null;
    let existingBookings = [];

    if (storageMode === 'mongodb') {
      bus = await BusModel.findOne({ id: busId }).lean();
      if (!bus) throw new Error('Bus route not found');

      existingBookings = await BookingModel.find({ busId, date, status: 'CONFIRMED' }).lean();
    } else {
      bus = inMemoryBuses.find(b => b.id === busId);
      if (!bus) throw new Error('Bus route not found');

      existingBookings = inMemoryBookings.filter(b => b.busId === busId && b.date === date && b.status === 'CONFIRMED');
    }

    // Check collision
    const existingBookedSeats = new Set();
    existingBookings.forEach(b => (b.seats || []).forEach(s => existingBookedSeats.add(s)));

    const alreadyBooked = seats.filter(s => existingBookedSeats.has(s));
    if (alreadyBooked.length > 0) {
      const err = new Error(`Seats [${alreadyBooked.join(', ')}] have just been booked by another passenger.`);
      err.code = 'COLLISION';
      throw err;
    }

    // Calculate fares
    let baseFare = 0;
    const lowerLayout = (bus.layout && bus.layout.lower) || [];
    const upperLayout = (bus.layout && bus.layout.upper) || [];
    const allLayoutSeats = [...lowerLayout, ...upperLayout];

    seats.forEach(seatId => {
      const seatObj = allLayoutSeats.find(s => s.id === seatId);
      const offset = seatObj ? (seatObj.priceOffset || 0) : 0;
      baseFare += (bus.fare + offset);
    });

    const tax = Math.round((baseFare * 0.05) * 100) / 100;
    const total = Math.round((baseFare + tax) * 100) / 100;

    const newBookingData = {
      id: `book-${Date.now()}`,
      pnr: generatePNR(),
      busId: bus.id,
      busName: bus.name,
      operator: bus.operator,
      busType: bus.busType,
      from: bus.from,
      to: bus.to,
      date,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      duration: bus.duration,
      boardingPoint: boardingPoint || (bus.boardingPoints && bus.boardingPoints[0] ? `${bus.boardingPoints[0].location} (${bus.boardingPoints[0].time})` : 'Main Terminal'),
      droppingPoint: droppingPoint || (bus.droppingPoints && bus.droppingPoints[0] ? `${bus.droppingPoints[0].location} (${bus.droppingPoints[0].time})` : 'Destination Terminal'),
      seats,
      passengers,
      contact: contact || {},
      fareDetails: {
        baseFare,
        tax,
        total
      },
      status: 'CONFIRMED',
      bookingTime: new Date().toISOString()
    };

    if (storageMode === 'mongodb') {
      const doc = new BookingModel(newBookingData);
      await doc.save();
      return doc.toObject();
    } else {
      inMemoryBookings.unshift(newBookingData);
      persistBookings();
      return newBookingData;
    }
  },

  async getBookingByPnr(pnr) {
    if (!pnr) return null;
    const trimmed = pnr.trim().toUpperCase();

    if (storageMode === 'mongodb') {
      return await BookingModel.findOne({ pnr: new RegExp(`^${trimmed}$`, 'i') }).lean();
    } else {
      return inMemoryBookings.find(b => b.pnr && b.pnr.toUpperCase() === trimmed) || null;
    }
  },

  async getAllBookings() {
    if (storageMode === 'mongodb') {
      return await BookingModel.find().sort({ createdAt: -1, bookingTime: -1 }).lean();
    } else {
      return [...inMemoryBookings].sort((a, b) => new Date(b.bookingTime || 0) - new Date(a.bookingTime || 0));
    }
  },

  async cancelBooking(idOrPnr) {
    if (storageMode === 'mongodb') {
      return await BookingModel.findOneAndUpdate(
        { $or: [{ id: idOrPnr }, { pnr: idOrPnr }] },
        { status: 'CANCELLED' },
        { returnDocument: 'after' }
      );
    } else {
      const booking = inMemoryBookings.find(b => b.id === idOrPnr || (b.pnr && b.pnr.toUpperCase() === idOrPnr.toUpperCase()));
      if (!booking) return null;
      booking.status = 'CANCELLED';
      persistBookings();
      return booking;
    }
  },

  async getAdminStats() {
    let totalBuses = 0;
    let confirmed = [];

    if (storageMode === 'mongodb') {
      totalBuses = await BusModel.countDocuments();
      confirmed = await BookingModel.find({ status: 'CONFIRMED' }).lean();
    } else {
      totalBuses = inMemoryBuses.length;
      confirmed = inMemoryBookings.filter(b => b.status === 'CONFIRMED');
    }

    const totalRevenue = confirmed.reduce((sum, b) => sum + (b.fareDetails?.total || 0), 0);
    const totalPassengers = confirmed.reduce((sum, b) => sum + (b.passengers?.length || 0), 0);

    return {
      totalBuses,
      totalBookings: confirmed.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPassengers
    };
  },

  async createBus(busData) {
    const busId = `bus-${Date.now().toString().slice(-4)}`;
    const isSleeper = (busData.busType || '').toLowerCase().includes('sleeper');
    let lower = [];
    let upper = [];
    let totalSeats = 0;

    if (isSleeper) {
      for (let r = 1; r <= 4; r++) {
        lower.push({ id: `L${r * 3 - 2}`, deck: 'lower', type: 'sleeper', col: 1, row: r, priceOffset: 0, isWindow: true });
        lower.push({ id: `L${r * 3 - 1}`, deck: 'lower', type: 'sleeper', col: 3, row: r, priceOffset: 0, isWindow: false });
        lower.push({ id: `L${r * 3}`,     deck: 'lower', type: 'sleeper', col: 4, row: r, priceOffset: 0, isWindow: true });

        upper.push({ id: `U${r * 3 - 2}`, deck: 'upper', type: 'sleeper', col: 1, row: r, priceOffset: 5, isWindow: true });
        upper.push({ id: `U${r * 3 - 1}`, deck: 'upper', type: 'sleeper', col: 3, row: r, priceOffset: 5, isWindow: false });
        upper.push({ id: `U${r * 3}`,     deck: 'upper', type: 'sleeper', col: 4, row: r, priceOffset: 5, isWindow: true });
      }
      totalSeats = 24;
    } else {
      for (let r = 1; r <= 6; r++) {
        lower.push({ id: `S${r * 4 - 3}`, deck: 'lower', type: 'seater', col: 1, row: r, priceOffset: 0, isWindow: true });
        lower.push({ id: `S${r * 4 - 2}`, deck: 'lower', type: 'seater', col: 2, row: r, priceOffset: 0, isWindow: false });
        lower.push({ id: `S${r * 4 - 1}`, deck: 'lower', type: 'seater', col: 4, row: r, priceOffset: 0, isWindow: false });
        lower.push({ id: `S${r * 4}`,     deck: 'lower', type: 'seater', col: 5, row: r, priceOffset: 0, isWindow: true });
      }
      totalSeats = 24;
    }

    const fullBus = {
      id: busId,
      name: busData.name,
      operator: busData.operator,
      busType: busData.busType || (isSleeper ? 'AC Sleeper (2+1)' : 'AC Seater (2+2)'),
      category: busData.category || 'Express AC',
      from: busData.from,
      to: busData.to,
      departureTime: busData.departureTime || '10:00',
      arrivalTime: busData.arrivalTime || '15:00',
      duration: busData.duration || '5h 00m',
      fare: parseFloat(busData.fare),
      rating: 4.8,
      totalRatings: 1,
      boardingPoints: [{ location: `${busData.from} Central Station`, time: busData.departureTime || '10:00' }],
      droppingPoints: [{ location: `${busData.to} Central Terminal`, time: busData.arrivalTime || '15:00' }],
      amenities: ['WiFi', 'Charging Port', 'Reading Light', 'Water Bottle'],
      totalSeats,
      layout: {
        hasUpperDeck: isSleeper,
        lower,
        upper
      }
    };

    if (storageMode === 'mongodb') {
      const doc = new BusModel(fullBus);
      await doc.save();
      return doc.toObject();
    } else {
      inMemoryBuses.unshift(fullBus);
      persistBuses();
      return fullBus;
    }
  },

  async deleteBus(id) {
    if (storageMode === 'mongodb') {
      const deleted = await BusModel.findOneAndDelete({ id });
      return !!deleted;
    } else {
      const idx = inMemoryBuses.findIndex(b => b.id === id);
      if (idx === -1) return false;
      inMemoryBuses.splice(idx, 1);
      persistBuses();
      return true;
    }
  }
};

module.exports = storage;
