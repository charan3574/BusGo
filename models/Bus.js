const mongoose = require('mongoose');

const BoardingPointSchema = new mongoose.Schema({
  location: { type: String, required: true },
  time: { type: String, required: true }
}, { _id: false });

const SeatLayoutItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  deck: { type: String, enum: ['lower', 'upper'], default: 'lower' },
  type: { type: String, enum: ['seater', 'sleeper'], default: 'seater' },
  col: { type: Number, required: true },
  row: { type: Number, required: true },
  priceOffset: { type: Number, default: 0 },
  isWindow: { type: Boolean, default: false }
}, { _id: false });

const BusSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  operator: {
    type: String,
    required: true,
    trim: true
  },
  busType: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Express AC'
  },
  from: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  to: {
    type: String,
    required: true,
    trim: true,
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
    type: String,
    required: true
  },
  fare: {
    type: Number,
    required: true,
    min: 0
  },
  rating: {
    type: Number,
    default: 4.8
  },
  totalRatings: {
    type: Number,
    default: 1
  },
  boardingPoints: [BoardingPointSchema],
  droppingPoints: [BoardingPointSchema],
  amenities: [{ type: String }],
  totalSeats: {
    type: Number,
    required: true
  },
  layout: {
    hasUpperDeck: { type: Boolean, default: false },
    lower: [SeatLayoutItemSchema],
    upper: [SeatLayoutItemSchema]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bus', BusSchema);
