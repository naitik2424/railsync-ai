# RailSync AI — Railway Maintenance Coordination & Downtime Optimization

**RailSync AI** is an AI-powered railway maintenance coordination and downtime optimization platform built for hackathon demonstration. It addresses avoidable railway line closures and maintenance delays across multi-disciplinary engineering divisions:

1. **Track** (Relaying, Tamping, Rail Grinding, Ultrasonic Flaw Detection)
2. **Electrical / OHE** (25kV Overhead Catenary, Power Block Inspections, Wire Tensioning)
3. **Signalling & Telecommunications (S&T)** (Point Machines, Electronic Interlocking Overhaul, Level Crossing Booms)
4. **Railway Operations** (Traffic Blocks, Single-Line Diversions)

Instead of relying on isolated departmental communication or static spreadsheets, RailSync AI combines **Scikit-Learn Random Forest Classification** to predict maintenance delays and **Google OR-Tools CP-SAT** to globally optimize shared maintenance windows and eliminate scheduling bottlenecks.

---

## 🏛️ Fixed System Architecture

```
                        ┌──────────────────────────────────────────────┐
                        │        React + Vite Frontend (Port 5173)     │
                        │   - TypeScript + Tailwind CSS + Recharts     │
                        │   - On-Demand Tab Loading & Debounced ML     │
                        └──────────────────────┬───────────────────────┘
                                               │ REST API
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │      Express.js Backend Server (Port 5000)   │
                        │   - Node.js + TypeScript                     │
                        │   - Zod Schema Validation                    │
                        │   - Prisma ORM + PostgreSQL                  │
                        │   - Graceful Offline Fallback Store          │
                        └──────────────┬───────────────────────────────┘
                                       │
                      ┌────────────────┴────────────────┐
                      │ Internal HTTP                   │ Database Connection
                      ▼                                 ▼
      ┌─────────────────────────────────┐   ┌──────────────────────────────┐
      │   Python AI/ML Service (8000)   │   │   PostgreSQL Database        │
      │   - FastAPI REST Microservice   │   │   - Prisma ORM (Port 5432)   │
      │   - Scikit-Learn Random Forest  │   │   - (with offline fallback)  │
      │   - Google OR-Tools CP-SAT      │   └──────────────────────────────┘
      │   - What-If Disruption Engine   │
      └─────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Component | Technology | Role |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React | Modern executive command center, Gantt timeline, coordination matrix, and What-If sandbox |
| **Main Backend** | Node.js, Express.js, TypeScript, Zod, Prisma ORM | Application API gateway, request validation, task lifecycle management, and alerting |
| **AI/ML Service** | Python 3.12, FastAPI, Scikit-learn, Google OR-Tools | Random Forest delay prediction pipeline and CP-SAT maintenance window scheduling optimizer |
| **Database** | PostgreSQL + Prisma ORM (with automatic offline fallback) | Structured persistent relational storage for tasks, dependencies, and operational logs |
| **Testing** | Vitest (Node.js) & Pytest (Python) | 26 automated unit and integration tests covering schemas, solvers, and endpoints |
| **Infrastructure** | Docker Compose | Multi-container composition for PostgreSQL, Express, Python ML, and Frontend |

---

## 🚄 Key Features & Usability Enhancements

### 1. Executive Operations Dashboard
- Real-time KPI summaries: Active tasks, pending vs. completed status, high-risk delays, and active cascade alerts.
- **Baseline vs. Optimized Maintenance Window Duration**: Direct graphical comparison showing hours of track closures saved.
- **Department-wise workload and risk distribution** with interactive Recharts visualizations.
- **High-Risk Watchlist**: Real-time delay probabilities and automated risk factors.

### 2. Maintenance Task Management (Grouped & Validated)
- Structured 5-stage form grouping in TaskModal:
  1. *Task Scope & Definition*
  2. *Operational Location & Department*
  3. *Timing, Priority & Crew Availability*
  4. *Scarce Equipment & Power Block Requirements*
  5. *Upstream Prerequisites & Dependencies*
- **Live In-Modal ML Delay Prediction**: Debounced at 400ms with `AbortController` cancellation so typing never floods the network and stale responses can never overwrite newer inputs.

### 3. ML Maintenance Delay Prediction
- **Model Architecture**: Scikit-Learn `Pipeline` utilizing `ColumnTransformer` (OneHotEncoder for categorical features, StandardScaler for numerical features) feeding a balanced `RandomForestClassifier`.
- **Target Leakage Prevention**: Features strictly encompass planned scheduling inputs; actual completion times are strictly excluded from inputs.
- **Evaluation**: Evaluated on holdout test splits against a `DummyClassifier` baseline (**ROC-AUC ~74.6%**, **F1-Score ~72.2%**, **Precision ~75.1%**).
- **Explanatory Factors**: Identifies key operational friction points (e.g., crew shortages, adverse weather, multi-task dependencies).

### 4. Maintenance Schedule Optimization (Google OR-Tools CP-SAT)
- Formulated as a Constraint Programming Satisfiability (CP-SAT) problem over a discrete time horizon.
- **Hard Constraints**:
  - **Task Precedence / Dependencies**: Upstream prerequisite tasks must complete before downstream tasks can start ($s_i \ge e_{dep}$).
  - **Scarce Equipment Mutual Exclusion**: Single-unit specialized equipment (e.g., *Tamping Machine 01*, *Tower Wagon TW-202*, *Ultrasonic Flaw Detector*) cannot be double-booked across tasks (`AddNoOverlap`).
  - **Crew Capacity**: Specialized gangs cannot execute concurrent overlapping tasks.
  - **Track Section Safety**: Incompatible tasks on the same track segment are strictly prohibited from overlapping.
  - **Window Bundling**: Compatible cross-department tasks are bundled into unified coordinated track possessions, saving up to 35-45% network downtime.

### 5. Cross-Department Coordination & Cascading Risk
- Shared multi-department matrix with upstream and downstream dependency tracing.
- **Dynamic Operational Alerts**: Real-time warnings generated when an upstream high-risk task threatens to cascade delays into downstream operations.

### 6. What-If Operational Disruption Simulation
- Guided 4-step workflow banner to test network resilience under unforeseen operational shocks (*Equipment Breakdown*, *Crew Shortage*, *Task Delay Spike*, *Monsoon Thunderstorms*).
- Re-runs ML delay inference, executes Google OR-Tools CP-SAT to generate a revised schedule, and explains automated mitigation actions.

---

## ⚡ Network Traffic Optimization (Landing Page & Frontend)

To eliminate unnecessary bandwidth consumption and redundant API traffic:
1. **On-Demand Per-Tab Data Fetching**: The landing page only requests `getDashboardSummary()`. It does **not** fetch unneeded Gantt schedules, full task tables, or coordination graphs until the user navigates to those views.
2. **In-Memory Tab Caching**: Switching back to a previously visited tab reuses stored state without firing redundant network requests.
3. **Explicit Invalidation**: Mutating tasks (create, edit, delete, reset) or executing simulations clears the cache and refreshes active views.
4. **400ms Debounced ML Prediction with Request Cancellation**: Replaced immediate keypress API calls with a 400ms debounce and `AbortController` cancellation in `TaskModal`.

---

## 🚀 Running the Project

### Option A: 1-Click Windows Launcher (Fastest)
Double-click:
```
d:\Aurix hackathon\start_all.bat
```
This automatically launches all 3 tiers:
1. Python AI/ML Service on `http://127.0.0.1:8000`
2. Express.js Main Backend on `http://localhost:5000`
3. React Frontend on `http://localhost:5173`

---

### Option B: Terminal Commands (Manual)

#### 1. Start Python AI/ML Service (Terminal 1)
```bash
python backend/run.py
```
*Runs on `http://127.0.0.1:8000` (Swagger docs at `/docs`)*

#### 2. Start Express Main Backend (Terminal 2)
```bash
cd server
npm run dev
```
*Runs on `http://localhost:5000` (Health check at `/health`)*

#### 3. Start React Frontend (Terminal 3)
```bash
cd frontend
npm run dev
```
*Runs on `http://localhost:5173`*

---

### Option C: Docker Compose (Full Stack)
```bash
docker compose up --build
```

---

## 🧪 Automated Testing

### Run Python ML & OR-Tools Tests (16 Tests):
```bash
python -m pytest backend/tests -v
```

### Run Node.js Express & Zod Tests (10 Tests):
```bash
cd server
npm test
```
*Total: 26 automated unit and integration tests passing with 100% success.*
