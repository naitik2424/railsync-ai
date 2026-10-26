from fastapi import APIRouter
from typing import List, Dict, Any
from backend.app.models.simulation import WhatIfRequest, WhatIfResponse
from backend.app.services.simulation_service import simulation_service

router = APIRouter(prefix="/simulation", tags=["What-If Operational Disruption Simulation"])


@router.get("/scenarios", response_model=List[Dict[str, Any]])
def get_scenarios():
    """Returns available preconfigured operational disruption scenarios."""
    return simulation_service.get_preconfigured_scenarios()


@router.post("/run", response_model=WhatIfResponse)
def run_simulation(request: WhatIfRequest):
    """
    Executes an end-to-end what-if simulation:
    1. Injects operational disruption (equipment breakdown, crew shortage, duration overrun)
    2. Recalculates ML delay risks on affected and downstream tasks
    3. Re-runs Google OR-Tools CP-SAT scheduler to find revised conflict-free schedule
    4. Explains what changed and why
    """
    return simulation_service.run_simulation(request)
