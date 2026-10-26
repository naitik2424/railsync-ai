import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_and_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["system"] == "RailSync AI"
    
    health_res = client.get("/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] == "healthy"


def test_tasks_api_crud():
    # 1. Get all tasks
    res = client.get("/api/tasks")
    assert res.status_code == 200
    tasks = res.json()
    assert len(tasks) > 0
    first_task = tasks[0]
    assert "id" in first_task
    assert "department" in first_task
    assert "risk_level" in first_task
    
    # 2. Filter by department
    res_track = client.get("/api/tasks?department=Track")
    assert res_track.status_code == 200
    for t in res_track.json():
        assert t["department"] == "Track"

    # 3. Create task
    new_task_payload = {
        "title": "Automated S&T Switch Testing",
        "description": "Integration testing of switch drive motors.",
        "department": "Signalling & Telecommunications (S&T)",
        "section": "Section B-1 (Suburban Corridor)",
        "maintenance_type": "Point Machine Maintenance",
        "planned_duration_hours": 2.5,
        "priority": "Medium",
        "resources": {
            "crew_type": "Signal Engineers Group A",
            "crew_size": 3,
            "equipment": ["Point Machine Drive Calibrator"],
            "power_block_required": False
        },
        "dependencies": [],
        "compatible_with_simultaneous_types": []
    }
    create_res = client.post("/api/tasks", json=new_task_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    created_id = created["id"]
    assert "predicted_delay_probability" in created

    # 4. Update task
    update_res = client.patch(f"/api/tasks/{created_id}", json={"priority": "Critical"})
    assert update_res.status_code == 200
    assert update_res.json()["priority"] == "Critical"

    # 5. Clean up
    del_res = client.delete(f"/api/tasks/{created_id}")
    assert del_res.status_code == 200


def test_ml_prediction_endpoint():
    req = {
        "department": "Track",
        "maintenance_type": "Track Relaying / Renewal",
        "section": "Section B-1 (Suburban Corridor)",
        "planned_duration_hours": 6.0,
        "complexity_score": 5,
        "crew_experience_level": 1,
        "crew_size_allocated": 6,
        "crew_shortage_ratio": 0.40,
        "equipment_age_years": 10,
        "weather_condition": "Rain",
        "is_night_shift": 1,
        "dependency_count": 2,
        "historical_section_delay_rate": 0.35
    }
    res = client.post("/api/predictions/predict", json=req)
    assert res.status_code == 200
    data = res.json()
    assert 0.0 <= data["delay_probability"] <= 1.0
    assert data["risk_level"] in ["High", "Critical"]
    assert len(data["top_risk_factors"]) > 0


def test_optimization_comparison_endpoint():
    res = client.get("/api/optimization/comparison")
    assert res.status_code == 200
    data = res.json()
    assert "baseline" in data
    assert "optimized" in data
    assert "downtime_hours_saved" in data
    assert data["downtime_hours_saved"] >= 0.0


def test_coordination_and_alerts():
    res_alerts = client.get("/api/coordination/alerts")
    assert res_alerts.status_code == 200
    assert isinstance(res_alerts.json(), list)

    res_summary = client.get("/api/coordination/dashboard-summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert "overview" in summary
    assert "department_distribution" in summary
    assert "high_risk_tasks" in summary


def test_what_if_simulation_endpoint():
    req = {
        "title": "Test Tower Wagon Failure",
        "disruption_type": "equipment_breakdown",
        "target_equipment": "Tower Wagon TW-202",
        "duration_multiplier": 1.5
    }
    res = client.post("/api/simulation/run", json=req)
    assert res.status_code == 200
    sim = res.json()
    assert "impact_summary" in sim
    assert "revised_schedule" in sim
    assert "comparison" in sim
    assert len(sim["impact_summary"]["operational_explanation"]) > 0
