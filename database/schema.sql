-- ==============================================================================
-- DATABASE SCHEMA: AL-AFHHIHRAM HOUSE POS & INVENTORY MANAGEMENT SYSTEM
-- Target: PostgreSQL 14+ / 16+
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'CASHIER');
CREATE TYPE movement_type AS ENUM (
    'STOCK_IN_PO',
    'STOCK_OUT_SALE',
    'STOCK_OUT_DAMAGE',
    'STOCK_OUT_RETURN',
    'MANUAL_ADJUSTMENT'
);
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'MOBILE_WALLET', 'SPLIT', 'BANK_TRANSFER');
CREATE TYPE transaction_status AS ENUM ('COMPLETED', 'REFUNDED', 'VOID');
CREATE TYPE shift_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE po_status AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');
CREATE TYPE expense_category AS ENUM (
    'RENT',
    'UTILITIES',
    'PACKAGING',
    'TRANSPORT',
    'SALARIES',
    'MARKETING',
    'MISC'
);

-- ------------------------------------------------------------------------------
-- 1. USERS & RBAC TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'CASHIER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS CATALOG TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (min_stock_threshold >= 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    size VARCHAR(30),
    color VARCHAR(30),
    brand VARCHAR(100),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- ------------------------------------------------------------------------------
-- 4. STOCK MOVEMENTS (AUDIT TRAIL)
-- ------------------------------------------------------------------------------
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    movement_type movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id VARCHAR(100), -- PO number or Invoice number
    reference_type VARCHAR(50), -- 'SALE', 'PO', 'DAMAGE', 'MANUAL'
    notes TEXT,
    performed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);

-- ------------------------------------------------------------------------------
-- 5. SUPPLIERS & VENDOR LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(100),
    debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Paid to vendor
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Invoiced by vendor
    running_balance NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_ledger_supplier ON supplier_ledger_entries(supplier_id);

-- ------------------------------------------------------------------------------
-- 6. CASHIER SHIFTS & Z-REPORTS (CASH DRAWER RECONCILIATION)
-- ------------------------------------------------------------------------------
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shift_number SERIAL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_cash NUMERIC(12, 2),
    system_expected_cash NUMERIC(12, 2),
    cash_difference NUMERIC(12, 2), -- Over or Short
    total_sales_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    status shift_status NOT NULL DEFAULT 'OPEN',
    notes TEXT
);

CREATE INDEX idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX idx_shifts_status ON shifts(status);

-- ------------------------------------------------------------------------------
-- 7. SALES TRANSACTIONS & INVOICES
-- ------------------------------------------------------------------------------
CREATE TABLE sales_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    client_transaction_id VARCHAR(100) UNIQUE, -- Idempotency key for offline queue
    cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    customer_name VARCHAR(100) DEFAULT 'Walk-in Customer',
    customer_phone VARCHAR(30),
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_type VARCHAR(20), -- 'PERCENTAGE', 'FIXED', NULL
    discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1500, -- 15% VAT
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    amount_tendered NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    change_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status transaction_status NOT NULL DEFAULT 'COMPLETED',
    is_synced BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_invoice_number ON sales_transactions(invoice_number);
CREATE INDEX idx_sales_cashier ON sales_transactions(cashier_id);
CREATE INDEX idx_sales_created ON sales_transactions(created_at);
CREATE INDEX idx_sales_client_id ON sales_transactions(client_transaction_id);

CREATE TABLE sales_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL, -- Recorded at time of sale for exact COGS calculation
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal_amount NUMERIC(12, 2) NOT NULL
);

CREATE INDEX idx_sales_items_transaction ON sales_items(transaction_id);
CREATE INDEX idx_sales_items_product ON sales_items(product_id);

-- ------------------------------------------------------------------------------
-- 8. PURCHASE ORDERS & PURCHASING
-- ------------------------------------------------------------------------------
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    order_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_date TIMESTAMPTZ,
    received_date TIMESTAMPTZ,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status po_status NOT NULL DEFAULT 'ORDERED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL
);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_poi_order ON purchase_order_items(purchase_order_id);

-- ------------------------------------------------------------------------------
-- 9. EXPENSES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(50) NOT NULL UNIQUE,
    category expense_category NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    recorded_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(date);

-- ------------------------------------------------------------------------------
-- TRIGGERS FOR AUTO UPDATING updated_at
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_timestamp();
