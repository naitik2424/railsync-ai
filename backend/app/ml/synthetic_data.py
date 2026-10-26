import numpy as np
import pandas as pd
from typing import List, Dict, Any
from pathlib import Path
from backend.app.core.config import HISTORICAL_DATA_CSV, ACTIVE_TASKS_FILE


DEPARTMENTS = [
    "Track",
    "Electrical / OHE",
    "Signalling & Telecommunications (S&T)",
    "Railway Operations"
]

MAINTENANCE_TYPES = {
    "Track": [
        "Track Relaying / Renewal",
        "Ballast Tamping",
        "Rail Grinding & Ultrasonic Testing"
    ],
    "Electrical / OHE": [
        "OHE Power Block Inspection",
        "Overhead Wire Tensioning"
    ],
    "Signalling & Telecommunications (S&T)": [
        "Point Machine Maintenance",
        "Signal Interlocking Overhaul",
        "Level Crossing S&T Servicing"
    ],
    "Railway Operations": [
        "Traffic Block Coordination"
    ]
}

SECTIONS = [
    "Section A-1 (Mainline North)",
    "Section A-2 (Junction Yard)",
    "Section B-1 (Suburban Corridor)",
    "Section B-2 (Freight Loop)",
    "Section C-1 (Terminal Approaches)"
]

WEATHER_CONDITIONS = ["Clear", "Rain", "Fog", "Severe Heat"]

CREW_TYPES = {
    "Track": ["Track Gang Alpha", "Track Gang Beta", "Tamping Specialist Unit"],
    "Electrical / OHE": ["OHE Line Crew 1", "Tower Wagon Team TW-2", "Catenary Maintenance Unit"],
    "Signalling & Telecommunications (S&T)": ["Signal Engineers Group A", "S&T Telecom Squad", "Interlocking Systems Techs"],
    "Railway Operations": ["Traffic Controllers Unit", "Yard Marshalling Ops"]
}

EQUIPMENT_TYPES = {
    "Track": ["Tamping Machine 01", "Rail Grinder RG-09", "Ultrasonic Flaw Detector UFD-4", "Ballast Regulator BR-3"],
    "Electrical / OHE": ["Tower Wagon TW-202", "Catenary Tensioning Rig CR-11", "High-Voltage Grounding Kits"],
    "Signalling & Telecommunications (S&T)": ["Interlocking Test Kit ITK-3", "Point Machine Drive Calibrator", "Optical Fiber Splicer"],
    "Railway Operations": ["Signalling Control Console Sim", "Portable Radio Trunking Units"]
}


