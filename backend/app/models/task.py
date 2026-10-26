from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Department(str, Enum):
    TRACK = "Track"
    ELECTRICAL_OHE = "Electrical / OHE"
    SIGNAL_TELECOM = "Signalling & Telecommunications (S&T)"
    OPERATIONS = "Railway Operations"


class TaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    BLOCKED = "Blocked"
    CANCELLED = "Cancelled"


class Priority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class MaintenanceType(str, Enum):
    TRACK_RELAYING = "Track Relaying / Renewal"
    BALLAST_TAMPING = "Ballast Tamping"
    RAIL_GRINDING = "Rail Grinding & Ultrasonic Testing"
    OHE_POWER_BLOCK = "OHE Power Block Inspection"
    OVERHEAD_TENSIONING = "Overhead Wire Tensioning"
    POINT_MACHINE_SERVICE = "Point Machine Maintenance"
    SIGNAL_INTERLOCKING = "Signal Interlocking Overhaul"
    LEVEL_CROSSING_SERVICE = "Level Crossing S&T Servicing"
    TRAFFIC_BLOCK_COORDINATION = "Traffic Block Coordination"


class ResourceRequirement(BaseModel):
    crew_type: str = Field(..., description="Crew designation e.g. Track Gang Alpha, OHE Line Crew")
    crew_size: int = Field(default=4, ge=1)
    equipment: List[str] = Field(default_factory=list, description="Required specialized machines/tools")
    power_block_required: bool = Field(default=False, description="Whether 25kV OHE power shutdown is required")
    speed_restriction_kmh: Optional[int] = Field(default=None, description="Temporary speed restriction if applicable")


class MaintenanceTask(BaseModel):
    id: str = Field(..., description="Unique task identifier e.g. TSK-TRK-101")
    title: str = Field(..., min_length=3)
    description: str = Field(default="")
    department: Department
    section: str = Field(..., description="Railway section e.g. Section A-1 (Mainline North)")
    maintenance_type: MaintenanceType
    planned_duration_hours: float = Field(..., gt=0.0)
    actual_duration_hours: Optional[float] = Field(default=None, ge=0.0)
    priority: Priority = Field(default=Priority.MEDIUM)
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    
    # Resources
    resources: ResourceRequirement
    crew_availability_ratio: float = Field(default=1.0, ge=0.0, le=1.0, description="1.0 = full crew present")
    equipment_available: bool = Field(default=True)
    
    # Precedence and constraints
    dependencies: List[str] = Field(default_factory=list, description="IDs of tasks that must finish before this starts")
    compatible_with_simultaneous_types: List[str] = Field(
        default_factory=list, 
        description="Types of tasks that can safely share the same track block window"
    )
    
    # Timing and window
    planned_start_offset_hours: float = Field(default=0.0, ge=0.0, description="Planned start offset from schedule start")
    scheduled_start_hour: Optional[float] = Field(default=None)
    scheduled_end_hour: Optional[float] = Field(default=None)
    scheduled_window_id: Optional[str] = Field(default=None)
    
    # Risk and metadata
    predicted_delay_probability: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    risk_level: Optional[str] = Field(default="Unassessed")
    delay_factors: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    department: Department
    section: str
    maintenance_type: MaintenanceType
    planned_duration_hours: float = Field(..., gt=0)
    priority: Priority = Priority.MEDIUM
    resources: ResourceRequirement
    dependencies: List[str] = []
    compatible_with_simultaneous_types: List[str] = []
    planned_start_offset_hours: float = 0.0


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[Department] = None
    section: Optional[str] = None
    maintenance_type: Optional[MaintenanceType] = None
    planned_duration_hours: Optional[float] = None
    actual_duration_hours: Optional[float] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    resources: Optional[ResourceRequirement] = None
    crew_availability_ratio: Optional[float] = None
    equipment_available: Optional[bool] = None
    dependencies: Optional[List[str]] = None
    planned_start_offset_hours: Optional[float] = None
