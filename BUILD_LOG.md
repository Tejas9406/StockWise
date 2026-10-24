# StockWise AI — Build Log

> Tracks every prompt, what was built, files created/modified, and the output/result.
> Updated after each session.

---

## Project Overview

**App Name:** StockWise AI
**Stack:** MERN (MongoDB, Express, React, Node.js)
**Frontend:** Vite + React + Tailwind CSS v3 + Framer Motion + Recharts
**Backend:** Express.js (ES Modules) + Mongoose + JWT Auth
**Purpose:** AI-powered FMCG Distribution Intelligence and Inventory Optimization platform

---

## Prompt 1 — Phase 1: Complete MERN Foundation & Three Role-Based Panels

### Request
Full Phase 1 build of StockWise AI:
- MERN project scaffold
- MongoDB models (11 schemas)
- Express REST API with JWT auth
- Three role-based React panels (Manager, Warehouse, Store)
- Tailwind CSS design system
- Seed database with demo data

### Environment Setup
| Action | Detail |
|--------|--------|
| Verified Node.js, npm, MongoDB | Node v24, npm v10, MongoDB running |
| Created /server and /client directories | Project scaffold |
| Initialized Vite React app | npx create-vite@latest client --template react |
| Installed server deps | express mongoose bcryptjs jsonwebtoken dotenv cors morgan |
| Installed client deps | react-router-dom axios lucide-react framer-motion recharts |
| Installed Tailwind CSS v3 | tailwindcss postcss autoprefixer |

### Server Files Created

#### Config & Middleware
| File | Purpose |
|------|---------|
| server/config/db.js | Mongoose connection with retry logging |
| server/middleware/authMiddleware.js | JWT authenticate + authorize(roles) guards |
| server/middleware/errorMiddleware.js | 404 notFound + global errorHandler |
| server/.env | PORT, MONGO_URI, JWT_SECRET, CLIENT_URL |
| server/server.js | Express app with CORS, routes, error handlers |

#### Mongoose Models (11 total)
| Model | Key Fields |
|-------|-----------|
| User.js | name, email, passwordHash, role enum, warehouseId/storeId refs |
| Warehouse.js | name, code (unique), location, address, isActive |
| Store.js | name, code (unique), location, address, isActive |
| Product.js | name, sku (unique/uppercase), category, unit, shelfLifeDays, minSafetyStock, reorderPoint |
| Inventory.js | productId, locationType (WAREHOUSE/STORE), warehouseId/storeId, quantity, reservedQuantity + availableQuantity virtual |
| Batch.js | productId, batchCode, quantity, expiryDate, locationType, warehouseId/storeId |
| SalesRecord.js | storeId, productId, quantity, date, unitPrice |
| Transfer.js | productId, sourceWarehouseId, destinationId (refPath), quantity, status (7-stage enum), timestamps |
| Recommendation.js | productId, sourceWarehouseId, destinationId, suggestedQty, rationale, status, estimatedTransitCost |
| Notification.js | userId, title, message, isRead, link |
| ApprovalEvent.js | transferId, userId, action, notes, timestamp |

#### Controllers & Routes (14 route modules)
| Route Prefix | Key Endpoints |
|-------------|--------------|
| /api/auth | POST /login, POST /register, GET /me |
| /api/users | GET /, GET /:id, PATCH /:id, DELETE /:id |
| /api/warehouses | CRUD |
| /api/stores | CRUD |
| /api/products | CRUD |
| /api/inventory | GET, PATCH quantity |
| /api/batches | CRUD, expiry filter |
| /api/sales | POST (record sale, decrements inventory) |
| /api/transfers | Full status workflow PENDING to RECEIVED |
| /api/recommendations | GET, POST approve/reject/edit |
| /api/manager | Dashboard, inventory, risk, forecast aggregates |
| /api/warehouse | Dashboard, inventory, pick list, dispatch |
| /api/store | Dashboard, inventory, sales, forecast, requirements, incoming |
| /api/notifications | GET, PATCH read, PATCH all-read |

### Frontend Files Created

#### Design System
| File | Purpose |
|------|---------|
| tailwind.config.js | Custom palette: brand (emerald), slate, deep blue |
| index.css | Tailwind directives + custom scrollbar |
| index.html | Google Fonts (Inter), meta tags, StockWise AI title |
| public/logo.svg | SVG brand logo (emerald, geometric) |

