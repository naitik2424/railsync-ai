# 🚄 RailSync AI — Railway Maintenance Coordination & Downtime Optimization

> **Hackathon Pitch in One Sentence:**  
> *RailSync AI is an AI-powered railway operations platform that predicts maintenance delay risks using Machine Learning and optimizes multi-department track possessions using Google OR-Tools CP-SAT constraint programming, cutting total track closure duration by 15.9%.*

---

## 📌 Executive Summary

### The Operational Problem
Modern railway networks operate on dense train timetables. To maintain safety, four engineering divisions require periodic physical track access:
1. **Track / Civil Engineering:** Rail replacement, ultrasonic flaw detection, ballast tamping.
2. **Electrical / OHE (Overhead Equipment):** 25kV catenary maintenance, power block inspections, wire tensioning.
3. **Signalling & Telecommunications (S&T):** Point machine motor calibration, electronic interlocking testing, level crossing boom servicing.
4. **Railway Operations (Operating Dept):** Traffic block management and single-line train diversions.

Traditionally, these departments communicate via phone calls, radios, or isolated logbooks. This causes two major operational failures:
* **Uncoordinated Track Closures:** Track takes a 3-hour closure in the morning; Electrical takes a separate 3-hour closure in the afternoon on the *same line*. Commercial trains are halted twice instead of once.
* **Cascading Delays:** When a track tamping machine breaks down or a crew arrives short-staffed, their 3-hour task stretches to 5 hours. Downstream S&T work is abruptly canceled, and passenger trains are delayed for hours across the division.

### How RailSync AI Solves This
* **Predictive Risk Assessment:** A Scikit-Learn **Random Forest Classifier** evaluates task complexity, equipment age, crew staffing ratios, and weather *before* shifts begin to flag high-risk tasks.
* **Algorithmic Window Bundling:** A **Google OR-Tools CP-SAT** constraint solver identifies mutually compatible tasks across departments and bundles them into **synchronized, shared track possession windows** with zero safety violations.

---

## ⚠️ Important Definitions (How to Read Metrics Correctly)

To ensure clear, credible, and trustworthy communication with hackathon judges:

| Term | What It Actually Means | What It Does NOT Mean |
|---|---|---|
| **Track Closure Window Hours** *(e.g., 31.5h Baseline vs 26.5h Optimized)* | The cumulative physical hours tracks are closed to commercial train traffic across all 5 sections. | **NOT** passenger train schedule delay. A 5-hour closure saving means tracks are free for train traffic 5 hours sooner. |
| **Overall Makespan** *(e.g., 18.5h Baseline vs 15.0h Optimized)* | The wall-clock elapsed time from shift start ($t=0$) until the final scheduled task completes. | Multiple track sections run in parallel; therefore, overall makespan is naturally shorter than total track closure hours. |
| **Delay Probability** *(e.g., 68% on TSK-TRK-103)* | A probabilistic statistical risk estimate based on historical complexity and crew shortages. | **NOT** a guaranteed certainty. It flags tasks requiring proactive supervision or standby crew. |
| **Operational Benchmark Demo Data** | 1,600 historical records and 9 active shift tasks generated using established railway physics and domain rules. | **NOT** live proprietary telemetry connected to live Indian Railways signaling interlocking. |

---

## 🏛️ Fixed System Architecture

