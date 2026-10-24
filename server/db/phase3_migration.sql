-- ═══════════════════════════════════════════════════════════════════
-- StockWise Phase 3 — PostgreSQL Migration
-- Decision Intelligence + What-If Simulation + Continuous Learning
-- ═══════════════════════════════════════════════════════════════════

-- 1. Scenarios table: stores What-If simulation runs
CREATE TABLE IF NOT EXISTS scenarios (
    id SERIAL PRIMARY KEY,
    scenario_name VARCHAR(255) NOT NULL DEFAULT 'Custom Scenario',
    description TEXT DEFAULT '',
    parameters JSONB NOT NULL DEFAULT '[]',
    baseline_result JSONB DEFAULT '{}',
    scenario_result JSONB DEFAULT '{}',
    delta JSONB DEFAULT '{}',
    risk_assessment TEXT DEFAULT '',
    recommendation TEXT DEFAULT '',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Decision Outcomes table: tracks actual vs predicted for continuous learning
CREATE TABLE IF NOT EXISTS decision_outcomes (
    id SERIAL PRIMARY KEY,
    recommendation_id INTEGER REFERENCES ai_recommendations(id),
    predicted_quantity NUMERIC(12,2) DEFAULT 0,
    actual_quantity NUMERIC(12,2) DEFAULT 0,
    accuracy_pct NUMERIC(6,2) DEFAULT 0,
    stockout_occurred BOOLEAN DEFAULT false,
    expiry_waste_units NUMERIC(12,2) DEFAULT 0,
    notes TEXT DEFAULT '',
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON scenarios(created_by);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_rec_id ON decision_outcomes(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_decision_outcomes_created_at ON decision_outcomes(created_at DESC);
