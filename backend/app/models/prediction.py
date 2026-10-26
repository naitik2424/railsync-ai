from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class DelayPredictionRequest(BaseModel):
    task_id: Optional[str] = None
    department: str
    maintenance_type: str
    section: str
    planned_duration_hours: float = Field(..., gt=0.0)
    complexity_score: int = Field(default=3, ge=1, le=5)
    crew_experience_level: int = Field(default=2, ge=1, le=3)
    crew_size_allocated: int = Field(default=4, ge=1)
    crew_shortage_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    equipment_age_years: int = Field(default=5, ge=0)
    weather_condition: str = Field(default="Clear")
    is_night_shift: int = Field(default=0, ge=0, le=1)
    dependency_count: int = Field(default=0, ge=0)
    historical_section_delay_rate: float = Field(default=0.25, ge=0.0, le=1.0)


class DelayPredictionResponse(BaseModel):
    task_id: Optional[str] = None
    delay_probability: float = Field(..., ge=0.0, le=1.0)
    will_delay: bool
    risk_level: str  # "Low", "Medium", "High", "Critical"
    top_risk_factors: List[str]
    confidence_score: float
    model_version: str
    is_simulated_synthetic: bool = True
    disclaimer: str = "Prediction generated using Scikit-Learn Random Forest trained on synthetic railway maintenance operations data for hackathon demonstration."


class ModelMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    baseline_accuracy: float
    training_samples: int
    test_samples: int
    trained_at: str
    feature_importances: Dict[str, float]