```
                          ┌──────────────────────────────────────────────┐
                          │        React + Vite Frontend (Port 5173)     │
                          │   - TypeScript + Tailwind CSS + Recharts     │
                          │   - On-Demand Tab Loading & Debounced ML     │
                          └──────────────────────┬───────────────────────┘
                                                 │ REST API (JSON)
                                                 ▼
                          ┌──────────────────────────────────────────────┐
                          │      Express.js Backend Server (Port 5000)   │
                          │   - Node.js + TypeScript                     │
                          │   - Zod Schema Request Validation            │
                          │   - Cross-Department Alert Rules Engine      │
                          │   - Prisma ORM + PostgreSQL                  │
                          │   - Zero-Crash Local Storage Fallback        │
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

| Layer | Technologies | Role in System |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React | Single-page command center, Gantt timeline, coordination matrix, and What-If sandbox |
| **Main Backend** | Node.js, Express.js, TypeScript, Zod, Prisma ORM | API gateway, Zod contract validation, task lifecycle, and cross-department alert engine |
| **AI/ML Service** | Python 3.12, FastAPI, Scikit-learn, Google OR-Tools | Random Forest delay prediction pipeline and CP-SAT maintenance window scheduling optimizer |
| **Database** | PostgreSQL + Prisma ORM *(with automatic offline fallback)* | Persistent relational storage; falls back to local memory if PostgreSQL is offline |
| **Testing** | Vitest (Node.js) & Pytest (Python) | 26 automated unit and integration tests covering schemas, solvers, and endpoints |
| **Infrastructure** | Docker Compose | Multi-container composition for PostgreSQL, Express, Python ML, and Frontend |

---

## 📊 Dashboard KPI Traceability Map

Every single number displayed on the dashboard traces directly to an explicit calculation:

| Dashboard Metric | Displayed Value | Origin & Exact Calculation |
|---|---|---|
| **Active Tasks** | **9** *(7 pending, 1 in-progress, 1 completed)* | Seeded operational benchmark across 4 departments: 3 Track, 2 OHE, 3 S&T, 1 Operations. |
| **High-Risk Tasks** | **1** *(TSK-TRK-103)* | Tasks with Random Forest delay probability $\ge 0.60$. TSK-TRK-103 has $P = 0.68$ due to complexity (5/5), duration (5.5h), and 15% crew shortage. |
| **Average Delay Risk** | **32%** | Arithmetic mean of delay probabilities across all 9 active tasks: $\frac{\sum P_i}{9} \approx 0.32$. |
| **Downtime Saved** | **5.0h (-15.9%)** | Baseline Window Hours ($31.5\text{h}$) minus Optimized Window Hours ($26.5\text{h}$) $= 5.0\text{h}$ ($\frac{5.0}{31.5} \times 100 = 15.9\%$). |
| **Coordinated Blocks** | **1** *(WIN-OPT-01)* | Section A-1 bundles Track Flaw Testing (`TSK-TRK-101`, 3h) and OHE Insulator Cleaning (`TSK-OHE-201`, 3h) into one concurrent window. |
| **Baseline Window Hours** | **31.5h** | Sum of isolated task durations in siloed sequential operations ($3.0 + 3.0 + 2.5 + 4.0 + 5.0 + 5.5 + 3.0 + 3.5 + 2.0 = 31.5\text{h}$). |
| **Optimized Window Hours** | **26.5h** | Total track closure hours after OR-Tools CP-SAT window bundling. |
| **Makespan Comparison** | **18.5h Baseline $\rightarrow$ 15.0h Optimized** | Wall-clock span from shift start to final task completion across all parallel sections. |

---

## 🧠 The Two Core Intelligent Engines

### 1. Delay Prediction Engine (Scikit-Learn Random Forest)
* **Pipeline Architecture:** Scikit-Learn `Pipeline` with `ColumnTransformer` (OneHotEncoder for categorical features, StandardScaler for numerical features) feeding a `RandomForestClassifier`.
* **Zero Target Leakage:** Features strictly encompass pre-work scheduling inputs (`planned_duration_hours`, `complexity_score`, `crew_experience_level`, `crew_shortage_ratio`, `equipment_age_years`, `weather_condition`, `is_night_shift`, `dependency_count`). `actual_duration_hours` is **strictly excluded**.
* **Real Holdout Test Metrics (From `model_metrics.json`):**
  * **Accuracy:** `68.75%` (beats Dummy Baseline of `58.44%`)
  * **ROC-AUC:** `0.7460` (74.6% discriminatory power)
  * **Precision:** `75.14%`
  * **Recall:** `69.52%`
  * **F1-Score:** `0.7222`
* **Top Contributing Risk Features:** Planned duration ($13.1\%$), complexity score ($11.5\%$), equipment age ($9.4\%$), crew shortage ($9.0\%$), and clear weather baseline ($8.6\%$).

### 2. Schedule Optimizer Engine (Google OR-Tools CP-SAT)
* **Mathematical Formulation:** Discrete Constraint Programming Satisfiability over 30-minute ticks (`TICK_HOURS = 0.5`).
* **Hard Operational & Safety Constraints:**
  1. **Precedence / Prerequisites:** Downstream tasks start strictly after upstream tasks finish ($s_i \ge e_{dep}$).
  2. **Scarce Equipment Mutual Exclusion:** Specialized machinery (*Tamping Machine 01*, *Tower Wagon TW-202*) cannot be double-booked (`AddNoOverlap`).
  3. **Crew Capacity:** Designated specialized gangs cannot work concurrent tasks (`AddNoOverlap`).
  4. **Section Safety & Compatibility:** Tasks on the same track section cannot overlap unless mutually listed in `compatible_with_simultaneous_types`.
  5. **Acyclic Verification:** Graph traversal detects and reports circular dependencies before solver execution.
* **Objective Function:**
  $$\text{Minimize} \quad 10 \cdot \text{makespan} + \sum_{i} \text{priority\_weight}_i \cdot \text{end}_i$$
  Prioritizes critical passenger mainline clearance while compressing total network closure duration.

---

## 🎯 5-Minute Live Hackathon Demo Script

Follow this exact workflow during your presentation:

1. **Step 1: Executive Dashboard (`http://localhost:5173`)**
   - Point out the 4 KPI cards: 9 active tasks, 1 high-risk task, 5.0 hours of track closure saved (15.9% reduction).
   - Show the bar chart comparing **Total Track Closure Hours** (31.5h Baseline vs 26.5h Optimized) and explain the difference from **Overall Makespan** (18.5h vs 15.0h).
