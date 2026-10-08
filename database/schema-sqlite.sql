-- ==============================================================================
-- DATABASE SCHEMA: AL-AFHHIHRAM HOUSE POS (SQLITE FALLBACK / DESKTOP VERSION)
-- Target: SQLite 3.35+
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. USERS & RBAC TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CASHIER' CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    purchase_price REAL NOT NULL CHECK (purchase_price >= 0),
    selling_price REAL NOT NULL CHECK (selling_price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_threshold INTEGER NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'pcs',
    size TEXT,
    color TEXT,
    brand TEXT,
    image_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 4. STOCK MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id TEXT,
    reference_type TEXT,
    notes TEXT,
    performed_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. SUPPLIERS & LEDGER
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    current_balance REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_ledger_entries (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    reference_type TEXT NOT NULL,
    reference_id TEXT,
    debit REAL NOT NULL DEFAULT 0.0,
    credit REAL NOT NULL DEFAULT 0.0,
    running_balance REAL NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. SHIFTS TABLE
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    cashier_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shift_number INTEGER,
    opened_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT,
    opening_cash REAL NOT NULL DEFAULT 0.0,
    closing_cash REAL,
    system_expected_cash REAL,
    cash_difference REAL,
    total_sales_amount REAL NOT NULL DEFAULT 0.0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    notes TEXT
);

-- 7. SALES TRANSACTIONS & ITEMS
CREATE TABLE IF NOT EXISTS sales_transactions (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    client_transaction_id TEXT UNIQUE,
    cashier_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shift_id TEXT REFERENCES shifts(id) ON DELETE SET NULL,
    customer_name TEXT DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    subtotal REAL NOT NULL,
    discount_type TEXT,
    discount_value REAL NOT NULL DEFAULT 0.0,
    discount_amount REAL NOT NULL DEFAULT 0.0,
    tax_rate REAL NOT NULL DEFAULT 0.15,
    tax_amount REAL NOT NULL DEFAULT 0.0,
    total_amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    amount_tendered REAL NOT NULL DEFAULT 0.0,
    change_due REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    is_synced INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_items (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    unit_price REAL NOT NULL,
    cost_price REAL NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    discount_amount REAL NOT NULL DEFAULT 0.0,
    subtotal_amount REAL NOT NULL
);

-- 8. PURCHASE ORDERS & ITEMS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT NOT NULL UNIQUE,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_date TEXT NOT NULL DEFAULT (datetime('now')),
    expected_date TEXT,
    received_date TEXT,
    total_amount REAL NOT NULL DEFAULT 0.0,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'ORDERED',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL,
    total_cost REAL NOT NULL
);

-- 9. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    expense_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('RENT', 'UTILITIES', 'PACKAGING', 'TRANSPORT', 'SALARIES', 'MARKETING', 'MISC')),
    amount REAL NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    date TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT NOT NULL,
    recorded_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    receipt_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
