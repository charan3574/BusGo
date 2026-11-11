const mongoose = require('mongoose');

const PassengerSchema = new mongoose.Schema({
  seat: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other', 'male', 'female', 'other'] }
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  pnr: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  busId: {
    type: String,
    required: true,
    index: true
  },
  busName: {
    type: String,
    required: true
  },
  operator: {
    type: String,
    required: true
  },
  busType: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  departureTime: {
    type: String,
    required: true
  },
  arrivalTime: {
    type: String,
    required: true
  },
  duration: {
    type: String
  },
  boardingPoint: {
    type: String,
    required: true
  },
  droppingPoint: {
    type: String,
    required: true
  },
  seats: [{
    type: String,
    required: true
  }],
  passengers: [PassengerSchema],
  contact: {
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  fareDetails: {
    baseFare: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['CONFIRMED', 'CANCELLED'],
    default: 'CONFIRMED',
    index: true
  },
  bookingTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);