2. **Step 2: Schedule Optimizer Tab**
   - Navigate to **Schedule Optimizer**.
   - Show how `Section A-1 (Mainline North)` bundles Track Testing (`TSK-TRK-101`) and OHE Power Block Inspection (`TSK-OHE-201`) into one concurrent window (`WIN-OPT-01`), proving why 5 hours were saved.
3. **Step 3: Maintenance Tasks & Live ML Assessment**
   - Navigate to **Maintenance Tasks**, click **New Maintenance Task**.
   - Type a title, select *Track Relaying / Renewal*, move Crew Deficit to 40%, and check Night Shift.
   - Point out the live card on the right debouncing for 400ms and recalculating delay risk to **High/Critical**, citing crew shortage and night visibility.
4. **Step 4: Cross-Department Coordination Tab**
   - Show the **Operational Alerts Feed**.
   - Point out the **Cascade Risk Warning**: `TSK-TRK-103` has a 68% delay risk and holds downstream S&T task `TSK-SNT-302`.
5. **Step 5: What-If Disruption Simulator**
   - Select **"OHE Tower Wagon TW-202 Breakdown"** and click **"Execute Simulation"**.
   - Show the delta report: the system recalculates ML risk, re-runs OR-Tools CP-SAT to avoid gridlock, and displays a practical mitigation plan.

---

## ❓ 10 Likely Judge Questions & Simple Answers

1. **Q: Where did you get the training data?**  
   *A:* "Because live railway telemetry contains proprietary safety records, we built a domain-grounded synthetic generator based on published railway maintenance standards. It models realistic physical variables: crew shortages, equipment age, weather, and nighttime visibility."

2. **Q: How do you prevent data leakage in the ML model?**  
   *A:* "We enforce strict pre-execution filtering. Actual completion times and post-work outcomes are never passed into the model. Only features known before the work begins are used."

3. **Q: Why use Google OR-Tools CP-SAT instead of a simple greedy algorithm?**  
   *A:* "Railway operations have hard combinatorial constraints—task precedence, single-machine sharing, and section safety rules. Greedy algorithms get trapped in deadlocks. CP-SAT is a mathematical constraint programming solver that guarantees a conflict-free schedule."

4. **Q: Can two departments work on the same track section simultaneously without hazard?**  
   *A:* "Only when their maintenance types are mutually compatible. For example, our system permits ultrasonic flaw testing under an electrical power block, but strictly forbids ballast tamping through a junction while S&T is overhauling the switch point motor."

5. **Q: Does the ML model directly change task durations in the solver?**  
   *A:* "In this MVP, the ML model predicts delay probabilities for risk assessment and cascade alerts, while the solver schedules based on planned durations and precedence. In our What-If simulation engine, simulated disruptions directly feed into duration multipliers, which are then re-solved by OR-Tools."

6. **Q: What happens if two tasks have a circular dependency?**  
   *A:* "Before sending data to the solver, our algorithm runs an acyclic graph traversal (`has_cycle`). If a circular dependency is detected, it flags an infeasibility error explaining which tasks are in conflict, preventing solver deadlocks."

7. **Q: What database are you using?**  
   *A:* "We use PostgreSQL with Prisma ORM. Additionally, we implemented a zero-crash local storage fallback in Node.js so that if the application is run in an environment without a local PostgreSQL instance, it seamlessly runs on local data."

8. **Q: What is the difference between Makespan and Window Possession hours?**  
   *A:* "Window Possession hours represent the total duration tracks are closed to commercial trains across all sections. Makespan is the wall-clock time from shift start to the final task's completion. Multiple sections run in parallel, which is why makespan is shorter than total window hours."

9. **Q: How does the system handle an equipment breakdown during a shift?**  
   *A:* "Through our What-If disruption engine. The controller selects the broken asset, the engine marks it unavailable, recalculates delay probabilities across affected tasks, and re-runs CP-SAT to produce a revised schedule."

10. **Q: How would this integrate into a real railway division?**  
    *A:* "RailSync AI acts as an operational decision-support layer. It would ingest scheduled work orders from railway enterprise systems (like SAP PM or Indian Railways' TMS/COA) and output recommended block requests to the Section Controller for final digital authorization."

---

## 🚀 Running the Project

### Option A: 1-Click Windows Launcher (Recommended)
Double-click:
```bat
d:\Aurix hackathon\start_all.bat
```
This automatically starts:
1. Python AI/ML Microservice on `http://127.0.0.1:8000`
2. Express.js Main Backend on `http://localhost:5000`
3. React Frontend on `http://localhost:5173`

---

### Option B: Terminal Commands (Manual)

#### 1. Python AI/ML Service (Terminal 1)
```bash
python backend/run.py
```
*Runs on `http://127.0.0.1:8000` (Swagger docs at `/docs`)*

#### 2. Express Main Backend (Terminal 2)
```bash
cd server
npm run dev
```
*Runs on `http://localhost:5000` (Health check at `/health`)*

#### 3. React Frontend (Terminal 3)
```bash
cd frontend
npm run dev
```
*Runs on `http://localhost:5173`*

---

### Option C: Docker Compose
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
