require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const storage = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Health & Database status endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = await storage.getHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: 'Health check failed', details: err.message });
  }
});

// 2. Get unique cities for autocomplete
app.get('/api/cities', async (req, res) => {
  try {
    const cities = await storage.getCities();
    res.json(cities);
  } catch (err) {
    console.error('Error fetching cities:', err);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// 3. Search buses with route, date, and seat availability
app.get('/api/buses', async (req, res) => {
  try {
    const { from, to, date, busType, sortBy } = req.query;
    const buses = await storage.searchBuses({ from, to, date, busType, sortBy });
    res.json({ count: buses.length, buses });
  } catch (err) {
    console.error('Error searching buses:', err);
    res.status(500).json({ error: 'Failed to search buses' });
  }
});

// 4. Get single bus details with seat map and booked status for a date
app.get('/api/buses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const bus = await storage.getBusById(id, date);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json(bus);
  } catch (err) {
    console.error('Error fetching bus details:', err);
    res.status(500).json({ error: 'Failed to fetch bus details' });
  }
});

// 5. Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      busId,
      date,
      seats,
      passengers,
      boardingPoint,
      droppingPoint,
      contact
    } = req.body;

    if (!busId || !date || !seats || !seats.length || !passengers || !passengers.length) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    const booking = await storage.createBooking({
      busId,
      date,
      seats,
      passengers,
      boardingPoint,
      droppingPoint,
      contact
    });

    res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking
    });
  } catch (err) {
    if (err.code === 'COLLISION') {
      return res.status(409).json({ error: err.message });
    }
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message || 'Failed to create booking' });
  }
});

// 6. Lookup booking by PNR
app.get('/api/bookings/pnr/:pnr', async (req, res) => {
  try {
    const { pnr } = req.params;
    const booking = await storage.getBookingByPnr(pnr);

    if (!booking) {
      return res.status(404).json({ error: `No booking found for PNR "${pnr}"` });
    }

    res.json(booking);
  } catch (err) {
    console.error('Error finding booking by PNR:', err);
    res.status(500).json({ error: 'Database error searching for PNR' });
  }
});

// 7. Admin: Statistics overview
app.get('/api/admin/stats', async (req, res) => {
  try {
    const stats = await storage.getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// 8. Admin: Get all bookings
app.get('/api/admin/bookings', async (req, res) => {
  try {
    const bookings = await storage.getAllBookings();
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching all bookings:', err);
    res.status(500).json({ error: 'Failed to retrieve bookings' });
  }
});

// 9. Admin: Cancel booking
app.delete('/api/admin/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await storage.cancelBooking(id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// 10. Admin: Add new bus route
app.post('/api/admin/buses', async (req, res) => {
  try {
    const {
      name,
      operator,
      busType,
      from,
      to,
      departureTime,
      arrivalTime,
      duration,
      fare,
      category
    } = req.body;

    if (!name || !operator || !from || !to || !fare) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const bus = await storage.createBus({
      name,
      operator,
      busType,
      from,
      to,
      departureTime,
      arrivalTime,
      duration,
      fare,
      category
    });

    res.status(201).json({
      message: 'New bus route added successfully',
      bus
    });
  } catch (err) {
    console.error('Error adding new bus:', err);
    res.status(500).json({ error: 'Failed to save new bus route' });
  }
});

// 11. Admin: Delete a bus
app.delete('/api/admin/buses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await storage.deleteBus(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({ message: 'Bus deleted successfully' });
  } catch (err) {
    console.error('Error deleting bus:', err);
    res.status(500).json({ error: 'Failed to delete bus' });
  }
});

// Fallback to customer portal
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function startServer() {
  try {
    const dbInfo = await storage.init();
    
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      if (dbInfo.mode === 'mongodb') {
        console.log(`🍃 Connected to MongoDB: ${dbInfo.name}`);
      } else {
        console.log(`⚡ Storage Engine: Persistent Local JSON Store`);
      }
      console.log(`🚌 Bus Ticket System is running at http://localhost:${PORT}`);
      console.log(`📊 Admin Panel accessible at http://localhost:${PORT}/admin.html`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
