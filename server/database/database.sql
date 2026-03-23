-- =====================================================
-- Repair Shop POS Database
-- Migration-safe schema (preserves existing data)
-- =====================================================

CREATE DATABASE IF NOT EXISTS repair_shop_db;
USE repair_shop_db;

-- =====================================================
-- STORES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS stores (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Staff') NOT NULL DEFAULT 'Staff',
    store_id VARCHAR(255) DEFAULT NULL,
    address VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    store_id VARCHAR(255) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    upc VARCHAR(100),
    category ENUM('Phone Screens','Batteries','Parts','Cases','Tempered Glass','Chargers','Other') NOT NULL DEFAULT 'Other',
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL DEFAULT 0,
    supplier VARCHAR(255) DEFAULT '',
    type ENUM('repair','accessory') NOT NULL DEFAULT 'accessory',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(255) PRIMARY KEY,
    store_id VARCHAR(255) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(255) PRIMARY KEY,
    store_id VARCHAR(255) DEFAULT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(255) DEFAULT NULL,
    customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    gst DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('paid','pending','cancelled') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash','card','eftpos') DEFAULT 'cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- =====================================================
-- INVOICE ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(255) PRIMARY KEY,
    invoice_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================
-- REPAIRS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS repairs (
    id VARCHAR(255) PRIMARY KEY,
    store_id VARCHAR(255) DEFAULT NULL,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(255) DEFAULT NULL,
    customer_name VARCHAR(255) DEFAULT '',
    device_type ENUM('Phone','Tablet','Laptop') NOT NULL DEFAULT 'Phone',
    device_model VARCHAR(255) DEFAULT '',
    issue_description TEXT,
    labor_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- =====================================================
-- REPAIR PARTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS repair_parts (
    id VARCHAR(255) PRIMARY KEY,
    repair_id VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================
-- INVOICE SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_settings (
    id VARCHAR(255) PRIMARY KEY,
    store_id VARCHAR(255) UNIQUE NOT NULL,
    business_name VARCHAR(255) DEFAULT '',
    logo_url VARCHAR(500) DEFAULT '',
    address VARCHAR(500) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    abn_number VARCHAR(50) DEFAULT '',
    policy_text TEXT DEFAULT 'No returns or refunds on repaired devices. Parts come with 30-day warranty. Data loss is not covered.',
    default_payment_method ENUM('cash','card','eftpos') DEFAULT 'cash',
    tax_rate DECIMAL(5,2) DEFAULT 10.00,
    closing_message VARCHAR(500) DEFAULT 'Thank you for your business!',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- =====================================================
-- SEED DATA: STORES (INSERT IGNORE preserves existing)
-- =====================================================
INSERT IGNORE INTO stores (id, name, address, phone, email, is_active) VALUES
('store1', 'Phonefix Sydney', '123 George Street, Sydney NSW 2000', '02 9123 4567', 'sydney@phonefix.com', TRUE),
('store2', 'Phonefix Melbourne', '456 Collins Street, Melbourne VIC 3000', '03 9876 5432', 'melbourne@phonefix.com', TRUE),
('store3', 'Phonefix Brisbane', '789 Queen Street, Brisbane QLD 4000', '07 3456 7890', 'brisbane@phonefix.com', TRUE);

-- =====================================================
-- SEED DATA: INVOICE SETTINGS (INSERT IGNORE preserves existing)
-- =====================================================
INSERT IGNORE INTO invoice_settings (id, store_id, business_name, address, phone, abn_number, policy_text, default_payment_method, tax_rate, closing_message) VALUES
('is1', 'store1', 'Phonefix Sydney', '123 George Street, Sydney NSW 2000', '02 9123 4567', '12 345 678 901', 'No returns or refunds on repaired devices. Parts come with 30-day warranty. Data loss is not covered.', 'cash', 10.00, 'Thank you for your business!'),
('is2', 'store2', 'Phonefix Melbourne', '456 Collins Street, Melbourne VIC 3000', '03 9876 5432', '98 765 432 109', 'No returns or refunds on repaired devices. Parts come with 30-day warranty. Data loss is not covered.', 'card', 10.00, 'Thank you for choosing Phonefix!'),
('is3', 'store3', 'Phonefix Brisbane', '789 Queen Street, Brisbane QLD 4000', '07 3456 7890', '56 789 012 345', 'No returns or refunds on repaired devices. Parts come with 30-day warranty. Data loss is not covered.', 'cash', 10.00, 'Thank you for your business!');

-- =====================================================
-- SEED DATA: USERS (INSERT IGNORE preserves existing)
-- =====================================================
INSERT IGNORE INTO users (id, name, email, password_hash, role, store_id) VALUES
('u1', 'Alex Admin', 'admin@repairpos.com', '$2b$10$EOCL7hQKYw/m/7EcMTLIJ..9fEBNAUcnMSgZO4Sf3mOCMNnYjBtM2', 'Admin', NULL),
('u2', 'John Staff', 'john@repairpos.com', '$2b$10$MO3Wk9URaznoQdK58ByWUO9WU5XQYU3ZA/HR4CS6UodkPhS4X8GIm', 'Staff', 'store1'),
('u3', 'Mary Staff', 'mary@repairpos.com', '$2b$10$MO3Wk9URaznoQdK58ByWUO9WU5XQYU3ZA/HR4CS6UodkPhS4X8GIm', 'Staff', 'store2');

-- =====================================================
-- SEED DATA: PRODUCTS (INSERT IGNORE preserves existing)
-- =====================================================
INSERT IGNORE INTO products (id, store_id, name, sku, upc, category, cost_price, selling_price, quantity, supplier, type) VALUES
('p1s1', 'store1', 'iPhone 14 Screen (OLED)', 'SCR-IP14-001', '123456789001', 'Phone Screens', 45.00, 89.99, 12, 'TechParts AU', 'repair'),
('p2s1', 'store1', 'Samsung S23 Screen', 'SCR-SS23-001', '123456789002', 'Phone Screens', 38.00, 74.99, 8, 'TechParts AU', 'repair'),
('p3s1', 'store1', 'iPhone 13 Battery', 'BAT-IP13-001', '123456789003', 'Batteries', 12.00, 29.99, 25, 'BatteryWorld', 'repair'),
('p4s1', 'store1', 'iPhone 15 Pro Case (Clear)', 'ACC-IP15P-CLR', '223456789001', 'Cases', 3.00, 14.99, 30, 'AccessoryHub', 'accessory'),
('p5s1', 'store1', 'USB-C 65W Fast Charger', 'ACC-CHG-65W', '223456789005', 'Chargers', 8.00, 29.99, 22, 'PowerTech AU', 'accessory'),
('p1s2', 'store2', 'iPhone 15 Screen (OLED)', 'SCR-IP15-001', '123456789010', 'Phone Screens', 55.00, 109.99, 15, 'TechParts AU', 'repair'),
('p2s2', 'store2', 'Samsung S24 Screen', 'SCR-SS24-001', '123456789011', 'Phone Screens', 42.00, 84.99, 10, 'TechParts AU', 'repair'),
('p3s2', 'store2', 'iPhone 14 Battery', 'BAT-IP14-001', '123456789012', 'Batteries', 14.00, 34.99, 20, 'BatteryWorld', 'repair'),
('p4s2', 'store2', 'MagSafe Wireless Charger', 'ACC-CHG-MAG', '223456789006', 'Chargers', 12.00, 39.99, 18, 'PowerTech AU', 'accessory'),
('p1s3', 'store3', 'iPhone 14 Pro Screen', 'SCR-IP14P-001', '123456789020', 'Phone Screens', 65.00, 129.99, 8, 'TechParts AU', 'repair'),
('p2s3', 'store3', 'Samsung A54 Battery', 'BAT-SSA54-001', '123456789004', 'Batteries', 10.00, 24.99, 15, 'BatteryWorld', 'repair'),
('p3s3', 'store3', 'Tempered Glass Pack', 'ACC-TG-PACK', '223456789020', 'Tempered Glass', 2.50, 12.99, 50, 'ScreenGuard AU', 'accessory');

-- =====================================================
-- SEED DATA: CUSTOMERS (INSERT IGNORE preserves existing)
-- =====================================================
INSERT IGNORE INTO customers (id, store_id, name, phone, email) VALUES
('c1s1', 'store1', 'John Smith', '0412 345 678', 'john.smith@email.com'),
('c2s1', 'store1', 'Emily Chen', '0423 456 789', 'emily.chen@email.com'),
('c1s2', 'store2', 'David Wilson', '0444 555 666', 'david.wilson@email.com'),
('c2s2', 'store2', 'Lisa Brown', '0455 666 777', 'lisa.brown@email.com');

-- =====================================================
-- INDEXES (CREATE IF NOT EXISTS for safety)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_invoices_store_id ON invoices(store_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_repairs_store_id ON repairs(store_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs(status);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- SCHEMA MIGRATIONS (Add missing columns if needed)
-- =====================================================
-- Add cost_price to invoice_items if missing (for existing databases)
SET @dbname = DATABASE();
SET @tablename = 'invoice_items';
SET @columnname = 'cost_price';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = @tablename
        AND COLUMN_NAME = @columnname
    ) > 0,
    'SELECT 1',
    'ALTER TABLE invoice_items ADD COLUMN cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER unit_price'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
