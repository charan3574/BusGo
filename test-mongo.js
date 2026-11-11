const http = require('http');
const { spawn } = require('child_process');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting MongoDB Integration Tests ---');
  
  // 1. Health check
  const health = await makeRequest('/api/health');
  console.log('1. Health Check:', health.status === 200 && health.data.database.connected ? 'PASS' : 'FAIL', health.data);

  // 2. Cities
  const cities = await makeRequest('/api/cities');
  console.log('2. Unique Cities:', cities.status === 200 && cities.data.allCities.length > 0 ? 'PASS' : 'FAIL', cities.data.allCities);

  // 3. Search Buses
  const buses = await makeRequest('/api/buses?from=New+York&to=Boston&date=2026-10-27');
  console.log('3. Search Buses:', buses.status === 200 && buses.data.buses.length > 0 ? 'PASS' : 'FAIL', `Found ${buses.data.count} buses`);

  // 4. Single Bus Details
  const busDetail = await makeRequest('/api/buses/bus-101?date=2026-10-27');
  console.log('4. Bus Details & Booked Seats:', busDetail.status === 200 && busDetail.data.bookedSeats ? 'PASS' : 'FAIL', `Booked seats: ${busDetail.data.bookedSeats.join(', ')}`);

  // 5. Create Booking in MongoDB
  const newBookingPayload = {
    busId: 'bus-101',
    date: '2026-10-27',
    seats: ['L10'],
    passengers: [{ seat: 'L10', name: 'John Doe', age: 28, gender: 'Male' }],
    boardingPoint: 'Port Authority',
    droppingPoint: 'South Station',
    contact: { email: 'john@example.com', phone: '1234567890' }
  };
  const bookingRes = await makeRequest('/api/bookings', 'POST', newBookingPayload);
  const createdPnr = bookingRes.data?.booking?.pnr;
  console.log('5. Create Booking in MongoDB:', bookingRes.status === 201 ? 'PASS' : 'FAIL', `PNR: ${createdPnr}`);

  // 6. Lookup Booking by PNR
  if (createdPnr) {
    const pnrRes = await makeRequest(`/api/bookings/pnr/${createdPnr}`);
    console.log('6. PNR Lookup:', pnrRes.status === 200 && pnrRes.data.pnr === createdPnr ? 'PASS' : 'FAIL');
  }

  // 7. Admin Stats
  const stats = await makeRequest('/api/admin/stats');
  console.log('7. Admin Stats:', stats.status === 200 && stats.data.totalBuses > 0 ? 'PASS' : 'FAIL', stats.data);

  // 8. Admin Bookings List
  const allBookings = await makeRequest('/api/admin/bookings');
  console.log('8. Admin Bookings:', allBookings.status === 200 && allBookings.data.length > 0 ? 'PASS' : 'FAIL', `Total: ${allBookings.data.length}`);

  // 9. Admin Cancel Booking
  if (createdPnr) {
    const cancelRes = await makeRequest(`/api/admin/bookings/${createdPnr}`, 'DELETE');
    console.log('9. Cancel Booking:', cancelRes.status === 200 && cancelRes.data.booking.status === 'CANCELLED' ? 'PASS' : 'FAIL');
  }

  // 10. Admin Add Bus
  const newBusPayload = {
    name: 'MongoDB Express Test Bus',
    operator: 'Test Line',
    busType: 'AC Seater (2+2)',
    category: 'Express',
    from: 'Philadelphia',
    to: 'Washington DC',
    departureTime: '08:00',
    arrivalTime: '11:30',
    duration: '3h 30m',
    fare: 35
  };
  const addBusRes = await makeRequest('/api/admin/buses', 'POST', newBusPayload);
  const addedBusId = addBusRes.data?.bus?.id;
  console.log('10. Admin Add Bus:', addBusRes.status === 201 ? 'PASS' : 'FAIL', `Bus ID: ${addedBusId}`);

  // 11. Admin Delete Bus
  if (addedBusId) {
    const delBusRes = await makeRequest(`/api/admin/buses/${addedBusId}`, 'DELETE');
    console.log('11. Admin Delete Bus:', delBusRes.status === 200 ? 'PASS' : 'FAIL');
  }

  console.log('--- All MongoDB Tests Completed Successfully! ---');
}

// Start server child process and test
const serverProcess = spawn('node', ['server.js'], { cwd: __dirname, stdio: ['inherit', 'pipe', 'pipe'] });

serverProcess.stdout.on('data', data => {
  const msg = data.toString();
  process.stdout.write(msg);
  if (msg.includes('Bus Ticket System is running')) {
    setTimeout(async () => {
      try {
        await runTests();
      } catch (err) {
        console.error('Test failed:', err);
      } finally {
        serverProcess.kill();
        process.exit(0);
      }
    }, 1000);
  }
});

serverProcess.stderr.on('data', data => {
  process.stderr.write(data.toString());
});
