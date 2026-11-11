// SwiftBus Admin Portal Logic
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statRevenue = document.getElementById('statRevenue');
  const statBookings = document.getElementById('statBookings');
  const statBuses = document.getElementById('statBuses');
  const statPassengers = document.getElementById('statPassengers');
  const bookingsCountBadge = document.getElementById('bookingsCountBadge');
  const busesCountBadge = document.getElementById('busesCountBadge');
  const refreshStatsBtn = document.getElementById('refreshStatsBtn');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Bookings elements
  const bookingsTableBody = document.getElementById('bookingsTableBody');
  const bookingSearchInput = document.getElementById('bookingSearchInput');

  // Fleet elements
  const busesTableBody = document.getElementById('busesTableBody');
  const openAddBusModalBtn = document.getElementById('openAddBusModalBtn');
  const openAddBusModalBtn2 = document.getElementById('openAddBusModalBtn2');
  const addBusModal = document.getElementById('addBusModal');
  const closeAddBusModal = document.getElementById('closeAddBusModal');
  const cancelAddBusBtn = document.getElementById('cancelAddBusBtn');
  const addBusForm = document.getElementById('addBusForm');

  let allBookings = [];
  let allBuses = [];

  // Initialize
  checkDbStatus();
  loadDashboard();

  async function checkDbStatus() {
    const badge = document.getElementById('mongoDbStatusBadge');
    if (!badge) return;
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.database && data.database.connected) {
        if (data.database.storageMode === 'mongodb') {
          badge.className = 'db-status-badge';
          badge.innerHTML = `<span class="db-dot"></span> <span class="db-label">🍃 MongoDB: Connected (${data.database.totalBuses} buses, ${data.database.totalBookings} bookings)</span>`;
          badge.title = `Connected to MongoDB (${data.database.host}:27017/${data.database.name})`;
        } else {
          badge.className = 'db-status-badge json-mode';
          badge.innerHTML = `<span class="db-dot"></span> <span class="db-label">⚡ Local Storage: Active (${data.database.totalBuses} buses, ${data.database.totalBookings} bookings)</span>`;
          badge.title = 'Running on Persistent JSON Database (Zero-Config Mode)';
        }
      } else {
        badge.className = 'db-status-badge error';
        badge.innerHTML = `<span class="db-dot"></span> <span class="db-label">🔴 Database: Disconnected</span>`;
      }
    } catch (e) {
      badge.className = 'db-status-badge error';
      badge.innerHTML = `<span class="db-dot"></span> <span class="db-label">🔴 Server Offline</span>`;
    }
  }

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Refresh button
  refreshStatsBtn.addEventListener('click', () => {
    loadDashboard();
  });

  // Load complete dashboard data
  async function loadDashboard() {
    await Promise.all([
      loadStats(),
      loadBookings(),
      loadBuses()
    ]);
  }

  // 1. Load Stats
  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();

      statRevenue.textContent = `$${data.totalRevenue.toFixed(2)}`;
      statBookings.textContent = data.totalBookings;
      statBuses.textContent = data.totalBuses;
      statPassengers.textContent = data.totalPassengers;
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  }

  // 2. Load Bookings
  async function loadBookings() {
    try {
      const res = await fetch('/api/admin/bookings');
      allBookings = await res.json();
      bookingsCountBadge.textContent = allBookings.length;
      renderBookingsTable(allBookings);
    } catch (err) {
      bookingsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#ef4444;">Failed to load bookings.</td></tr>`;
    }
  }

  // Render Bookings Table
  function renderBookingsTable(bookings) {
    if (bookings.length === 0) {
      bookingsTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem;">No bookings found.</td></tr>`;
      return;
    }

    bookingsTableBody.innerHTML = bookings.map(b => {
      const isConfirmed = b.status === 'CONFIRMED';
      const statusClass = isConfirmed ? 'confirmed' : 'cancelled';
      const primaryPassenger = b.passengers && b.passengers[0] ? b.passengers[0].name : 'N/A';
      const totalPax = (b.passengers || []).length;
      const passengerSummary = totalPax > 1 ? `${primaryPassenger} (+${totalPax - 1})` : primaryPassenger;

      return `
        <tr>
          <td><strong style="font-family:'Space Mono';color:#2563eb;">${b.pnr}</strong></td>
          <td>
            <div><strong>${passengerSummary}</strong></div>
            <div style="font-size:0.75rem;color:#64748b;">${b.contact?.phone || ''}</div>
          </td>
          <td>
            <div><strong>${b.from} ➔ ${b.to}</strong></div>
            <div style="font-size:0.75rem;color:#64748b;">${b.busName}</div>
          </td>
          <td>${b.date} (${b.departureTime})</td>
          <td>
            ${(b.seats || []).map(s => `<span class="selected-seat-chip" style="font-size:0.75rem;padding:1px 4px;">${s}</span>`).join(' ')}
          </td>
          <td><strong>$${(b.fareDetails?.total || 0).toFixed(2)}</strong></td>
          <td>
            <span class="status-badge ${statusClass}">${b.status}</span>
          </td>
          <td>
            ${isConfirmed ? `
              <button class="btn-danger-sm" data-cancel-id="${b.id || b.pnr}">
                Cancel
              </button>
            ` : `<span style="font-size:0.75rem;color:#94a3b8;">Cancelled</span>`}
          </td>
        </tr>
      `;
    }).join('');

    // Attach cancel listeners
    bookingsTableBody.querySelectorAll('[data-cancel-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.cancelId;
        if (confirm(`Are you sure you want to cancel booking ${id}?`)) {
          cancelBooking(id);
        }
      });
    });
  }

  // Cancel Booking
  async function cancelBooking(id) {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to cancel booking.');
        return;
      }
      loadDashboard();
    } catch (err) {
      alert('Network error canceling booking.');
    }
  }

  // Live filter bookings
  bookingSearchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderBookingsTable(allBookings);
      return;
    }

    const filtered = allBookings.filter(b => {
      const pnrMatch = (b.pnr || '').toLowerCase().includes(term);
      const routeMatch = `${b.from} ${b.to} ${b.busName}`.toLowerCase().includes(term);
      const paxMatch = (b.passengers || []).some(p => (p.name || '').toLowerCase().includes(term));
      return pnrMatch || routeMatch || paxMatch;
    });

    renderBookingsTable(filtered);
  });

  // 3. Load Buses
  async function loadBuses() {
    try {
      const res = await fetch('/api/buses');
      const data = await res.json();
      allBuses = data.buses || [];
      busesCountBadge.textContent = allBuses.length;
      renderBusesTable(allBuses);
    } catch (err) {
      busesTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#ef4444;">Failed to load fleet.</td></tr>`;
    }
  }

  // Render Buses Table
  function renderBusesTable(buses) {
    if (buses.length === 0) {
      busesTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem;">No bus routes configured.</td></tr>`;
      return;
    }

    busesTableBody.innerHTML = buses.map(bus => `
      <tr>
        <td><code style="font-family:'Space Mono';">${bus.id}</code></td>
        <td>
          <div><strong>${bus.name}</strong></div>
          <div style="font-size:0.75rem;color:#64748b;">${bus.operator}</div>
        </td>
        <td><span class="bus-type-badge">${bus.busType}</span></td>
        <td><strong>${bus.from}</strong> ➔ <strong>${bus.to}</strong></td>
        <td>${bus.departureTime} - ${bus.arrivalTime} (${bus.duration})</td>
        <td><strong style="color:#059669;">$${bus.fare.toFixed(2)}</strong></td>
        <td>${bus.totalSeats} seats</td>
        <td>
          <button class="btn-danger-sm" data-delete-bus-id="${bus.id}">
            Delete
          </button>
        </td>
      </tr>
    `).join('');

    // Attach delete listeners
    busesTableBody.querySelectorAll('[data-delete-bus-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteBusId;
        if (confirm(`Are you sure you want to delete bus route ${id}?`)) {
          deleteBus(id);
        }
      });
    });
  }

  // Delete Bus
  async function deleteBus(id) {
    try {
      const res = await fetch(`/api/admin/buses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete bus route.');
        return;
      }
      loadDashboard();
    } catch (err) {
      alert('Network error deleting bus.');
    }
  }

  // Add Bus Modal handlers
  const openModal = () => { addBusModal.style.display = 'flex'; };
  const closeModal = () => { addBusModal.style.display = 'none'; };

  openAddBusModalBtn.addEventListener('click', openModal);
  if (openAddBusModalBtn2) openAddBusModalBtn2.addEventListener('click', openModal);
  closeAddBusModal.addEventListener('click', closeModal);
  cancelAddBusBtn.addEventListener('click', closeModal);

  // Submit Add Bus Form
  addBusForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('newBusName').value.trim(),
      operator: document.getElementById('newOperator').value.trim(),
      busType: document.getElementById('newBusType').value,
      fare: parseFloat(document.getElementById('newFare').value),
      from: document.getElementById('newFrom').value.trim(),
      to: document.getElementById('newTo').value.trim(),
      departureTime: document.getElementById('newDeparture').value,
      arrivalTime: document.getElementById('newArrival').value,
      duration: document.getElementById('newDuration').value.trim()
    };

    try {
      const res = await fetch('/api/admin/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to add bus route.');
        return;
      }

      addBusForm.reset();
      closeModal();
      loadDashboard();
    } catch (err) {
      alert('Network error creating bus route.');
    }
  });
});
