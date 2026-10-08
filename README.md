# Al-Afhhihram House - POS & Inventory Management System

A production-ready Point of Sale (POS) and Inventory Management Web & Desktop Application designed for retail shops selling **Ihram sets, Islamic clothing, and Hajj/Umrah accessories**.

Built with Next.js (App Router), Tailwind CSS, Zustand, Prisma ORM, and PostgreSQL (with seamless SQLite fallback for local and desktop deployment).

---

## 🌟 Key Features

### 🛒 1. Touch-Friendly POS Billing Screen
- **Dual-Pane Layout**: 65% product catalog with category chips, 35% cart & checkout panel.
- **Hardware Barcode Scanner Support**: Automatically captures input from standard USB barcode scanners with zero clicks.
- **HTML5 Camera Barcode Scanner**: Built-in camera scanner for mobile/tablet cashier devices.
- **Cart & Discounts**: Flexible line-item and cart-level discounts (percentage % or fixed SAR amount).
- **Multi-Tender Payments**: Cash (with quick banknotes: 50, 100, 200, 500 SAR and instant change calculator), Credit/Debit Cards (Mada), and Mobile Wallets (Apple Pay / STC Pay).
- **Thermal Receipt Engine**: Formatted strictly for **80mm** (~72mm printable) and **58mm** (~48mm printable) thermal receipt paper with CSS `@media print` and ESC/POS command generation.
- **Z-Report & Shift Management**: Cash drawer float reconciliation, system-expected cash vs physically counted cash, and variance calculation.

### 📦 2. Inventory & Stock Control
- Real-time catalog with SKU, barcode, unit, sizes, and colors.
- Low-stock visual alert badges.
- Stock-In and Stock-Out manual adjustment modals with immutable audit trail (`stock_movements`).
- Printable adhesive barcode label sheet generator with store branding and price tags.

### 📊 3. Admin Financial Dashboard
- Real-time metrics: Today's Revenue, Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Profit.
- Payment channels breakdown (Cash vs Card vs Mobile Wallet).
- Filterable sales invoices audit table by date, cashier, and payment method.

### 💼 4. Overhead Expense Tracking
- Categorized expense logging: Rent, Utilities (cooling/electric), Packaging bags, Transport logistics, Salaries, and Misc.

### 🔄 5. Desktop & Offline-First Architecture
- Persistent Zustand store queues transactions locally when offline.
- Background sync flushes queued sales to `/api/pos/sync` with idempotent duplicate prevention.
- Seamlessly packageable with **Tauri** or **Electron** (see [DESKTOP_TRANSITION.md](./DESKTOP_TRANSITION.md)).

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the example configuration:
```bash
cp .env.example .env
```

### 3. Initialize Database & Seed Demo Data
```bash
# Push schema to local SQLite database (dev.db)
npx prisma db push

# Seed initial Islamic retail inventory and demo users
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Demo Credentials

| Role | Username | Password | Default Redirect |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | `/dashboard` (Executive Financials) |
| **Manager** | `manager` | `manager123` | `/inventory` (Stock & Adjustments) |
| **Cashier** | `cashier1` | `cashier123` | `/pos` (Cashier Register) |

---

## 📂 Project Structure

```
alamafhhihramhousepos/
├── database/
│   ├── schema.sql                 # Pure PostgreSQL DDL with triggers & constraints
│   └── schema-sqlite.sql          # Pure SQLite DDL for desktop embedded engines
├── prisma/
│   ├── schema.prisma              # Active Prisma schema (SQLite dev / PostgreSQL prod)
│   ├── schema.postgresql.prisma   # PostgreSQL-specific schema with ENUMs and Decimals
│   └── seed.ts                    # Realistic Ihram & Islamic apparel seed dataset
├── src/
│   ├── app/
│   │   ├── api/                   # Modular API endpoints
│   │   │   ├── auth/              # Login, logout, session check
│   │   │   ├── products/          # Catalog & CRUD
│   │   │   ├── inventory/         # Stock movements & low-stock alerts
│   │   │   ├── pos/               # Checkout, shifts, offline sync
│   │   │   ├── expenses/          # Categorized overhead expenses
│   │   │   └── reports/           # Financial KPIs & sales queries
│   │   ├── pos/                   # POS Register page
│   │   ├── inventory/             # Stock catalog & barcode generator
│   │   ├── dashboard/             # Financial dashboard
│   │   ├── expenses/              # Expense logging view
│   │   ├── login/                 # Authentication page
│   │   ├── globals.css            # Styles & thermal print media queries
│   │   └── layout.tsx             # Root app shell & Navbar
│   ├── components/
│   │   ├── layout/Navbar.tsx      # Top bar, network status & sync queue
│   │   └── pos/
│   │       ├── ProductGrid.tsx    # Touch product catalog & USB scanner input
│   │       ├── CartPane.tsx       # Shopping cart, line & cart discounts
│   │       ├── PaymentModal.tsx   # Multi-tender modal & change calculator
│   │       ├── ShiftModal.tsx     # Shift open/close & Z-Report reconciliation
│   │       ├── ThermalReceipt.tsx # 80mm / 58mm thermal receipt component
│   │       └── BarcodeScannerModal.tsx # HTML5 camera barcode scanner
│   ├── lib/
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── jwt.ts                 # JWT signing and verification (jose)
│   │   ├── auth-middleware.ts     # RBAC protection & token inspection
│   │   ├── escpos.ts              # Raw ESC/POS thermal command builder
│   │   └── validations/           # Zod validation schemas
│   ├── server/
│   │   ├── express-server.ts      # Standalone Express daemon (for Electron/Tauri)
│   │   └── services/              # Business logic (Sales, Products, Shifts, etc.)
│   └── store/
│       ├── auth-store.ts          # Zustand store for user session
│       └── pos-store.ts           # Zustand store for cart & offline sync queue
├── DESKTOP_TRANSITION.md          # Architecture guide for Electron, Tauri & PWA
├── DATABASE.md                    # Database ER diagram & financial audit rules
└── package.json
```

---

## 📜 License
Proprietary software engineered for Al-Afhhihram House. All rights reserved.
