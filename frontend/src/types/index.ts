export type Department =
  | 'Track'
  | 'Electrical / OHE'
  | 'Signalling & Telecommunications (S&T)'
  | 'Railway Operations';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Blocked' | 'Cancelled';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type MaintenanceType =
  | 'Track Relaying / Renewal'
  | 'Ballast Tamping'
  | 'Rail Grinding & Ultrasonic Testing'
  | 'OHE Power Block Inspection'
  | 'Overhead Wire Tensioning'
  | 'Point Machine Maintenance'
  | 'Signal Interlocking Overhaul'
  | 'Level Crossing S&T Servicing'
  | 'Traffic Block Coordination';

export interface ResourceRequirement {
  crew_type: string;
  crew_size: number;
  equipment: string[];
  power_block_required: boolean;
  speed_restriction_kmh?: number | null;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  department: Department;
  section: string;
  maintenance_type: MaintenanceType;
  planned_duration_hours: number;
  actual_duration_hours?: number | null;
  priority: Priority;
  status: TaskStatus;
  resources: ResourceRequirement;
  crew_availability_ratio: number;
  equipment_available: boolean;
  dependencies: string[];
  compatible_with_simultaneous_types: string[];
  planned_start_offset_hours: number;
  scheduled_start_hour?: number | null;
  scheduled_end_hour?: number | null;
  scheduled_window_id?: string | null;
  predicted_delay_probability?: number | null;
  risk_level?: 'Low' | 'Medium' | 'High' | 'Critical' | 'Unassessed';
  delay_factors?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  department: Department;
  section: string;
  maintenance_type: MaintenanceType;
  planned_duration_hours: number;
  priority: Priority;
  resources: ResourceRequirement;
  dependencies: string[];
  compatible_with_simultaneous_types: string[];
  planned_start_offset_hours: number;
}

export interface ScheduledTaskItem {
  task_id: string;
  title: string;
  department: string;
  section: string;
  maintenance_type: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  window_id: string;
  is_power_block: boolean;
  crew_type: string;
  priority: string;
  risk_level: string;
}

export interface ScheduleWindow {
  window_id: string;
  section: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  tasks_count: number;
  bundled_departments: string[];
  has_power_block: boolean;
}

export interface ScheduleResult {
  schedule_type: 'baseline' | 'optimized';
  is_feasible: boolean;
  status_message: string;
  solver_status?: string;
  total_window_hours: number;
  makespan_hours: number;
  tasks_scheduled_count: number;
  tasks_unassigned_count: number;
  dependency_violations: number;
  resource_conflicts: number;
  bundled_windows_count: number;
  tasks: ScheduledTaskItem[];
  windows: ScheduleWindow[];
}

export interface ScheduleComparison {
  baseline: ScheduleResult;
  optimized: ScheduleResult;
  downtime_hours_saved: number;
  downtime_reduction_percent: number;
  dependency_violations_resolved: number;
  conflicts_resolved: number;
  coordination_efficiency_score: number;
  key_improvements: string[];
}

export interface DelayPredictionRequest {
  task_id?: string;
  department: string;
  maintenance_type: string;
  section: string;
  planned_duration_hours: number;
  complexity_score: number;
  crew_experience_level: number;
  crew_size_allocated: number;
  crew_shortage_ratio: number;
  equipment_age_years: number;
  weather_condition: string;
  is_night_shift: number;
  dependency_count: number;
  historical_section_delay_rate: number;
}

export interface DelayPredictionResponse {
  task_id?: string;
  delay_probability: number;
  will_delay: boolean;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  top_risk_factors: string[];
  confidence_score: number;
  model_version: string;
  is_simulated_synthetic: boolean;
  disclaimer: string;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  baseline_accuracy: number;
  training_samples: number;
  test_samples: number;
  trained_at: string;
  model_type: string;
  feature_importances: Record<string, number>;
  is_simulated_synthetic: boolean;
  notes: string;
}

export interface OperationalAlert {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  source_task_id: string;
  source_task_title: string;
  source_department: string;
  impacted_task_ids: string[];
  title: string;
  message: string;
  created_at?: string;
}

export interface WhatIfScenario {
  id: string;
  title: string;
  description: string;
  disruption_type: string;
  target_equipment?: string;
  target_crew_type?: string;
  target_task_id?: string;
  target_section?: string;
  duration_multiplier?: number;
  crew_shortage_percentage?: number;
}

export interface WhatIfRequest {
  scenario_id?: string;
  title: string;
  disruption_type: string;
  target_equipment?: string;
  target_crew_type?: string;
  target_task_id?: string;
  target_section?: string;
  duration_multiplier?: number;
  crew_shortage_percentage?: number;
}

export interface WhatIfImpactSummary {
  scenario_title: string;
  disruption_type: string;
  impacted_task_ids: string[];
  cascade_affected_tasks: string[];
  delay_probability_increase_avg: number;
  new_high_risk_tasks_count: number;
  operational_explanation: string;
  recommended_mitigation: string;
}

export interface WhatIfResponse {
  scenario_id: string;
  impact_summary: WhatIfImpactSummary;
  original_schedule: ScheduleResult;
  revised_schedule: ScheduleResult;
  comparison: ScheduleComparison;
  generated_alerts: OperationalAlert[];
}

export interface DashboardSummary {
  overview: {
    total_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    completed_tasks: number;
    blocked_tasks: number;
    high_risk_count: number;
    avg_delay_probability: number;
    total_alerts: number;
    critical_alerts: number;
  };
  optimization_comparison: {
    baseline_window_hours: number;
    optimized_window_hours: number;
    downtime_hours_saved: number;
    downtime_reduction_percent: number;
    bundled_windows_count: number;
    baseline_makespan: number;
    optimized_makespan: number;
  };
  department_distribution: Array<{
    department: string;
    total_tasks: number;
    high_risk_tasks: number;
    pending: number;
    completed: number;
  }>;
  high_risk_tasks: Array<{
    id: string;
    title: string;
    department: string;
    section: string;
    risk_level: string;
    delay_probability: number;
    delay_factors: string[];
    priority: string;
  }>;
  recent_tasks: MaintenanceTask[];
  is_simulated_synthetic: boolean;
}