#### Core Infrastructure
| File | Purpose |
|------|---------|
| context/AuthContext.jsx | JWT auth state, login/logout/register, quickDemoLogin |
| context/NotificationContext.jsx | Polls /api/notifications every 30s, markAsRead/All |
| routes/ProtectedRoute.jsx | Role-gated Outlet, redirects to correct dashboard |
| layouts/DashboardLayout.jsx | Navbar + collapsible Sidebar + framer-motion page wrap |
| components/layout/Navbar.jsx | Search, notification popover, profile dropdown, demo role switcher |
| components/layout/Sidebar.jsx | Role-aware nav links, collapse state |
| services/api.js | Axios instance, JWT interceptor, 401 auto-redirect |

#### Common Components (11)
Badge, Button (6 variants 3 sizes isLoading), Card, EmptyState, ErrorState, Input, LoadingSpinner, Modal (framer-motion), Select, StatCard, Toast

#### Pages Created (24 total)

Landing (3): LandingPage, LoginPage (demo autofill), RegisterPage

Manager Panel (8):
- ManagerDashboard — 8 KPI stat cards, inventory bar chart, recent transfers table
- ManagerInventory — full product/inventory table, search/filter
- DemandForecast — per-product historical sales, Phase 2 placeholder
- RiskAlerts — stockout risks + expiry risks with severity badges
- Recommendations — AI recommendation cards, Approve/Reject/Edit modal
- Transfers — full transfer table with status tabs PENDING to RECEIVED
- DecisionHistory — approval event log with timeline
- ManagerProfile — user info display

Warehouse Panel (7):
- WarehouseDashboard — warehouse KPIs, capacity, pending approvals count
- WarehouseInventory — warehouse stock table with batch details
- ApprovedTransfers — approved transfers awaiting pick
- PickList — mark items as PICKED
- Dispatch — mark as PACKED then DISPATCHED with carrier/vehicle fields
- DispatchHistory — dispatched/received history log
- WarehouseProfile — user + warehouse info

Store Panel (8):
- StoreDashboard — 5 KPI cards, inbound shipment count, CTA buttons
- StoreInventory — store stock table with low-stock highlighting
- SalesHistory — sales log + record new sale form
- StoreDemandForecast — avg daily demand per product
- StockRequirement — deficit analysis (current vs reorder point)
- IncomingTransfers — pending/dispatched inbound list
- ReceiveStock — stub, completed in Prompt 2
- StoreProfile — stub, completed in Prompt 2

### Seed Data
| Entity | Count | Notes |
|--------|-------|-------|
| Warehouses | 2 | North Regional Hub, South Regional Hub |
| Stores | 3 | Metro Supermart Downtown, City Grocery, QuickMart Express |
| Products | 6 | Marie Gold Biscuits, Alphonso Mango Juice, Toned Milk, Sunflower Oil, Basmati Rice, Turmeric Powder |
| Users | 3 | 1 Manager, 1 Warehouse Staff, 1 Store Manager |
| Batches | ~12 | Mix of near-expiry and fresh batches |
| Inventory | ~12 | Per product per location |
| Sales Records | ~30 | 14 days of sales history per product |
| Transfers | 2 | 1 PENDING, 1 DISPATCHED |
| Recommendations | 2 | Both PENDING review |

### Output / Result
- FAIL: App not yet running — App.jsx was still default Vite boilerplate (router not wired)
- PASS: All backend files created and functional
- PASS: All frontend page components created

---

## Prompt 2 — "do" (Continue & Fix)

### Request
Continue from where Prompt 1 left off. App was not running due to missing router wiring.

### Files Modified

| File | Change | Reason |
|------|--------|--------|
| client/src/App.jsx | Full rewrite — replaced Vite boilerplate with complete React Router v6 tree (all 3 panels, lazy loading, providers) | App had no routing at all |
| client/src/main.jsx | Cleaned up imports | Minor hygiene |
| client/vite.config.js | Added /api proxy to http://localhost:5000 | API calls were failing without proxy |

