// ========================================================
// MongoDB Playground for VS Code
// Connected to local MongoDB on your laptop:
// Database: bus_ticket_system (mongodb://127.0.0.1:27017)
// ========================================================

// 1. Select the bus_ticket_system database
use('bus_ticket_system');

// 2. View all buses currently stored in MongoDB
console.log('=== All Buses in MongoDB ===');
const buses = db.getCollection('buses').find({}, { name: 1, operator: 1, from: 1, to: 1, fare: 1, totalSeats: 1 }).toArray();
console.log(buses);

// 3. View all confirmed passenger bookings
console.log('=== Active Bookings in MongoDB ===');
const bookings = db.getCollection('bookings').find({}, { pnr: 1, busName: 1, seats: 1, date: 1, 'fareDetails.total': 1, status: 1 }).toArray();
console.log(bookings);

// 4. Quick revenue aggregation
const stats = db.getCollection('bookings').aggregate([
  { $match: { status: 'CONFIRMED' } },
  { $group: { _id: null, totalRevenue: { $sum: '$fareDetails.total' }, totalPassengers: { $sum: { $size: '$seats' } } } }
]).toArray();

console.log('=== Revenue Statistics ===', stats);
