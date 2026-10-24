-- StockWise Phase 2 — PostgreSQL Database Schema
-- Operational Source of Truth for FMCG Distribution Intelligence & Optimization

-- 1. Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    capacity INTEGER DEFAULT 10000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stores
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users (Authenticated via Firebase Auth, RBAC resolved in PostgreSQL)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('DISTRIBUTION_MANAGER', 'WAREHOUSE', 'STORE_MANAGER')),
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Products Catalog
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'units',
    unit_cost NUMERIC(10, 2) DEFAULT 0,
    selling_price NUMERIC(10, 2) DEFAULT 0,
    min_safety_stock INTEGER DEFAULT 20,
    reorder_point INTEGER DEFAULT 50,
    shelf_life_days INTEGER DEFAULT 90,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inventory Positions (Warehouse & Store)
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('WAREHOUSE', 'STORE')),
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_product_warehouse UNIQUE (product_id, warehouse_id),
    CONSTRAINT uq_product_store UNIQUE (product_id, store_id)
);

-- 6. Batches with Shelf-Life & Expiry Tags (FEFO Engine)
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    manufacturing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Sales Records (Dated Point-of-Sale Demand History)
CREATE TABLE IF NOT EXISTS sales_records (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    revenue NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Operational Transfers Workflow
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id),
    source_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    destination_type VARCHAR(20) NOT NULL CHECK (destination_type IN ('STORE', 'WAREHOUSE')),
    destination_id INTEGER NOT NULL REFERENCES stores(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PICKED', 'PACKED', 'DISPATCHED', 'RECEIVED', 'CANCELLED', 'REJECTED')),
    notes TEXT,
    carrier VARCHAR(255),
    vehicle_number VARCHAR(100),
    created_by INTEGER REFERENCES users(id),
    dispatched_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Complete Decision History & Audit Events
CREATE TABLE IF NOT EXISTS approval_events (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Role-Based Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50),
    warehouse_id INTEGER REFERENCES warehouses(id),
    store_id INTEGER REFERENCES stores(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO',
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Data Import History & Telemetry Logs
CREATE TABLE IF NOT EXISTS data_imports (
    id SERIAL PRIMARY KEY,
    dataset_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    imported_by INTEGER REFERENCES users(id),
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    warning_rows INTEGER DEFAULT 0,
    row_results JSONB,
    column_mapping JSONB,
    status VARCHAR(50) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. AI / ML Recommendations (Optimized by PuLP / SciPy Solver)
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    source_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    destination_type VARCHAR(20) DEFAULT 'STORE',
    destination_id INTEGER NOT NULL REFERENCES stores(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
    transport_cost NUMERIC(10, 2) DEFAULT 0,
    expected_demand INTEGER DEFAULT 0,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EDITED')),
    approved_transfer_id INTEGER REFERENCES transfers(id),
    model_version VARCHAR(50) DEFAULT 'v2.1-ensemble',
    optimization_run_id VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Manager Override Feedback (Human-in-the-Loop Traceability)
CREATE TABLE IF NOT EXISTS manager_feedback (
    id SERIAL PRIMARY KEY,
    recommendation_id INTEGER REFERENCES ai_recommendations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('ACCEPTED', 'EDITED', 'REJECTED')),
    original_quantity INTEGER NOT NULL,
    edited_quantity INTEGER,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. ML Model Metadata & Evaluation Benchmarks
CREATE TABLE IF NOT EXISTS ml_models (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    training_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    training_range VARCHAR(100),
    features_used JSONB,
    validation_metrics JSONB,
    test_metrics JSONB,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Constrained Optimization Runs Audit
CREATE TABLE IF NOT EXISTS optimization_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(100) UNIQUE NOT NULL,
    run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_recommendations INTEGER DEFAULT 0,
    total_allocated_units INTEGER DEFAULT 0,
    stockout_mitigation NUMERIC(6, 2) DEFAULT 0,
    expiry_units_saved INTEGER DEFAULT 0,
    solver_status VARCHAR(50) DEFAULT 'OPTIMAL',
    execution_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Performance Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_inventory_product_loc ON inventory(product_id, location_type);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_store_prod ON sales_records(store_id, product_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_approval_events_transfer ON approval_events(transfer_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
