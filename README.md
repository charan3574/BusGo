# 🚌 SwiftBus - Online Bus Ticket Booking System

A full-stack, responsive Online Bus Ticket Reservation System with interactive seat layouts (sleeper/seater with lower/upper decks), real-time fare calculation, passenger reservation, digital e-tickets with QR codes, print-to-PDF receipts, and a complete admin management portal.

---

## ⚡ Dual-Engine Database Architecture

The backend features an **auto-detecting dual-engine storage architecture**:
1. **🍃 MongoDB Mode**: If MongoDB is running locally (`mongodb://127.0.0.1:27017/bus_ticket_system`) or via MongoDB Atlas in `.env`, the system automatically connects and persists to MongoDB collections (`buses` and `bookings`) using Mongoose.
2. **📁 Local Persistent Storage Mode (Zero-Config)**: If MongoDB is not running or not installed, the backend automatically and seamlessly switches to local persistent JSON files (`data/buses.json` and `data/bookings.json`). **Zero crashes, zero configuration required!**

---

## 🌐 Full Stack Architecture

### 1. Front-End (Client-Side)
- **Customer Booking Portal (`public/index.html`, `public/js/app.js`, `public/css/style.css`)**:
  - **Route Search**: Autocomplete city selectors with quick city swap and popular route chips.
  - **Interactive Seat Map**:
    - Upper & Lower deck tab switching for multi-deck sleeper buses.
    - Realistic 2+1 sleeper berths & 2+2 pushback seater chairs.
    - Real-time seat status (Available, Selected, Booked, Ladies reserved).
    - Maximum 6 seats selection validation with live pricing.
  - **Passenger Details & Boarding Selection**:
    - Dynamic passenger information form matching selected seats (Name, Age, Gender).
    - Boarding and dropping point pickers with schedule timings.
    - Transparent fare breakdown (Base Fare + 5% GST/Tax).
  - **Digital Boarding Pass & E-Ticket**:
    - Instant booking confirmation with unique 6-character PNR (e.g. `BUS-789421`).
    - Dynamic QR code generation for digital ticket validation.
    - Print-ready and Save as PDF layout (`Ctrl+P`).
  - **PNR Tracking**:
    - Modal to search and retrieve any existing e-ticket by PNR code.

- **Admin Management Portal (`public/admin.html`, `public/js/admin.js`)**:
  - **Live Dashboard Metrics**: Total Revenue ($), Total Bookings, Active Routes, Total Passengers Served.
  - **Bookings Management**: Real-time table of all passenger reservations, instant search by PNR or Passenger name, and instant booking cancellation with seat release.
  - **Fleet & Route Management**: View all active bus routes, create new routes with automatic sleeper/seater seat grid generation, and remove retired buses.

### 2. Back-End (Server-Side)
- **Node.js + Express.js (`server.js`, `config/storage.js`)**:
  - **RESTful Endpoints**:
    - `GET /api/health` - Server uptime, storage mode (MongoDB vs JSON), and record counts.
    - `GET /api/cities` - Unique origin and destination cities for autocomplete.
    - `GET /api/buses` - Route search, date-based seat occupancy, and sorting.
    - `GET /api/buses/:id` - Bus details, seat layout, and booked seat IDs for a given travel date.
    - `POST /api/bookings` - Create reservation, seat collision detection, price calculation, and PNR assignment.
    - `GET /api/bookings/pnr/:pnr` - Retrieve booking by PNR code.
    - `GET /api/admin/stats` - Total revenue, confirmed bookings, active buses, and passenger counts.
    - `GET /api/admin/bookings` - Retrieve all bookings sorted chronologically.
    - `DELETE /api/admin/bookings/:id` - Cancel booking and free up allocated seats.
    - `POST /api/admin/buses` - Add new bus with automated deck and seat layout synthesis.
    - `DELETE /api/admin/buses/:id` - Remove a bus route.
  - **Concurrency & Collision Prevention**: Real-time check preventing two passengers from booking the same seat on the same bus and travel date.
  - **Static Asset Delivery**: Serves optimized CSS, client JS, and assets.

---

## 💻 How to Run the Application

### Method 1: One-Click Launch (Windows)
Double-click `start-system.bat` in the project folder:
```powershell
C:\Users\pillu\.gemini\antigravity\scratch\bus-ticket-system\start-system.bat
```
This automatically launches the server and opens [http://localhost:3000](http://localhost:3000) in your browser.

### Method 2: Command Line (PowerShell)
```powershell
cd "C:\Users\pillu\.gemini\antigravity\scratch\bus-ticket-system"
node server.js
```

### Method 3: Run Full Integration Tests
Verify all 11 endpoints and storage operations:
```powershell
npm test
```

---

## 🔗 Portals & Endpoints

| Resource | URL | Description |
|---|---|---|
| **Customer Booking Portal** | `http://localhost:3000` | Search, select seats, book tickets, and download PDF boarding pass |
| **Admin Management Portal** | `http://localhost:3000/admin.html` | Revenue analytics, reservation table, route management |
| **System Health API** | `http://localhost:3000/api/health` | Live diagnostic check & database storage mode |

---

## 📁 Project Directory Structure

```
bus-ticket-system/
├── .env                  # Environment configuration (PORT, MONGODB_URI)
├── .env.example          # Sample environment variables
├── .vscode/              # Visual Studio Code configurations
├── config/
│   ├── storage.js        # Unified Data Store (MongoDB Mongoose + JSON fallback)
│   └── db.js             # MongoDB connection utility
├── models/
│   ├── Bus.js            # Mongoose Schema & Model for Bus routes & seat layouts
│   └── Booking.js        # Mongoose Schema & Model for Reservations & PNRs
├── data/
│   ├── buses.json        # Persistent local bus fleet database
│   └── bookings.json     # Persistent local booking records database
├── public/
│   ├── css/
│   │   └── style.css     # Responsive UI styling & print stylesheet
│   ├── js/
│   │   ├── app.js        # Customer application (search, seats, booking, QR)
│   │   └── admin.js      # Admin dashboard & management
│   ├── index.html        # Customer reservation portal
│   └── admin.html        # Admin management portal
├── package.json          # Project metadata & npm dependencies
├── server.js             # Express REST API backend server
├── test-mongo.js         # End-to-end integration test suite
├── start-system.bat      # One-click Windows launch script
└── README.md             # Documentation
```
