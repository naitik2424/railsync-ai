# RailSync AI — Railway Maintenance Coordination & Downtime Optimization

**RailSync AI** is a railway maintenance coordination and downtime optimization platform built for hackathon demonstration. It addresses avoidable railway line closures and maintenance delays across multi-disciplinary engineering departments:

1. **Track** (Relaying, Tamping, Rail Grinding, Ultrasonic Flaw Detection)
2. **Electrical / OHE** (25kV Overhead Catenary, Power Block Inspections, Wire Tensioning)
3. **Signalling & Telecommunications (S&T)** (Point Machines, Electronic Interlocking Overhaul, Level Crossing Barriers)
4. **Railway Operations** (Traffic Blocks, Freight & Passenger Diversions)

Instead of relying on isolated departmental communication or static spreadsheets, RailSync AI combines **Scikit-Learn Random Forest Classification** to predict maintenance delays and **Google OR-Tools CP-SAT** to globally optimize shared maintenance windows and eliminate scheduling bottlenecks.

---

## 🚄 Key Features

### 1. Executive Operations Dashboard
- Real-time KPI summaries: Active tasks, pending vs. completed status, high-risk delays, and active cascade alerts.
- **Baseline vs. Optimized Maintenance Window Duration**: Direct graphical comparison showing hours of track closures saved.
- **Department-wise workload and risk distribution** with interactive Recharts visualizations.
- **High-Risk Watchlist**: Real-time delay probabilities and automated risk factors.

### 2. Maintenance Task Management
- Comprehensive asset maintenance lifecycle (Pending, In Progress, Completed, Blocked, Cancelled).
- Tracks critical operational variables: crew requirements, equipment mutual exclusion, 25kV power block prerequisites, and upstream/downstream task dependencies.
- **Live In-Modal ML Delay Prediction**: As tasks are drafted or edited, the Random Forest pipeline dynamically estimates delay probabilities in real-time.

### 3. ML Maintenance Delay Prediction
- **Model Architecture**: Scikit-Learn `Pipeline` utilizing `ColumnTransformer` (OneHotEncoder for categorical features, StandardScaler for numerical features) feeding a balanced `RandomForestClassifier`.
- **Target Leakage Prevention**: Features strictly encompass planned scheduling inputs (complexity, crew shortage ratio, weather, night shift, equipment age, and upstream dependency count); actual completion times are strictly excluded from inputs.
- **Evaluation**: Evaluated on holdout test splits against a `DummyClassifier` baseline across Precision, Recall, F1-Score, and ROC-AUC.
- **Explanatory Factors**: Identifies key operational friction points (e.g., crew shortages, adverse weather, multi-task dependencies).

### 4. Maintenance Schedule Optimization (Google OR-Tools CP-SAT)
- Formulated as a Constraint Programming Satisfiability (CP-SAT) problem over a discrete time horizon.
- **Hard Constraints**:
  - **Task Precedence / Dependencies**: Upstream prerequisite tasks must complete before downstream tasks can start ($s_i \ge e_{dep}$).
  - **Scarce Equipment Mutual Exclusion**: Single-unit specialized equipment (e.g., *Tamping Machine 01*, *Tower Wagon TW-202*, *Ultrasonic Flaw Detector*) cannot be double-booked across tasks (`AddNoOverlap`).
  - **Crew Capacity**: Specialized gangs cannot execute concurrent overlapping tasks.
  - **Track Section Safety**: Incompatible tasks on the same track segment are strictly prohibited from overlapping.
  - **Window Bundling**: Compatible cross-department tasks (e.g., Track Ultrasonic Testing and OHE Catenary Inspection on the same section during a traffic block) are bundled into unified coordinated track possessions, saving up to 35-45% network downtime.
  - **Infeasibility Reporting**: Detects circular dependency cycles or impossible resource contentions with clear diagnostic reporting.

### 5. Cross-Department Coordination & Cascading Risk
- Shared multi-department matrix with upstream and downstream dependency tracing.
- **Dynamic Operational Alerts**: Real-time warnings generated when an upstream high-risk task threatens to cascade delays into downstream operations.
- Identification of co-scheduling opportunities where Track and OHE or S&T can share planned track possessions.

### 6. What-If Operational Disruption Simulation
- Interactive simulator to test network resilience under unforeseen operational shocks:
  - *Equipment Breakdowns* (e.g., Tower Wagon hydraulic failure).
  - *Crew Shortages* (e.g., Emergency reassignment of signal engineers).
  - *Task Delay Spikes* (e.g., Deep rail base defect extending planned duration).
  - *Severe Weather Protocols* (e.g., Monsoon thunderstorms reducing execution velocity).
- Re-runs ML delay inference across the network, executes Google OR-Tools CP-SAT to generate a revised schedule, and explains automated mitigation actions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Uvicorn |
| **AI / ML** | Scikit-Learn, Pandas, NumPy, Joblib |
| **Optimization** | Google OR-Tools (CP-SAT Solver) |
| **Testing** | Pytest, FastAPI TestClient, HTTPX |

---

## 📁 Project Structure

