// SwiftBus Customer Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const searchForm = document.getElementById('busSearchForm');
  const fromCityInput = document.getElementById('fromCity');
  const toCityInput = document.getElementById('toCity');
  const fromCitiesList = document.getElementById('fromCitiesList');
  const toCitiesList = document.getElementById('toCitiesList');
  const travelDateInput = document.getElementById('travelDate');
  const busTypeFilter = document.getElementById('busTypeFilter');
  const sortBySelect = document.getElementById('sortBySelect');
  const swapCitiesBtn = document.getElementById('swapCitiesBtn');

  const busesList = document.getElementById('busesList');
  const resultsHeader = document.getElementById('resultsHeader');
  const searchSummaryTitle = document.getElementById('searchSummaryTitle');
  const searchSummarySub = document.getElementById('searchSummarySub');
  const loadingState = document.getElementById('loadingState');
  const noBusesState = document.getElementById('noBusesState');

  // Booking Modal Elements
  const bookingModal = document.getElementById('bookingModal');
  const closeBookingModal = document.getElementById('closeBookingModal');
  const cancelBookingBtn = document.getElementById('cancelBookingBtn');
  const passengerDetailsForm = document.getElementById('passengerDetailsForm');
  const modalBusSub = document.getElementById('modalBusSub');
  const modalSeatsBadge = document.getElementById('modalSeatsBadge');
  const boardingPointSelect = document.getElementById('boardingPointSelect');
  const droppingPointSelect = document.getElementById('droppingPointSelect');
  const passengersFormList = document.getElementById('passengersFormList');
  const modalFareSummary = document.getElementById('modalFareSummary');

  // Ticket Modal Elements
  const ticketModal = document.getElementById('ticketModal');
  const closeTicketModal = document.getElementById('closeTicketModal');
  const ticketCloseBtn = document.getElementById('ticketCloseBtn');
  const printTicketBtn = document.getElementById('printTicketBtn');
  const printableTicketArea = document.getElementById('printableTicketArea');

  // PNR Modal Elements
  const openPnrBtn = document.getElementById('openPnrBtn');
  const pnrLookupModal = document.getElementById('pnrLookupModal');
  const closePnrModal = document.getElementById('closePnrModal');
  const cancelPnrBtn = document.getElementById('cancelPnrBtn');
  const pnrLookupForm = document.getElementById('pnrLookupForm');
  const pnrInput = document.getElementById('pnrInput');
  const pnrErrorMsg = document.getElementById('pnrErrorMsg');

  // Application State
  let currentBuses = [];
  let activeBusForBooking = null;
  let activeSelectedSeats = []; // ['L1', 'L2']

  // Set default travel date (Tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  travelDateInput.value = tomorrowStr;
  travelDateInput.min = todayStr;

  // Initialize
  checkDbStatus();
  initCities();
  initPopularChips();
  performSearch(); // Load initial buses

  async function checkDbStatus() {
    const badge = document.getElementById('mongoDbStatusBadge');
    if (!badge) return;
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.database && data.database.connected) {
        if (data.database.storageMode === 'mongodb') {
          badge.className = 'db-status-badge';
          badge.innerHTML = `<span class="db-dot"></span> <span class="db-label">🍃 MongoDB: Connected (${data.database.totalBuses} buses)</span>`;
          badge.title = `Connected to MongoDB (${data.database.host}:27017/${data.database.name})`;
        } else {
          badge.className = 'db-status-badge json-mode';
          badge.innerHTML = `<span class="db-dot"></span> <span class="db-label">⚡ Local Storage: Active (${data.database.totalBuses} buses)</span>`;
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

  // Fetch cities for autocomplete
  async function initCities() {
    try {
      const res = await fetch('/api/cities');
      const data = await res.json();
      
      const populateList = (listEl, items) => {
        listEl.innerHTML = '';
        items.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          listEl.appendChild(opt);
        });
      };

      populateList(fromCitiesList, data.allCities);
      populateList(toCitiesList, data.allCities);
    } catch (err) {
      console.warn('Could not load cities list:', err);
    }
  }

  // Popular routes chips
  function initPopularChips() {
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        fromCityInput.value = chip.dataset.from;
        toCityInput.value = chip.dataset.to;
        performSearch();
      });
    });
  }

  // Swap cities
  swapCitiesBtn.addEventListener('click', () => {
    const temp = fromCityInput.value;
    fromCityInput.value = toCityInput.value;
    toCityInput.value = temp;
  });

  // Search form submit
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch();
  });

  sortBySelect.addEventListener('change', () => {
    performSearch();
  });

  // Perform search
  async function performSearch() {
    const from = fromCityInput.value.trim();
    const to = toCityInput.value.trim();
    const date = travelDateInput.value;
    const busType = busTypeFilter.value;
    const sortBy = sortBySelect.value;

    busesList.innerHTML = '';
    loadingState.style.display = 'block';
    noBusesState.style.display = 'none';
    resultsHeader.style.display = 'none';

    try {
      const queryParams = new URLSearchParams({
        from,
        to,
        date,
        busType,
        sortBy
      });

      const res = await fetch(`/api/buses?${queryParams.toString()}`);
      const data = await res.json();
      currentBuses = data.buses || [];

      loadingState.style.display = 'none';

      if (currentBuses.length === 0) {
        noBusesState.style.display = 'block';
        return;
      }

      // Update header
      resultsHeader.style.display = 'flex';
      if (from && to) {
        searchSummaryTitle.textContent = `${from} ➔ ${to}`;
        searchSummarySub.textContent = `${currentBuses.length} buses found for ${formatDate(date)}`;
      } else {
        searchSummaryTitle.textContent = `All Available Bus Routes`;
        searchSummarySub.textContent = `${currentBuses.length} buses scheduled for ${formatDate(date)}`;
      }

      renderBusCards(currentBuses, date);
    } catch (err) {
      console.error('Search failed:', err);
      loadingState.style.display = 'none';
      noBusesState.style.display = 'block';
    }
  }

  // Render bus cards
  function renderBusCards(buses, travelDate) {
    busesList.innerHTML = '';

    buses.forEach(bus => {
      const card = document.createElement('div');
      card.className = 'bus-card';
      card.id = `card-${bus.id}`;

      const seatsLeftClass = bus.availableSeats <= 5 ? 'few' : 'available';

      card.innerHTML = `
        <div class="bus-card-main">
          <div class="bus-operator-info">
            <h3 class="bus-name">${bus.name}</h3>
            <span class="bus-type-badge">🚍 ${bus.busType}</span>
            <div class="bus-ratings">
              <span class="rating-badge">★ ${bus.rating}</span>
              <span class="ratings-count">(${bus.totalRatings} ratings)</span>
            </div>
          </div>

          <div class="bus-schedule-info">
            <div class="time-box">
              <div class="time-primary">${bus.departureTime}</div>
              <div class="city-sub">${bus.from}</div>
            </div>

            <div class="duration-line">
              <span class="duration-text">${bus.duration}</span>
              <div class="line-track"></div>
            </div>

            <div class="time-box">
              <div class="time-primary">${bus.arrivalTime}</div>
              <div class="city-sub">${bus.to}</div>
            </div>
          </div>

          <div class="bus-price-section">
            <div class="price-sub">Starting from</div>
            <div class="price-tag">$${bus.fare.toFixed(2)}</div>
            <span class="seats-left-pill ${seatsLeftClass}">
              ${bus.availableSeats} Seats Available
            </span>
          </div>

          <div class="bus-action-section">
            <button class="btn-toggle-seats" data-bus-id="${bus.id}">
              Select Seats ▼
            </button>
          </div>
        </div>

        <div class="bus-card-footer">
          <div class="amenities-list">
            ${(bus.amenities || []).map(a => `<span class="amenity-chip">✓ ${a}</span>`).join('')}
          </div>
          <div>Operated by: <strong>${bus.operator}</strong></div>
        </div>

        <!-- Seat layout expandable panel -->
        <div class="seat-selection-panel" id="panel-${bus.id}">
          <div class="seat-layout-wrapper">
            <div class="bus-coach-container" id="coach-${bus.id}">
              <div class="spinner"></div>
              <p style="text-align:center;">Loading seat layout...</p>
            </div>

            <div class="seat-checkout-card" id="checkout-${bus.id}">
              <div>
                <h4 class="checkout-title">Selected Seats</h4>
                <div class="selected-seats-list" id="selectedChips-${bus.id}">
                  <span style="color:#94a3b8;font-size:0.85rem;">No seats selected yet. Click on the seats to select.</span>
                </div>

                <div class="checkout-breakdown">
                  <div class="breakdown-row">
                    <span>Base Fare (<span id="seatCount-${bus.id}">0</span> seats)</span>
                    <span id="baseFareText-${bus.id}">$0.00</span>
                  </div>
                  <div class="breakdown-row">
                    <span>GST / Taxes (5%)</span>
                    <span id="taxFareText-${bus.id}">$0.00</span>
                  </div>
                  <div class="breakdown-row total">
                    <span>Total Amount</span>
                    <span id="totalFareText-${bus.id}">$0.00</span>
                  </div>
                </div>
              </div>

              <button class="btn-proceed-booking" id="proceedBtn-${bus.id}" disabled>
                Proceed to Book ➔
              </button>
            </div>
          </div>
        </div>
      `;

      busesList.appendChild(card);

      // Attach Toggle Seats listener
      const toggleBtn = card.querySelector('.btn-toggle-seats');
      toggleBtn.addEventListener('click', () => {
        toggleSeatPanel(bus.id, travelDate, toggleBtn);
      });
    });
  }

  // Toggle Seat Panel
  async function toggleSeatPanel(busId, travelDate, toggleBtn) {
    const panel = document.getElementById(`panel-${busId}`);
    const isOpen = panel.classList.contains('open');

    // Close any other open panels
    document.querySelectorAll('.seat-selection-panel.open').forEach(p => {
      if (p !== panel) {
        p.classList.remove('open');
        const bId = p.id.replace('panel-', '');
        const btn = document.querySelector(`[data-bus-id="${bId}"]`);
        if (btn) {
          btn.textContent = 'Select Seats ▼';
          btn.classList.remove('active');
        }
      }
    });

    if (isOpen) {
      panel.classList.remove('open');
      toggleBtn.textContent = 'Select Seats ▼';
      toggleBtn.classList.remove('active');
      activeSelectedSeats = [];
      activeBusForBooking = null;
    } else {
      panel.classList.add('open');
      toggleBtn.textContent = 'Hide Seats ▲';
      toggleBtn.classList.add('active');
      activeSelectedSeats = [];
      await loadBusSeatMap(busId, travelDate);
    }
  }

  // Load Bus Seat Map
  async function loadBusSeatMap(busId, travelDate) {
    const coachContainer = document.getElementById(`coach-${busId}`);
    try {
      const res = await fetch(`/api/buses/${busId}?date=${travelDate}`);
      const busDetails = await res.json();
      activeBusForBooking = busDetails;

      renderSeatMap(busDetails, coachContainer);
    } catch (err) {
      coachContainer.innerHTML = '<p class="error-banner">Failed to load seat layout.</p>';
    }
  }

  // Render Seat Map
  function renderSeatMap(bus, container) {
    const hasUpperDeck = bus.layout && bus.layout.hasUpperDeck;
    const lowerSeats = (bus.layout && bus.layout.lower) || [];
    const upperSeats = (bus.layout && bus.layout.upper) || [];
    const bookedSeats = new Set(bus.bookedSeats || []);
    const femaleSeats = new Set(bus.femaleReservedSeats || []);

    let deckTabsHtml = '';
    if (hasUpperDeck) {
      deckTabsHtml = `
        <div class="deck-tabs">
          <button class="deck-tab-btn active" data-deck-target="lower-${bus.id}">Lower Deck</button>
          <button class="deck-tab-btn" data-deck-target="upper-${bus.id}">Upper Deck</button>
        </div>
      `;
    } else {
      deckTabsHtml = `<div style="font-weight:700;font-size:0.9rem;color:#475569;">Single Deck Coach</div>`;
    }

    // Helper to generate seat grid HTML
    const buildDeckHtml = (deckId, seatsList, isActive) => {
      // Group by row
      const rowsMap = {};
      seatsList.forEach(s => {
        if (!rowsMap[s.row]) rowsMap[s.row] = [];
        rowsMap[s.row].push(s);
      });

      let rowsHtml = '';
      Object.keys(rowsMap).forEach(rowNum => {
        const rowSeats = rowsMap[rowNum].sort((a, b) => a.col - b.col);
        
        let seatElements = '';
        rowSeats.forEach((seat, idx) => {
          const isBooked = bookedSeats.has(seat.id);
          const isFemale = femaleSeats.has(seat.id);
          const seatTypeClass = seat.type === 'sleeper' ? 'sleeper' : 'seater';
          const bookedClass = isBooked ? 'booked' : '';
          const femaleClass = isFemale ? 'female-reserved' : '';

          // Add aisle gap if needed
          if (idx > 0 && seat.col - rowSeats[idx - 1].col > 1) {
            seatElements += `<div class="aisle-gap"></div>`;
          }

          seatElements += `
            <div class="seat ${seatTypeClass} ${bookedClass} ${femaleClass}" 
                 data-seat-id="${seat.id}"
                 data-bus-id="${bus.id}"
                 data-price="${bus.fare + (seat.priceOffset || 0)}"
                 title="${seat.id} - ${seat.type.toUpperCase()}${seat.isWindow ? ' (Window)' : ''} - $${(bus.fare + (seat.priceOffset || 0)).toFixed(2)}${isBooked ? ' (Booked)' : ''}">
              <span>${seat.id}</span>
            </div>
          `;
        });

        rowsHtml += `<div class="seat-row">${seatElements}</div>`;
      });

      return `
        <div class="deck-view ${isActive ? 'active' : ''}" id="${deckId}">
          <div class="seats-grid">
            ${rowsHtml}
          </div>
        </div>
      `;
    };

    container.innerHTML = `
      <div class="coach-header">
        ${deckTabsHtml}
        <div class="steering-indicator">
          <span>FRONT</span>
          <span style="font-size:1.1rem;">🛞 Driver</span>
        </div>
      </div>

      ${buildDeckHtml(`lower-${bus.id}`, lowerSeats, true)}
      ${hasUpperDeck ? buildDeckHtml(`upper-${bus.id}`, upperSeats, false) : ''}

      <div class="seat-legend">
        <div class="legend-item"><div class="legend-box available"></div> Available</div>
        <div class="legend-item"><div class="legend-box selected"></div> Selected</div>
        <div class="legend-item"><div class="legend-box booked"></div> Already Booked</div>
      </div>
    `;

    // Deck Tab Switching
    if (hasUpperDeck) {
      container.querySelectorAll('.deck-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.deck-tab-btn').forEach(b => b.classList.remove('active'));
          container.querySelectorAll('.deck-view').forEach(v => v.classList.remove('active'));

          btn.classList.add('active');
          const target = document.getElementById(btn.dataset.deckTarget);
          if (target) target.classList.add('active');
        });
      });
    }

    // Seat click listener
    container.querySelectorAll('.seat:not(.booked)').forEach(seatEl => {
      seatEl.addEventListener('click', () => {
        toggleSeatSelection(seatEl, bus.id);
      });
    });

    // Proceed to Book button listener
    const proceedBtn = document.getElementById(`proceedBtn-${bus.id}`);
    proceedBtn.onclick = () => {
      if (activeSelectedSeats.length > 0) {
        openBookingModal();
      }
    };
  }

  // Toggle Seat Selection
  function toggleSeatSelection(seatEl, busId) {
    const seatId = seatEl.dataset.seatId;
    const isSelected = activeSelectedSeats.includes(seatId);

    if (isSelected) {
      activeSelectedSeats = activeSelectedSeats.filter(s => s !== seatId);
      seatEl.classList.remove('selected');
    } else {
      if (activeSelectedSeats.length >= 6) {
        alert('You can select a maximum of 6 seats per booking.');
        return;
      }
      activeSelectedSeats.push(seatId);
      seatEl.classList.add('selected');
    }

    updateSeatCheckout(busId);
  }

  // Update checkout sidebar
  function updateSeatCheckout(busId) {
    const chipsContainer = document.getElementById(`selectedChips-${busId}`);
    const seatCountEl = document.getElementById(`seatCount-${busId}`);
    const baseFareText = document.getElementById(`baseFareText-${busId}`);
    const taxFareText = document.getElementById(`taxFareText-${busId}`);
    const totalFareText = document.getElementById(`totalFareText-${busId}`);
    const proceedBtn = document.getElementById(`proceedBtn-${busId}`);

    if (activeSelectedSeats.length === 0) {
      chipsContainer.innerHTML = `<span style="color:#94a3b8;font-size:0.85rem;">No seats selected yet. Click on the seats to select.</span>`;
      seatCountEl.textContent = '0';
      baseFareText.textContent = '$0.00';
      taxFareText.textContent = '$0.00';
      totalFareText.textContent = '$0.00';
      proceedBtn.disabled = true;
      return;
    }

    // Render chips
    chipsContainer.innerHTML = activeSelectedSeats
      .map(s => `<span class="selected-seat-chip">Seat ${s}</span>`)
      .join('');

    seatCountEl.textContent = activeSelectedSeats.length;

    // Calculate fare
    let baseFare = 0;
    activeSelectedSeats.forEach(sId => {
      const el = document.querySelector(`[data-seat-id="${sId}"][data-bus-id="${busId}"]`);
      if (el && el.dataset.price) {
        baseFare += parseFloat(el.dataset.price);
      } else {
        baseFare += activeBusForBooking.fare;
      }
    });

    const tax = Math.round((baseFare * 0.05) * 100) / 100;
    const total = Math.round((baseFare + tax) * 100) / 100;

    baseFareText.textContent = `$${baseFare.toFixed(2)}`;
    taxFareText.textContent = `$${tax.toFixed(2)}`;
    totalFareText.textContent = `$${total.toFixed(2)}`;

    proceedBtn.disabled = false;
    proceedBtn.textContent = `Proceed to Book (${activeSelectedSeats.length} seats) ➔`;
  }

  // Open Passenger Details Modal
  function openBookingModal() {
    if (!activeBusForBooking || activeSelectedSeats.length === 0) return;

    modalBusSub.textContent = `${activeBusForBooking.name} (${activeBusForBooking.from} ➔ ${activeBusForBooking.to}) | Travel Date: ${formatDate(travelDateInput.value)}`;

    modalSeatsBadge.innerHTML = `Selected Seats: <strong>${activeSelectedSeats.join(', ')}</strong> (${activeSelectedSeats.length} Passenger${activeSelectedSeats.length > 1 ? 's' : ''})`;

    // Populate Boarding Points
    boardingPointSelect.innerHTML = (activeBusForBooking.boardingPoints || []).map(bp => {
      return `<option value="${bp.location} (${bp.time})">${bp.location} - ${bp.time}</option>`;
    }).join('');

    // Populate Dropping Points
    droppingPointSelect.innerHTML = (activeBusForBooking.droppingPoints || []).map(dp => {
      return `<option value="${dp.location} (${dp.time})">${dp.location} - ${dp.time}</option>`;
    }).join('');

    // Dynamic passenger input rows
    passengersFormList.innerHTML = '';
    activeSelectedSeats.forEach((seatId, idx) => {
      const passengerBox = document.createElement('div');
      passengerBox.className = 'passenger-entry-box';
      passengerBox.innerHTML = `
        <div class="passenger-entry-header">PASSENGER ${idx + 1} (Seat ${seatId})</div>
        <div class="form-row-3">
          <div class="input-group">
            <label>Full Name</label>
            <input type="text" name="passenger_name_${seatId}" placeholder="e.g. John Doe" required>
          </div>
          <div class="input-group">
            <label>Age</label>
            <input type="number" name="passenger_age_${seatId}" min="1" max="110" placeholder="e.g. 28" required>
          </div>
          <div class="input-group">
            <label>Gender</label>
            <select name="passenger_gender_${seatId}" required>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      `;
      passengersFormList.appendChild(passengerBox);
    });

    // Summary calculation
    let baseFare = 0;
    activeSelectedSeats.forEach(sId => {
      const el = document.querySelector(`[data-seat-id="${sId}"][data-bus-id="${activeBusForBooking.id}"]`);
      if (el && el.dataset.price) {
        baseFare += parseFloat(el.dataset.price);
      } else {
        baseFare += activeBusForBooking.fare;
      }
    });
    const tax = Math.round((baseFare * 0.05) * 100) / 100;
    const total = Math.round((baseFare + tax) * 100) / 100;

    modalFareSummary.innerHTML = `
      <div class="breakdown-row">
        <span>Base Fare (${activeSelectedSeats.length} seats):</span>
        <span>$${baseFare.toFixed(2)}</span>
      </div>
      <div class="breakdown-row">
        <span>Service Tax & GST (5%):</span>
        <span>$${tax.toFixed(2)}</span>
      </div>
      <div class="breakdown-row total">
        <span>Total Payable:</span>
        <span>$${total.toFixed(2)}</span>
      </div>
    `;

    bookingModal.style.display = 'flex';
  }

  // Close Booking Modal
  const closeBookingModalFn = () => {
    bookingModal.style.display = 'none';
  };
  closeBookingModal.addEventListener('click', closeBookingModalFn);
  cancelBookingBtn.addEventListener('click', closeBookingModalFn);

  // Submit Booking Form
  passengerDetailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const passengers = [];
    activeSelectedSeats.forEach(seatId => {
      const nameInput = document.querySelector(`[name="passenger_name_${seatId}"]`);
      const ageInput = document.querySelector(`[name="passenger_age_${seatId}"]`);
      const genderInput = document.querySelector(`[name="passenger_gender_${seatId}"]`);

      passengers.push({
        seat: seatId,
        name: nameInput ? nameInput.value.trim() : 'Passenger',
        age: ageInput ? parseInt(ageInput.value, 10) : 30,
        gender: genderInput ? genderInput.value : 'Male'
      });
    });

    const contact = {
      email: document.getElementById('contactEmail').value.trim(),
      phone: document.getElementById('contactPhone').value.trim()
    };

    const payload = {
      busId: activeBusForBooking.id,
      date: travelDateInput.value,
      seats: activeSelectedSeats,
      passengers,
      boardingPoint: boardingPointSelect.value,
      droppingPoint: droppingPointSelect.value,
      contact
    };

    try {
      const submitBtn = document.getElementById('confirmPayBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Booking...';

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Pay & Confirm Booking</span> 🔒';

      if (!res.ok) {
        alert(data.error || 'Failed to complete booking.');
        return;
      }

      // Close booking modal and open Ticket confirmation
      closeBookingModalFn();
      renderAndShowTicket(data.booking);

      // Refresh search results to update remaining seat counts
      performSearch();
    } catch (err) {
      alert('Network error while creating booking.');
    }
  });

  // Render and Show Ticket
  function renderAndShowTicket(booking) {
    const passengersRows = (booking.passengers || []).map((p, i) => `
      <tr>
        <td><strong>${p.name}</strong> (${p.gender}, ${p.age} yrs)</td>
        <td><span class="selected-seat-chip">${p.seat}</span></td>
      </tr>
    `).join('');

    const qrSvg = generateSimpleQRCodeSVG(booking.pnr);

    printableTicketArea.innerHTML = `
      <div class="ticket-card">
        <div class="ticket-header-banner">
          <div>
            <div style="font-size:0.75rem;letter-spacing:0.05em;color:#94a3b8;">CONFIRMED BUS E-TICKET</div>
            <div style="font-size:1.2rem;font-weight:800;">${booking.operator}</div>
            <div style="font-size:0.8rem;color:#cbd5e1;">${booking.busName} (${booking.busType})</div>
          </div>
          <div class="ticket-pnr-box">
            <div class="pnr-label">PNR NUMBER</div>
            <div class="pnr-code">${booking.pnr}</div>
          </div>
        </div>

        <div class="ticket-main-grid">
          <div>
            <div class="ticket-route-row">
              <div class="ticket-point">
                <div class="tp-city">${booking.from}</div>
                <div class="tp-time">${booking.departureTime}</div>
                <div class="tp-loc">${booking.boardingPoint}</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:0.75rem;color:#64748b;">${booking.duration || 'Direct'}</div>
                <div style="color:#2563eb;font-weight:bold;">➔➔➔</div>
              </div>
              <div class="ticket-point dest">
                <div class="tp-city">${booking.to}</div>
                <div class="tp-time">${booking.arrivalTime}</div>
                <div class="tp-loc">${booking.droppingPoint}</div>
              </div>
            </div>

            <div style="font-size:0.85rem;color:#475569;margin-bottom:0.75rem;">
              📅 <strong>Travel Date:</strong> ${formatDate(booking.date)}
            </div>

            <table class="ticket-passengers-table">
              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>Seat</th>
                </tr>
              </thead>
              <tbody>
                ${passengersRows}
              </tbody>
            </table>
          </div>

          <div class="ticket-qr-container">
            <div class="qr-placeholder">
              ${qrSvg}
            </div>
            <div class="qr-caption">Scan to Verify Ticket</div>
            <div style="font-size:0.75rem;font-family:'Space Mono';margin-top:0.3rem;color:#1e293b;">${booking.pnr}</div>
          </div>
        </div>

        <div class="ticket-footer-strip">
          <div>
            <div>Contact: <strong>${booking.contact.phone || 'N/A'}</strong></div>
            <div style="font-size:0.75rem;color:#64748b;">Confirmation sent to ${booking.contact.email || 'passenger'}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:0.75rem;color:#64748b;">Total Amount Paid</div>
            <div class="fare-total-badge">$${booking.fareDetails.total.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;

    ticketModal.style.display = 'flex';
  }

  // Close Ticket Modal
  const closeTicketModalFn = () => {
    ticketModal.style.display = 'none';
  };
  closeTicketModal.addEventListener('click', closeTicketModalFn);
  ticketCloseBtn.addEventListener('click', closeTicketModalFn);

  // Print Ticket
  printTicketBtn.addEventListener('click', () => {
    window.print();
  });

  // PNR Lookup Handlers
  openPnrBtn.addEventListener('click', () => {
    pnrErrorMsg.style.display = 'none';
    pnrInput.value = '';
    pnrLookupModal.style.display = 'flex';
  });

  const closePnrModalFn = () => {
    pnrLookupModal.style.display = 'none';
  };
  closePnrModal.addEventListener('click', closePnrModalFn);
  cancelPnrBtn.addEventListener('click', closePnrModalFn);

  pnrLookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pnr = pnrInput.value.trim();
    pnrErrorMsg.style.display = 'none';

    try {
      const res = await fetch(`/api/bookings/pnr/${encodeURIComponent(pnr)}`);
      const data = await res.json();

      if (!res.ok) {
        pnrErrorMsg.textContent = data.error || 'Ticket not found.';
        pnrErrorMsg.style.display = 'block';
        return;
      }

      closePnrModalFn();
      renderAndShowTicket(data);
    } catch (err) {
      pnrErrorMsg.textContent = 'Network error looking up PNR.';
      pnrErrorMsg.style.display = 'block';
    }
  });

  // Helper date formatter
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Pure SVG QR Code generator (standard pseudo-matrix for display/print)
  function generateSimpleQRCodeSVG(pnr) {
    const size = 120;
    const grid = 21; // 21x21 standard QR grid
    const cellSize = size / grid;

    // Deterministic hash based on PNR string
    let hash = 0;
    for (let i = 0; i < pnr.length; i++) {
      hash = (hash << 5) - hash + pnr.charCodeAt(i);
      hash |= 0;
    }

    let rects = '';

    // Function to check if coordinate is in the 3 finder patterns
    const isFinder = (r, c) => {
      if (r < 7 && c < 7) return true; // Top-left
      if (r < 7 && c >= grid - 7) return true; // Top-right
      if (r >= grid - 7 && c < 7) return true; // Bottom-left
      return false;
    };

    // Draw finder patterns
    const drawFinder = (startR, startC) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBlack = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          if (isBlack) {
            rects += `<rect x="${(startC + c) * cellSize}" y="${(startR + r) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a"/>`;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, grid - 7);
    drawFinder(grid - 7, 0);

    // Draw timing lines
    for (let i = 8; i < grid - 8; i++) {
      if (i % 2 === 0) {
        rects += `<rect x="${6 * cellSize}" y="${i * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a"/>`;
        rects += `<rect x="${i * cellSize}" y="${6 * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a"/>`;
      }
    }

    // Populate data cells
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (!isFinder(r, c) && r !== 6 && c !== 6) {
          const pseudoRand = ((hash ^ (r * 31 + c * 17)) & 1) === 0;
          if (pseudoRand) {
            rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a"/>`;
          }
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      ${rects}
    </svg>`;
  }
});
