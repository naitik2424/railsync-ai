import { z } from 'zod';

export const DepartmentEnum = z.enum([
  'Track',
  'Electrical / OHE',
  'Signalling & Telecommunications (S&T)',
  'Railway Operations',
]);

export const TaskStatusEnum = z.enum([
  'Pending',
  'In Progress',
  'Completed',
  'Blocked',
  'Cancelled',
]);

export const PriorityEnum = z.enum(['Low', 'Medium', 'High', 'Critical']);

export const ResourceRequirementSchema = z.object({
  crew_type: z.string().min(1, 'Crew type is required'),
  crew_size: z.number().int().min(1).default(4),
  equipment: z.array(z.string()).default([]),
  power_block_required: z.boolean().default(false),
  speed_restriction_kmh: z.number().nullable().optional(),
});

export const MaintenanceTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(3),
  description: z.string().default(''),
  department: DepartmentEnum,
  section: z.string(),
  maintenance_type: z.string(),
  planned_duration_hours: z.number().positive(),
  actual_duration_hours: z.number().nullable().optional(),
  priority: PriorityEnum.default('Medium'),
  status: TaskStatusEnum.default('Pending'),
  resources: ResourceRequirementSchema,
  crew_availability_ratio: z.number().min(0).max(1).default(1.0),
  equipment_available: z.boolean().default(true),
  dependencies: z.array(z.string()).default([]),
  compatible_with_simultaneous_types: z.array(z.string()).default([]),
  planned_start_offset_hours: z.number().min(0).default(0.0),
  scheduled_start_hour: z.number().nullable().optional(),
  scheduled_end_hour: z.number().nullable().optional(),
  scheduled_window_id: z.string().nullable().optional(),
  predicted_delay_probability: z.number().min(0).max(1).nullable().optional(),
  risk_level: z.string().default('Low'),
  delay_factors: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const TaskCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional().default(''),
  department: DepartmentEnum,
  section: z.string().min(1, 'Section is required'),
  maintenance_type: z.string().min(1, 'Maintenance type is required'),
  planned_duration_hours: z.number().positive('Planned duration must be greater than 0'),
  priority: PriorityEnum.default('Medium'),
  resources: ResourceRequirementSchema,
  crew_availability_ratio: z.number().min(0).max(1).default(1.0),
  dependencies: z.array(z.string()).default([]),
  compatible_with_simultaneous_types: z.array(z.string()).default([]),
  planned_start_offset_hours: z.number().min(0).default(0.0),
});

export const TaskUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  department: DepartmentEnum.optional(),
  section: z.string().optional(),
  maintenance_type: z.string().optional(),
  planned_duration_hours: z.number().positive().optional(),
  actual_duration_hours: z.number().nullable().optional(),
  priority: PriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  resources: ResourceRequirementSchema.optional(),
  crew_availability_ratio: z.number().min(0).max(1).optional(),
  equipment_available: z.boolean().optional(),
  dependencies: z.array(z.string()).optional(),
  planned_start_offset_hours: z.number().min(0).optional(),
});

export const DelayPredictionRequestSchema = z.object({
  task_id: z.string().optional(),
  department: z.string(),
  maintenance_type: z.string(),
  section: z.string(),
  planned_duration_hours: z.number().positive(),
  complexity_score: z.number().int().min(1).max(5).default(3),
  crew_experience_level: z.number().int().min(1).max(3).default(2),
  crew_size_allocated: z.number().int().min(1).default(4),
  crew_shortage_ratio: z.number().min(0).max(1).default(0.0),
  equipment_age_years: z.number().int().min(0).default(5),
  weather_condition: z.string().default('Clear'),
  is_night_shift: z.number().int().min(0).max(1).default(0),
  dependency_count: z.number().int().min(0).default(0),
  historical_section_delay_rate: z.number().min(0).max(1).default(0.25),
});

export const WhatIfRequestSchema = z.object({
  scenario_id: z.string().optional(),
  title: z.string().min(3),
  disruption_type: z.string(),
  target_equipment: z.string().optional(),
  target_crew_type: z.string().optional(),
  target_task_id: z.string().optional(),
  target_section: z.string().optional(),
  duration_multiplier: z.number().min(1.0).max(4.0).default(1.5),
  crew_shortage_percentage: z.number().min(0.0).max(1.0).default(0.5),
});

export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;
export type MaintenanceTask = z.infer<typeof MaintenanceTaskSchema>;
export type DelayPredictionRequest = z.infer<typeof DelayPredictionRequestSchema>;
export type WhatIfRequest = z.infer<typeof WhatIfRequestSchema>;
