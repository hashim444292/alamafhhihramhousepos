# Database Architecture & Entity Specifications

The Al-Afhhihram House POS database is engineered for audit-readiness, strict financial accuracy, and dual PostgreSQL/SQLite operation.

---

## 1. Relational Entity Overview

| Table Name | Primary Responsibility | Key Constraints & Indexes |
|---|---|---|
| `users` | Cashier & manager accounts with RBAC | `username UNIQUE`, `role IN (ADMIN, MANAGER, CASHIER)` |
| `categories` | Product hierarchy (Ihram, Thobes, Abayas, Sunnah Care) | `slug UNIQUE`, `name UNIQUE` |
| `products` | Retail catalog with dual pricing, barcode, size, color | `barcode UNIQUE`, `sku UNIQUE`, `stock_quantity >= 0` |
| `stock_movements` | Immutable audit trail for every inventory change | `product_id FK`, `movement_type`, `created_at` |
| `suppliers` | Wholesale vendors and ledger balances | `name`, `current_balance` |
| `supplier_ledger_entries` | Accounts payable debits and credits | `supplier_id FK`, `debit`, `credit`, `running_balance` |
| `shifts` | Cashier shifts and physical drawer Z-report records | `cashier_id FK`, `opened_at`, `closed_at`, `status` |
| `sales_transactions` | Invoices, tender details, and VAT amounts | `invoice_number UNIQUE`, `client_transaction_id UNIQUE` |
| `sales_items` | Individual invoice line items + historical cost price | `transaction_id FK`, `product_id FK`, `cost_price` |
| `purchase_orders` | Wholesale restocking purchase orders | `po_number UNIQUE`, `supplier_id FK`, `status` |
| `purchase_order_items` | Purchase order line items | `purchase_order_id FK`, `product_id FK` |
| `expenses` | Categorized overhead expenses (Rent, Utilities, Packaging) | `expense_number UNIQUE`, `category`, `date` |

---

## 2. Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ SHIFTS : opens
    USERS ||--o{ SALES_TRANSACTIONS : processes
    USERS ||--o{ EXPENSES : logs
    USERS ||--o{ STOCK_MOVEMENTS : audits
    
    CATEGORIES ||--o{ PRODUCTS : categorizes
    
    PRODUCTS ||--o{ STOCK_MOVEMENTS : tracks
    PRODUCTS ||--o{ SALES_ITEMS : sold_as
    PRODUCTS ||--o{ PURCHASE_ORDER_ITEMS : ordered_as
    
    SHIFTS ||--o{ SALES_TRANSACTIONS : groups
    
    SALES_TRANSACTIONS ||--|{ SALES_ITEMS : contains
    
    SUPPLIERS ||--o{ PURCHASE_ORDERS : fulfills
    SUPPLIERS ||--o{ SUPPLIER_LEDGER_ENTRIES : records
    
    PURCHASE_ORDERS ||--|{ PURCHASE_ORDER_ITEMS : specifies
```

---

## 3. Financial Integrity Design Principles

1. **Historical Cost Preservation (`sales_items.costPrice`)**:
   - The purchase cost at the moment of the sale is permanently stamped in `sales_items`.
   - If wholesale prices change next month, historical Cost of Goods Sold (COGS) and profit margin calculations remain 100% accurate and audit-compliant.

2. **Cash Drawer Reconciliation (`shifts`)**:
   - `openingCash`: Initial float recorded when shift begins.
   - `systemExpectedCash = openingCash + sum(cashSales) - sum(cashRefunds)`.
   - `cashDifference = closingCash - systemExpectedCash`.
   - Highlights cashier shortages or overages on shift close (Z-Report).

3. **Offline Sync Idempotency (`clientTransactionId`)**:
   - Every invoice created by a terminal receives a client-side UUID before transmission.
   - If poor network causes retries, the server uses a database uniqueness constraint on `client_transaction_id` to prevent duplicate billing and double inventory deduction.

---

## 4. Setup and Migration Commands

### To generate the SQLite schema locally:
```bash
npx prisma db push
```

### To apply to PostgreSQL cloud database:
```bash
# Update .env to your PostgreSQL connection string:
# DATABASE_URL="postgresql://user:pass@localhost:5432/al_afhhihram_pos"
npx prisma db push --schema=prisma/schema.postgresql.prisma
```

### To run initial seed:
```bash
npm run db:seed
```
