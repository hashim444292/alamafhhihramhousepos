# Desktop Application Transition Architecture (Electron / Tauri / PWA)

This document provides the complete architecture and deployment guide to package the **Al-Afhhihram House POS** into a high-performance native desktop application using **Tauri** or **Electron**, with local data storage (SQLite) and background cloud synchronization (PostgreSQL).

---

## 1. High-Level Architectural Model

```
+-----------------------------------------------------------------------+
|                       DESKTOP CLIENT CONTAINER                        |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |                  Next.js React UI Layer                         |  |
|  |   - Touch POS Register       - Offline Queue (Zustand/IDB)      |  |
|  |   - Thermal Receipt Print    - USB Barcode Scanner Input        |  |
|  +-----------------------------------------------------------------+  |
|                                  | (Internal HTTP / IPC)              |
|  +-----------------------------------------------------------------+  |
|  |                 Embedded Node.js / Rust Server                  |  |
|  |   - Express.js or Next.js Standalone Daemon                     |  |
|  |   - ESC/POS Direct Hardware Driver (USB/Serial Thermal Roll)   |  |
|  +-----------------------------------------------------------------+  |
|                                  |                                    |
|  +-----------------------------------------------------------------+  |
|  |                 Local Database Layer (SQLite)                   |  |
|  |   - dev.db / pos_local.sqlite                                   |  |
|  |   - Instant sub-millisecond local reads & writes                |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
                                   |
             [Bidirectional Batch Sync via /api/pos/sync]
                                   |
                                   v
+-----------------------------------------------------------------------+
|                      CLOUD / MAIN SERVER (CENTRAL)                    |
|                                                                       |
|   - Central Next.js / Express Web Application                         |
|   - Master PostgreSQL Database (Multi-Store / Multi-Terminal)        |
|   - Master Inventory & Financial Aggregation                          |
+-----------------------------------------------------------------------+
```

---

## 2. Database Driver Agnosticism (PostgreSQL <-> SQLite)

The backend and ORM layer in this repository is designed to be **database-agnostic**:

1. **Environment-Driven Switching**:
   - In `.env`:
     ```env
     # For Cloud / Server Deployment:
     DATABASE_URL="postgresql://user:pass@cloudhost:5432/al_afhhihram_pos?schema=public"

     # For Local Desktop Deployment:
     DATABASE_URL="file:./data/pos_local.db"
     ```

2. **Prisma Dual Provider Strategy**:
   - `prisma/schema.prisma`: Preconfigured for zero-dependency local SQLite file storage.
   - `prisma/schema.postgresql.prisma`: Configured with native Postgres `ENUM` types, high-precision `DECIMAL(12,2)`, and schema namespaces for cloud servers.
   - Run `npx prisma db push` to generate the local SQLite database file immediately.

3. **Data Access Repository Pattern**:
   - The services (`ProductService`, `SalesService`, `ShiftService`, etc.) only communicate with `db` client, making queries identical regardless of whether running SQLite or PostgreSQL.

---

## 3. Offline-First Resilience & Sync Engine

Retail POS terminals in Saudi Arabia and high-volume pilgrimage retail zones cannot afford downtime if store Wi-Fi or broadband drops.

### How Offline Mode Works:
1. **Network Listener**: `Navbar.tsx` and `pos-store.ts` continuously monitor `navigator.onLine`.
2. **Offline Sale Interception**:
   - When a sale is processed while disconnected, the app creates a client-side UUID:
     `clientTransactionId: "client-1712456789-x9a2k"`.
   - The transaction is saved directly into the **Zustand Persistent Store** (backed by IndexedDB/LocalStorage) with status `PENDING_SYNC`.
3. **Local Receipt Generation**:
   - The POS screen renders and prints the thermal invoice immediately without blocking the cashier.
4. **Idempotent Background Synchronization**:
   - When connection returns, the system pushes pending items to `/api/pos/sync`.
   - The server inspects `clientTransactionId`:
     - If the transaction was already recorded (e.g. timeout during previous request), it returns `DUPLICATE_IGNORED` without double-deducting stock.
     - If new, it writes the transaction atomically and decrements inventory.

---

## 4. Hardware Thermal Receipt Printing (80mm & 58mm)

### Method A: Browser Native Print (CSS `@media print`)
- Already configured in `ThermalReceipt.tsx` and `src/app/globals.css`.
- The printer driver is selected once in Windows / OS dialog, and `window.print()` outputs receipt directly on continuous roll paper.

### Method B: Raw ESC/POS Protocol (Direct USB / Serial / Network)
- For high-speed desktop apps without showing print dialogs:
- `src/lib/escpos.ts` contains the `EscPosBuilder` class:
  ```typescript
  import { EscPosBuilder } from "@/lib/escpos";

  const buffer = EscPosBuilder.generateReceiptBuffer(saleData, "80mm");
  // In Tauri (Rust): Send raw bytes to serial/USB port
  // In Electron: Send via node-printer or escpos-usb package
  ```

---

## 5. Packaging with Tauri or Electron

### Option A: Tauri (Recommended: Lightweight < 15MB, Low RAM)
1. Initialize Tauri in the project:
   ```bash
   npm install -D @tauri-apps/cli
   npx tauri init
   ```
2. Configure `tauri.conf.json`:
   - Set `build.distDir` to Next.js static export or configure a sidecar Node.js standalone process.
3. Run desktop dev:
   ```bash
   npx tauri dev
   ```

### Option B: Electron
1. Install Electron:
   ```bash
   npm install -D electron electron-builder
   ```
2. Create `electron/main.js`:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');

   function createWindow() {
     const win = new BrowserWindow({
       width: 1280,
       height: 800,
       webPreferences: {
         nodeIntegration: false,
         contextIsolation: true,
       },
     });
     win.loadURL('http://localhost:3000/pos');
   }

   app.whenReady().then(createWindow);
   ```
3. Add script to `package.json`:
   ```json
   "desktop": "concurrently \"npm run dev\" \"electron electron/main.js\""
   ```

---

## 6. Security & Hardening Checklist
- [x] Passwords salted and hashed with bcrypt (10 rounds).
- [x] JWT sessions with HTTP-only cookies and Bearer token fallback.
- [x] Strict Role-Based Access Control (Admin, Manager, Cashier).
- [x] Z-Report cash drawer reconciliation to prevent cashier discrepancies.
- [x] Stock movement audit logs on all sales and adjustments.
