# StockWise — FMCG Distribution Intelligence & Inventory Optimization
> **Enterprise Multi-Echelon Inventory Replenishment & Resilient Distribution Platform**  
> Built with React 18, Vite, Node.js/Express, PostgreSQL, and Python FastAPI.

---

## Project Trackers
- `SW/Project_Tracker.md` — application, frontend/backend, database, API, security, integrations, testing, and deployment.
- `AIML/Project_Tracker.md` — data quality, forecasting, inventory risk, replenishment, allocation optimization, expiry logic, evaluation, and model reliability.

---

## 1. Project Overview

Fast-Moving Consumer Goods (FMCG) distribution networks suffer from severe inventory imbalances: retail store stockouts on high-velocity items, expensive holding surplus on slow movers, and inventory write-offs caused by near-expiry batches.

**StockWise** resolves this with an auditable, decision-support platform that connects sales telemetry, demand forecasting, usable on-hand stock calculations, and **First-Expiry, First-Out (FEFO)** batch allocation into a unified approval-to-dispatch workflow.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express.js (Modular ES Modules)
- **Database**: PostgreSQL (Neon Cloud) with row-level locks
- **AIML Service**: Python FastAPI with PuLP MILP solver & GradientBoosting forecasting
- **Authentication**: Firebase Auth with JWT and Role-Based Access Control (RBAC)

```text
[ React / Vite Frontend ]
        │  (Axios REST API with JWT Auth)
        ▼
[ Node.js / Express Backend ]
   ├── Authentication & RBAC Middleware
   ├── CSV Import & Validation Engine
   ├── Forecast Service (Moving Average Baseline & Held-Out WAPE)
   ├── Replenishment & Usable Stock Engine
   ├── FEFO Allocation & Feasibility Constraints
   └── Transfer & Approval Event Audit Trail
        │  (PostgreSQL Database)
        ▼
[ PostgreSQL / Neon Cloud Database ]
   ├── Users, Products, Warehouses, Stores
   ├── Batches (Shelf life & Expiry)
   ├── Inventories (Total, Reserved, Available)
   ├── SalesRecords (Dated POS history)
   ├── Recommendations & Transfers
   ├── ApprovalEvents (Full decision lineage)
   └── DataImports (Audit logs & row status)
```

---

## 3. Disruption & Contingency Module (`apps/`)

StockWise includes a dedicated Pre-Mortem Dispatch & Disruption Lab:
- **Routes:** `/` landing · `/login` · `/dashboard` · `/datasets` · `/planner` · `/disruption` · `/recovery` · `/compare` · `/exports`
- **Contingency lanes:** Routes flagged `backup=true` are excluded from baseline planning and become available during recovery at premium cost.
- **Solvers:** Greedy engine fallback with optional OR-Tools integer programming.