### New Pages Created
| File | Purpose |
|------|---------|
| pages/store/ReceiveStock.jsx | Store manager confirms receipt of DISPATCHED shipments, calls confirmReceiveStock(transferId), updates inventory on confirm |
| pages/store/StoreProfile.jsx | Displays store manager account info + assigned store details from AuthContext |

### Backend Additions
| File | Change |
|------|--------|
| controllers/storePanelController.js | Added receiveStock POST handler — marks transfer RECEIVED, increments store Inventory, moves Batch ownership to store |
| controllers/storePanelController.js | Fixed getIncomingTransfers — wrapped response in { transfers } object, fixed populate field names |
| routes/storePanelRoutes.js | Added POST /receive/:transferId route, imported receiveStock |
| services/storeService.js | Added confirmReceiveStock(transferId) method — POST /store/receive/:transferId |

### Database Seeded
```
node utils/seed.js  =>  exit code 0
Purged old data and re-seeded all collections successfully.
```

### Output / Result
- PASS: Backend running on http://localhost:5000
- PASS: Frontend running on http://localhost:5173
- PASS: Landing page loads with StockWise AI branding
- PASS: Login page loads with one-click demo credential autofill buttons
- PASS: Manager Dashboard shows live seeded data (3,415 units, 2 warehouses, 3 stores, 6 products)
- PASS: AI Recommendations page shows 2 pending transfer recommendations with Approve/Reject/Edit actions
- PASS: Sidebar navigation with all role-specific links and active state highlighting
- PASS: Role badge in Navbar
- PASS: Notification bell with polling every 30s
- PASS: All 3 role panels fully routed and protected by ProtectedRoute

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Distribution Manager | manager@stockwise.ai | password123 |
| Warehouse Staff | warehouse1@stockwise.ai | password123 |
| Store Manager | store1@stockwise.ai | password123 |

---

## Running the App

```bash
# Terminal 1 - Backend
cd StockWise/server
node server.js          # runs on :5000

# Terminal 2 - Frontend
cd StockWise/client
npm run dev             # runs on :5173

# Re-seed database (optional, wipes and re-creates all data)
cd StockWise/server
node utils/seed.js
```

---

## Phase 2 — Advanced AIML Intelligence + Optimization + Firebase Auth + PostgreSQL (Completed)

### Summary
- Replaced MongoDB operational DB with PostgreSQL (15 relational tables with performance indexes and strict foreign key integrity).
- Integrated Firebase Authentication + Firebase Admin SDK for JWT verification & RBAC.
- Deployed Python FastAPI microservice (GradientBoosting ML forecasting + PuLP MILP constrained solver + FEFO expiry allocation).
- Developed AI Allocation Planner (Recommendations.jsx), Baseline vs AI Comparison (BaselineComparison.jsx), Demand Intelligence (DemandForecast.jsx), Risk Alerts (RiskAlerts.jsx), Data Health & CSV Import (DataHealth.jsx).

---

## Phase 3 — Decision Intelligence + What-If Simulation + Continuous Learning + Business Impact (Completed)

### Summary
- **What-If Scenario Simulation Engine**: Monte Carlo style supply/demand perturbations + PuLP MILP solver re-run with delta analysis (WhatIfSimulation.jsx).
- **Model Monitoring & Concept Drift Detection**: Rolling MAE, RMSE, WAPE drift vs baseline with severity tiers (NONE, LOW, MEDIUM, HIGH, CRITICAL) (ModelMonitoring.jsx).
- **Business Impact & ROI Dashboard**: Quantitative financial savings, stockout mitigation %, FEFO waste prevention, and heuristic vs AI comparison (BusinessImpact.jsx).
- **Closed-Loop Continuous Learning & Decision Outcomes Tracking**: Actual vs predicted accuracy, stockouts avoided, and logging modal for manager to submit actuals.
- **Intelligence Alerts & Action Center**: Proactive early-warning signals across stockout threats, expiring batches, and distribution imbalances (AlertCenter.jsx).
- **PostgreSQL Persistence**: scenarios and decision_outcomes relational tables with migration script (server/db/phase3_migration.sql).
- **Complete Verification**: Zero console errors, successful Vite production build in 4.48s, and browser subagent end-to-end verification.

---

*Last updated after Phase 3 Implementation & End-to-End Verification — 2026-10-25*