def generate_historical_dataset(num_records: int = 1600, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates realistic historical railway maintenance data for ML delay prediction.
    Features and delay probability follow grounded physical and operational constraints:
    - Night shifts + bad weather increase delay probability.
    - Crew shortages and aging specialized equipment cause delays.
    - Cascading dependencies increase coordination delays.
    - Track renewal and signal interlocking are naturally higher complexity.
    """
    np.random.seed(random_seed)
    
    records = []
    
    for i in range(num_records):
        dept = np.random.choice(DEPARTMENTS, p=[0.35, 0.25, 0.25, 0.15])
        m_type = np.random.choice(MAINTENANCE_TYPES[dept])
        section = np.random.choice(SECTIONS)
        
        # Base duration distribution by maintenance type
        if "Relaying" in m_type:
            planned_hours = round(np.random.uniform(4.5, 8.0), 1)
            base_complexity = np.random.choice([4, 5], p=[0.4, 0.6])
        elif "Interlocking" in m_type:
            planned_hours = round(np.random.uniform(3.5, 6.5), 1)
            base_complexity = np.random.choice([4, 5], p=[0.5, 0.5])
        elif "Tamping" in m_type:
            planned_hours = round(np.random.uniform(2.5, 4.5), 1)
            base_complexity = np.random.choice([2, 3, 4], p=[0.3, 0.5, 0.2])
        elif "OHE Power Block" in m_type:
            planned_hours = round(np.random.uniform(2.0, 4.0), 1)
            base_complexity = np.random.choice([3, 4], p=[0.6, 0.4])
        else:
            planned_hours = round(np.random.uniform(1.5, 3.5), 1)
            base_complexity = np.random.choice([1, 2, 3], p=[0.4, 0.4, 0.2])
            
        crew_experience = np.random.choice([1, 2, 3], p=[0.25, 0.50, 0.25])
        crew_size = int(np.random.randint(3, 8))
        crew_shortage_ratio = round(float(np.random.choice([0.0, 0.0, 0.15, 0.30, 0.45], p=[0.45, 0.25, 0.15, 0.10, 0.05])), 2)
        equipment_age = int(np.random.randint(1, 15))
        weather = np.random.choice(WEATHER_CONDITIONS, p=[0.65, 0.18, 0.10, 0.07])
        is_night = int(np.random.choice([0, 1], p=[0.55, 0.45]))
        dependencies_count = int(np.random.choice([0, 1, 2, 3], p=[0.50, 0.30, 0.15, 0.05]))
        
        # Section historical delay tendency
        section_rate_map = {
            "Section A-1 (Mainline North)": 0.22,
            "Section A-2 (Junction Yard)": 0.38,
            "Section B-1 (Suburban Corridor)": 0.30,
            "Section B-2 (Freight Loop)": 0.24,
            "Section C-1 (Terminal Approaches)": 0.35,
        }
        hist_delay_rate = section_rate_map[section]
        
        # Compute realistic delay logit
        # Operational principles:
        # 1. High complexity + low experience = risk multiplier
        # 2. Crew shortage directly causes extension of planned tasks
        # 3. Night shift + rain/fog severely limits visual checks
        # 4. Equipment > 9 years old has 2.5x breakdown risk
        # 5. Cascading dependencies multiply bottleneck risks
        
        logit = -2.0  # Base intercept
        logit += (base_complexity - 2.5) * 0.65
        logit += (3 - crew_experience) * 0.45
        logit += crew_shortage_ratio * 4.0
        logit += (equipment_age / 10.0) * 0.70
        logit += dependencies_count * 0.55
        logit += (hist_delay_rate - 0.28) * 2.5
        
        if weather in ["Rain", "Fog"]:
            logit += 1.10
        elif weather == "Severe Heat":
            logit += 0.50
            
        if is_night:
            logit += 0.50
            if weather in ["Rain", "Fog"]:
                logit += 0.60  # interaction term
                
        # Convert logit to probability
        delay_prob = 1.0 / (1.0 + np.exp(-logit))
        is_delayed = 1 if np.random.uniform(0, 1) < delay_prob else 0
        
        # Calculate actual duration realistically (WITHOUT leaking into features)
        if is_delayed:
            overrun_factor = np.random.uniform(1.20, 1.85)
            actual_duration = round(planned_hours * overrun_factor, 1)
        else:
            underrun_factor = np.random.uniform(0.85, 1.05)
            actual_duration = round(min(planned_hours * underrun_factor, planned_hours + 0.1), 1)
            
        records.append({
            "task_id": f"HIST-TSK-{i+1:04d}",
            "department": dept,
            "maintenance_type": m_type,
            "section": section,
            "planned_duration_hours": planned_hours,
            "complexity_score": base_complexity,
            "crew_experience_level": crew_experience,
            "crew_size_allocated": crew_size,
            "crew_shortage_ratio": crew_shortage_ratio,
            "equipment_age_years": equipment_age,
            "weather_condition": weather,
            "is_night_shift": is_night,
            "dependency_count": dependencies_count,
            "historical_section_delay_rate": hist_delay_rate,
            "actual_duration_hours": actual_duration,
            "is_delayed": is_delayed
        })
        
    df = pd.DataFrame(records)
    return df


def generate_active_tasks() -> List[Dict[str, Any]]:
    """
    Generates realistic active maintenance tasks across all 4 railway departments.
    These represent pending and in-progress tasks awaiting coordination & scheduling.
    """
    tasks = [
        {
            "id": "TSK-TRK-101",
            "title": "Mainline Rail Ultrasonic Testing & Joint Tightening",
            "description": "Continuous flaw detection testing on Section A-1 North track segment, followed by fishplate joint torque verification.",
            "department": "Track",
            "section": "Section A-1 (Mainline North)",
            "maintenance_type": "Rail Grinding & Ultrasonic Testing",
            "planned_duration_hours": 3.0,
            "priority": "High",
            "status": "Pending",
            "resources": {
                "crew_type": "Track Gang Alpha",
                "crew_size": 5,
                "equipment": ["Ultrasonic Flaw Detector UFD-4"],
                "power_block_required": False,
                "speed_restriction_kmh": 40
            },
            "crew_availability_ratio": 1.0,
            "equipment_available": True,
            "dependencies": [],
            "compatible_with_simultaneous_types": [
                "OHE Power Block Inspection",
                "Level Crossing S&T Servicing"
            ],
            "planned_start_offset_hours": 0.0
        },
        {
            "id": "TSK-OHE-201",
            "title": "25kV Catenary Insulator Cleaning & Mast Grounding",
            "description": "Routine high-voltage insulator washing and grounding inspection on Section A-1 overhead equipment.",
            "department": "Electrical / OHE",
            "section": "Section A-1 (Mainline North)",
            "maintenance_type": "OHE Power Block Inspection",
            "planned_duration_hours": 3.0,
            "priority": "Medium",
            "status": "Pending",
            "resources": {
                "crew_type": "OHE Line Crew 1",
                "crew_size": 4,
                "equipment": ["Tower Wagon TW-202", "High-Voltage Grounding Kits"],
                "power_block_required": True,
                "speed_restriction_kmh": None
            },
            "crew_availability_ratio": 1.0,
            "equipment_available": True,
            "dependencies": [],
            "compatible_with_simultaneous_types": [
                "Rail Grinding & Ultrasonic Testing",
                "Level Crossing S&T Servicing"
            ],
            "planned_start_offset_hours": 0.0
        },
        {
            "id": "TSK-SNT-301",
            "title": "Point Machine 44B Overhaul & Lubrication",
            "description": "Mechanical inspection, stroke calibration, and contact cleansing on facing crossover point machine.",
            "department": "Signalling & Telecommunications (S&T)",
            "section": "Section A-2 (Junction Yard)",
            "maintenance_type": "Point Machine Maintenance",
            "planned_duration_hours": 2.5,
            "priority": "Critical",
            "status": "Pending",
            "resources": {
                "crew_type": "Signal Engineers Group A",
                "crew_size": 3,
                "equipment": ["Point Machine Drive Calibrator"],
                "power_block_required": False,
                "speed_restriction_kmh": 15
            },
            "crew_availability_ratio": 0.9,
            "equipment_available": True,
            "dependencies": [],
            "compatible_with_simultaneous_types": [
                "Traffic Block Coordination"
            ],
            "planned_start_offset_hours": 1.0
        },
        {
            "id": "TSK-TRK-102",
            "title": "Ballast Tamping & Track Geometry Realignment",
            "description": "Mechanical tamping of 1.8km track bed in Section A-2 Junction yard to restore track alignment and cross-level.",
            "department": "Track",
            "section": "Section A-2 (Junction Yard)",
            "maintenance_type": "Ballast Tamping",
            "planned_duration_hours": 4.0,
            "priority": "High",
            "status": "Pending",
            "resources": {
                "crew_type": "Track Gang Beta",
                "crew_size": 6,
                "equipment": ["Tamping Machine 01", "Ballast Regulator BR-3"],
                "power_block_required": False,
                "speed_restriction_kmh": 30
            },
            "crew_availability_ratio": 1.0,
            "equipment_available": True,
            "dependencies": ["TSK-SNT-301"],  # Cannot tamp through points until point machine calibrated
            "compatible_with_simultaneous_types": [],
            "planned_start_offset_hours": 3.5
        },
        {
            "id": "TSK-OPS-401",
            "title": "Traffic Block Management & Suburban Freight Diversion",
            "description": "Establish temporary single-line working and route diversion protocol for Section B-1 corridor during heavy renewal work.",
            "department": "Railway Operations",
            "section": "Section B-1 (Suburban Corridor)",
            "maintenance_type": "Traffic Block Coordination",
            "planned_duration_hours": 5.0,
            "priority": "High",
            "status": "Pending",
            "resources": {
                "crew_type": "Traffic Controllers Unit",
                "crew_size": 3,
                "equipment": ["Signalling Control Console Sim"],
                "power_block_required": False,
                "speed_restriction_kmh": None
            },
            "crew_availability_ratio": 1.0,
            "equipment_available": True,
            "dependencies": [],
            "compatible_with_simultaneous_types": [
                "Track Relaying / Renewal",
                "Signal Interlocking Overhaul"
            ],
            "planned_start_offset_hours": 0.0
        },
        {
            "id": "TSK-TRK-103",
            "title": "Suburban Track Relaying & Sleeper Renewal",
            "description": "Complete rail replacement and concrete sleeper renewal on Section B-1 fast line.",
            "department": "Track",
            "section": "Section B-1 (Suburban Corridor)",
            "maintenance_type": "Track Relaying / Renewal",
            "planned_duration_hours": 5.5,
            "priority": "Critical",
            "status": "Pending",
            "resources": {
                "crew_type": "Track Gang Alpha",
                "crew_size": 8,
                "equipment": ["Tamping Machine 01", "Ballast Regulator BR-3"],
                "power_block_required": False,
                "speed_restriction_kmh": 20
            },
            "crew_availability_ratio": 0.85,
            "equipment_available": True,
            "dependencies": ["TSK-OPS-401"],  # Operations traffic block must be established first
            "compatible_with_simultaneous_types": [
                "Traffic Block Coordination"
            ],
            "planned_start_offset_hours": 1.0
        },
        {
            "id": "TSK-SNT-302",
            "title": "Electronic Interlocking Logic Testing & Axle Counter Reset",
            "description": "Software interlocking verification and multi-section digital axle counter calibration post-relaying.",
            "department": "Signalling & Telecommunications (S&T)",
            "section": "Section B-1 (Suburban Corridor)",
            "maintenance_type": "Signal Interlocking Overhaul",
            "planned_duration_hours": 3.0,
            "priority": "High",
            "status": "Pending",
            "resources": {
                "crew_type": "Signal Engineers Group A",
                "crew_size": 4,
                "equipment": ["Interlocking Test Kit ITK-3"],
                "power_block_required": False,
                "speed_restriction_kmh": None
            },
            "crew_availability_ratio": 1.0,
            "equipment_available": True,
            "dependencies": ["TSK-TRK-103"],  # Must test after track relaying is physically finished!
            "compatible_with_simultaneous_types": [],
            "planned_start_offset_hours": 6.5
        },
        {
            "id": "TSK-OHE-202",
            "title": "Overhead Contact Wire Tensioning & Dropper Replacement",
            "description": "Tension adjustment and dropper clip renewal along Section B-2 Freight Loop catenary system.",
            "department": "Electrical / OHE",
            "section": "Section B-2 (Freight Loop)",
            "maintenance_type": "Overhead Wire Tensioning",
            "planned_duration_hours": 3.5,
            "priority": "Medium",
            "status": "Pending",
            "resources": {
                "crew_type": "OHE Line Crew 1",
                "crew_size": 4,
                "equipment": ["Tower Wagon TW-202", "Catenary Tensioning Rig CR-11"],
                "power_block_required": True,
                "speed_restriction_kmh": None
            },
            "crew_availability_ratio": 1.0,
            "equipment_available": True,
            "dependencies": [],
            "compatible_with_simultaneous_types": [],
            "planned_start_offset_hours": 2.0
        },
        {
            "id": "TSK-SNT-303",
            "title": "Level Crossing Automatic Barrier & Flasher Servicing",
            "description": "Routine quarterly electro-mechanical servicing of Gate 12 automatic booms and obstacle detection sensors.",
            "department": "Signalling & Telecommunications (S&T)",
            "section": "Section C-1 (Terminal Approaches)",
            "maintenance_type": "Level Crossing S&T Servicing",
            "planned_duration_hours": 2.0,
            "priority": "Low",
            "status": "Completed",
            "actual_duration_hours": 2.1,
            "resources": {
                "crew_type": "S&T Telecom Squad",
                "crew_size": 2,
                "equipment": ["Optical Fiber Splicer"],
                "power_block_required": False,
                "speed_restriction_kmh": None
            },
            "crew_availability_ratio": 1.0,
            "equipment_available": True,
            "dependencies": [],
            "compatible_with_simultaneous_types": [],
            "planned_start_offset_hours": 0.0
        }
    ]
    return tasks


def save_synthetic_data_files():
    """Generates and saves both the historical CSV and active tasks JSON."""
    HISTORICAL_DATA_CSV.parent.mkdir(parents=True, exist_ok=True)
    
    # Historical dataset
    df = generate_historical_dataset(num_records=1600, random_seed=42)
    df.to_csv(HISTORICAL_DATA_CSV, index=False)
    print(f"Historical dataset saved to {HISTORICAL_DATA_CSV} ({len(df)} records)")
    
    # Active tasks
    import json
    active_tasks = generate_active_tasks()
    with open(ACTIVE_TASKS_FILE, "w", encoding="utf-8") as f:
        json.dump(active_tasks, f, indent=2)
    print(f"Active tasks saved to {ACTIVE_TASKS_FILE} ({len(active_tasks)} tasks)")


if __name__ == "__main__":
    save_synthetic_data_files()