```
Aurix hackathon/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application entrypoint & lifespan
│   │   ├── api/                        # REST API routers
│   │   │   ├── tasks.py                # Maintenance task CRUD
│   │   │   ├── predictions.py          # ML delay inference & training
│   │   │   ├── optimization.py         # Google OR-Tools CP-SAT scheduling
│   │   │   ├── simulation.py           # What-If disruption simulations
│   │   │   └── coordination.py         # Cross-department matrix & alerts
│   │   ├── ml/                         # Machine Learning pipeline
│   │   │   ├── synthetic_data.py       # Reproducible railway dataset generator
│   │   │   ├── pipeline.py             # ColumnTransformer + Random Forest
│   │   │   ├── train.py                # Training & test evaluation script
│   │   │   └── predict.py              # Real-time inference engine
│   │   ├── optimization/               # Scheduling solvers
│   │   │   ├── scheduler.py            # OR-Tools CP-SAT model & window bundler
│   │   │   └── baseline.py             # Siloed sequential baseline scheduler
│   │   ├── services/                   # Business logic services
│   │   │   ├── task_service.py         # Task storage & ML synchronization
│   │   │   ├── alert_service.py        # Dynamic cross-department alerts
│   │   │   └── simulation_service.py   # What-If impact simulation
│   │   ├── models/                     # Pydantic schemas and enums
│   │   └── core/                       # Paths and application configuration
│   ├── data/                           # CSV and JSON storage
│   ├── tests/                          # Automated unit and integration tests
│   ├── requirements.txt                # Python dependencies
│   └── run.py                          # Backend launcher
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx              # Command center header
│   │   │   ├── Sidebar.tsx             # Module navigation
│   │   │   ├── DashboardOverview.tsx   # Executive KPI dashboard & charts
│   │   │   ├── TaskTable.tsx           # Task management table & filters
│   │   │   ├── TaskModal.tsx           # Task creation modal with live ML preview
│   │   │   ├── ScheduleGantt.tsx       # Timeline Gantt & baseline comparison
│   │   │   ├── CrossDepartmentCoordination.tsx # Dependency matrix & alerts
│   │   │   ├── WhatIfSimulator.tsx     # Disruption scenario sandbox
│   │   │   ├── MLModelHealth.tsx       # Metrics, feature importance, tester
│   │   │   └── RiskBadge.tsx           # Categorical risk badges
│   │   ├── services/                   # Typed API service client
│   │   ├── types/                      # TypeScript domain definitions
│   │   ├── App.tsx                     # Top-level state and routing
│   │   └── index.css                   # Tailwind theme styling
│   ├── package.json
│   └── vite.config.ts
├── .env.example                        # Environment variable template
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js v18+ (tested on Node.js v22)
- npm v9+

---

### Step 1: Install Backend Dependencies

From the repository root:
```bash
pip install -r backend/requirements.txt
```

---

### Step 2: Run Tests

Validate the ML pipeline, OR-Tools CP-SAT constraints, and API endpoints:
```bash
python -m pytest backend/tests -v
```
*All 16 unit and integration tests will execute, verifying no-target-leakage, CP-SAT precedence, scarce equipment non-overlap, and API contracts.*

---

### Step 3: Start the FastAPI Backend

Run the server via `run.py` or uvicorn:
```bash
python backend/run.py
```
*The backend starts at `http://127.0.0.1:8000`.*
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

---

### Step 4: Install Frontend Dependencies & Start Dev Server

Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The React + Vite frontend starts at `http://localhost:5173`.*

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List maintenance tasks with optional `department` and `status` filters |
| `POST` | `/api/tasks` | Create task with immediate ML delay prediction |
| `PATCH` | `/api/tasks/{id}` | Update task details, status, duration, crew, or dependencies |
| `DELETE` | `/api/tasks/{id}` | Delete task and remove from downstream dependencies |
| `POST` | `/api/tasks/reset-sample-data` | Reset active tasks to initial 4-department sample dataset |
| `POST` | `/api/predictions/predict` | Predict delay probability, risk category, and top factors |
| `GET` | `/api/predictions/metrics` | Retrieve Random Forest evaluation metrics and feature importances |
| `POST` | `/api/predictions/train` | Retrain and re-evaluate Random Forest on historical data |
| `GET` | `/api/optimization/baseline` | Generate traditional siloed sequential baseline schedule |
| `GET` | `/api/optimization/optimized` | Generate Google OR-Tools CP-SAT coordinated schedule |
| `GET` | `/api/optimization/comparison` | Detailed comparative analytics (hours saved, bundling count) |
| `GET` | `/api/coordination/alerts` | Retrieve dynamic cross-department alerts & delay cascades |
| `GET` | `/api/coordination/dashboard-summary`| Executive KPI metrics for operations dashboard |
| `GET` | `/api/simulation/scenarios` | Retrieve preconfigured operational disruption scenarios |
| `POST` | `/api/simulation/run` | Execute what-if simulation with ML re-prediction & CP-SAT re-solve |

---

## 🔬 Operational Disclaimer

> **Hackathon Prototype Notice:** This system is an AI/ML prototype using deterministic synthetic operational data for demonstration purposes. It is **not** connected to live railway interlocking, CBTC, or train dispatch systems.
