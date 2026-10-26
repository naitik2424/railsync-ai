import { db } from '../db/index.js';
import { mlService } from './mlService.js';
import { AlertService, OperationalAlert } from './alertService.js';
import { MaintenanceTask, TaskCreateInput, TaskUpdateInput } from '../contracts/schemas.js';

class TaskService {
  async getAllTasks(department?: string, status?: string): Promise<MaintenanceTask[]> {
    let tasks = await db.getAllTasks();
    if (department && department !== 'All') {
      tasks = tasks.filter((t) => t.department === department);
    }
    if (status && status !== 'All') {
      tasks = tasks.filter((t) => t.status === status);
    }
    return tasks;
  }

  async getTaskById(id: string): Promise<MaintenanceTask | null> {
    return db.getTaskById(id);
  }

  async createTask(input: TaskCreateInput): Promise<MaintenanceTask> {
    const tasks = await db.getAllTasks();

    const deptPrefix: Record<string, string> = {
      Track: 'TRK',
      'Electrical / OHE': 'OHE',
      'Signalling & Telecommunications (S&T)': 'SNT',
      'Railway Operations': 'OPS',
    };
    const prefix = deptPrefix[input.department] || 'GEN';
    const taskId = `TSK-${prefix}-${tasks.length + 101}`;

    const now = new Date().toISOString();

    // Call ML Delay Prediction
    let pred = {
      delay_probability: 0.25,
      risk_level: 'Low',
      top_risk_factors: ['Standard operating parameters'],
    };

    try {
      pred = await mlService.predictDelay({
        department: input.department,
        maintenance_type: input.maintenance_type,
        section: input.section,
        planned_duration_hours: input.planned_duration_hours,
        complexity_score: input.priority === 'Critical' ? 5 : input.priority === 'High' ? 4 : 3,
        crew_experience_level: 2,
        crew_size_allocated: input.resources.crew_size,
        crew_shortage_ratio: Math.max(0, 1.0 - input.crew_availability_ratio),
        equipment_age_years: 6,
        weather_condition: 'Clear',
        is_night_shift: input.planned_start_offset_hours >= 20 || input.planned_start_offset_hours <= 5 ? 1 : 0,
        dependency_count: input.dependencies.length,
        historical_section_delay_rate: 0.28,
      });
    } catch (e) {
      console.warn('ML delay prediction fallback during task creation:', e);
    }

    const newTask: MaintenanceTask = {
      id: taskId,
      title: input.title,
      description: input.description || '',
      department: input.department,
      section: input.section,
      maintenance_type: input.maintenance_type,
      planned_duration_hours: input.planned_duration_hours,
      actual_duration_hours: null,
      priority: input.priority,
      status: 'Pending',
      resources: input.resources,
      crew_availability_ratio: input.crew_availability_ratio,
      equipment_available: true,
      dependencies: input.dependencies || [],
      compatible_with_simultaneous_types: input.compatible_with_simultaneous_types || [],
      planned_start_offset_hours: input.planned_start_offset_hours || 0.0,
      scheduled_start_hour: null,
      scheduled_end_hour: null,
      scheduled_window_id: null,
      predicted_delay_probability: pred.delay_probability,
      risk_level: pred.risk_level,
      delay_factors: pred.top_risk_factors || [],
      created_at: now,
      updated_at: now,
    };

    return db.saveTask(newTask);
  }

  async updateTask(id: string, updates: TaskUpdateInput): Promise<MaintenanceTask | null> {
    const existing = await db.getTaskById(id);
    if (!existing) return null;

    const updated: MaintenanceTask = {
      ...existing,
      ...updates,
      resources: updates.resources ? { ...existing.resources, ...updates.resources } : existing.resources,
      updated_at: new Date().toISOString(),
    };

    // Re-evaluate ML prediction if operational features changed and task is not completed
    if (updated.status !== 'Completed') {
      try {
        const pred = await mlService.predictDelay({
          department: updated.department,
          maintenance_type: updated.maintenance_type,
          section: updated.section,
          planned_duration_hours: updated.planned_duration_hours,
          complexity_score: updated.priority === 'Critical' ? 5 : updated.priority === 'High' ? 4 : 3,
          crew_experience_level: 2,
          crew_size_allocated: updated.resources.crew_size,
          crew_shortage_ratio: Math.max(0, 1.0 - updated.crew_availability_ratio),
          equipment_age_years: 6,
          weather_condition: 'Clear',
          is_night_shift: updated.planned_start_offset_hours >= 20 || updated.planned_start_offset_hours <= 5 ? 1 : 0,
          dependency_count: updated.dependencies.length,
          historical_section_delay_rate: 0.28,
        });

        updated.predicted_delay_probability = pred.delay_probability;
        updated.risk_level = pred.risk_level;
        updated.delay_factors = pred.top_risk_factors || [];
      } catch (e) {
        // preserve previous prediction
      }
    }

    return db.saveTask(updated);
  }

  async deleteTask(id: string): Promise<boolean> {
    return db.deleteTask(id);
  }

  async resetSampleData(): Promise<MaintenanceTask[]> {
    // Deterministic sample maintenance tasks across all 4 railway departments
    const sampleTasks: MaintenanceTask[] = [
      {
        id: 'TSK-TRK-101',
        title: 'Mainline Rail Ultrasonic Testing & Joint Tightening',
        description: 'Continuous flaw detection testing on Section A-1 North track segment, followed by fishplate joint torque verification.',
        department: 'Track',
        section: 'Section A-1 (Mainline North)',
        maintenance_type: 'Rail Grinding & Ultrasonic Testing',
        planned_duration_hours: 3.0,
        actual_duration_hours: null,
        priority: 'High',
        status: 'Pending',
        resources: {
          crew_type: 'Track Gang Alpha',
          crew_size: 5,
          equipment: ['Ultrasonic Flaw Detector UFD-4'],
          power_block_required: false,
          speed_restriction_kmh: 40,
        },
        crew_availability_ratio: 1.0,
        equipment_available: true,
        dependencies: [],
        compatible_with_simultaneous_types: ['OHE Power Block Inspection', 'Level Crossing S&T Servicing'],
        planned_start_offset_hours: 0.0,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.22,
        risk_level: 'Low',
        delay_factors: ['Standard operating parameters and adequate crew allocation.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-OHE-201',
        title: '25kV Catenary Insulator Cleaning & Mast Grounding',
        description: 'Routine high-voltage insulator washing and grounding inspection on Section A-1 overhead equipment.',
        department: 'Electrical / OHE',
        section: 'Section A-1 (Mainline North)',
        maintenance_type: 'OHE Power Block Inspection',
        planned_duration_hours: 3.0,
        actual_duration_hours: null,
        priority: 'Medium',
        status: 'Pending',
        resources: {
          crew_type: 'OHE Line Crew 1',
          crew_size: 4,
          equipment: ['Tower Wagon TW-202', 'High-Voltage Grounding Kits'],
          power_block_required: true,
          speed_restriction_kmh: null,
        },
        crew_availability_ratio: 1.0,
        equipment_available: true,
        dependencies: [],
        compatible_with_simultaneous_types: ['Rail Grinding & Ultrasonic Testing', 'Level Crossing S&T Servicing'],
        planned_start_offset_hours: 0.0,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.26,
        risk_level: 'Low',
        delay_factors: ['Standard operating parameters and adequate crew allocation.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-SNT-301',
        title: 'Point Machine 44B Overhaul & Lubrication',
        description: 'Mechanical inspection, stroke calibration, and contact cleansing on facing crossover point machine.',
        department: 'Signalling & Telecommunications (S&T)',
        section: 'Section A-2 (Junction Yard)',
        maintenance_type: 'Point Machine Maintenance',
        planned_duration_hours: 2.5,
        actual_duration_hours: null,
        priority: 'Critical',
        status: 'Pending',
        resources: {
          crew_type: 'Signal Engineers Group A',
          crew_size: 3,
          equipment: ['Point Machine Drive Calibrator'],
          power_block_required: false,
          speed_restriction_kmh: 15,
        },
        crew_availability_ratio: 0.9,
        equipment_available: true,
        dependencies: [],
        compatible_with_simultaneous_types: ['Traffic Block Coordination'],
        planned_start_offset_hours: 1.0,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.38,
        risk_level: 'Medium',
        delay_factors: ['Section historical delay rate is elevated (38%).'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-TRK-102',
        title: 'Ballast Tamping & Track Geometry Realignment',
        description: 'Mechanical tamping of 1.8km track bed in Section A-2 Junction yard to restore track alignment and cross-level.',
        department: 'Track',
        section: 'Section A-2 (Junction Yard)',
        maintenance_type: 'Ballast Tamping',
        planned_duration_hours: 4.0,
        actual_duration_hours: null,
        priority: 'High',
        status: 'Pending',
        resources: {
          crew_type: 'Track Gang Beta',
          crew_size: 6,
          equipment: ['Tamping Machine 01', 'Ballast Regulator BR-3'],
          power_block_required: false,
          speed_restriction_kmh: 30,
        },
        crew_availability_ratio: 1.0,
        equipment_available: true,
        dependencies: ['TSK-SNT-301'],
        compatible_with_simultaneous_types: [],
        planned_start_offset_hours: 3.5,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.32,
        risk_level: 'Low',
        delay_factors: ['Standard operating parameters and adequate crew allocation.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-OPS-401',
        title: 'Traffic Block Management & Suburban Freight Diversion',
        description: 'Establish temporary single-line working and route diversion protocol for Section B-1 corridor during heavy renewal work.',
        department: 'Railway Operations',
        section: 'Section B-1 (Suburban Corridor)',
        maintenance_type: 'Traffic Block Coordination',
        planned_duration_hours: 5.0,
        actual_duration_hours: null,
        priority: 'High',
        status: 'Pending',
        resources: {
          crew_type: 'Traffic Controllers Unit',
          crew_size: 3,
          equipment: ['Signalling Control Console Sim'],
          power_block_required: false,
          speed_restriction_kmh: null,
        },
        crew_availability_ratio: 1.0,
        equipment_available: true,
        dependencies: [],
        compatible_with_simultaneous_types: ['Track Relaying / Renewal', 'Signal Interlocking Overhaul'],
        planned_start_offset_hours: 0.0,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.28,
        risk_level: 'Low',
        delay_factors: ['Standard operating parameters and adequate crew allocation.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-TRK-103',
        title: 'Suburban Track Relaying & Sleeper Renewal',
        description: 'Complete rail replacement and concrete sleeper renewal on Section B-1 fast line.',
        department: 'Track',
        section: 'Section B-1 (Suburban Corridor)',
        maintenance_type: 'Track Relaying / Renewal',
        planned_duration_hours: 5.5,
        actual_duration_hours: null,
        priority: 'Critical',
        status: 'Pending',
        resources: {
          crew_type: 'Track Gang Alpha',
          crew_size: 8,
          equipment: ['Tamping Machine 01', 'Ballast Regulator BR-3'],
          power_block_required: false,
          speed_restriction_kmh: 20,
        },
        crew_availability_ratio: 0.85,
        equipment_available: true,
        dependencies: ['TSK-OPS-401'],
        compatible_with_simultaneous_types: ['Traffic Block Coordination'],
        planned_start_offset_hours: 1.0,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.68,
        risk_level: 'High',
        delay_factors: ['High task complexity score (5/5) on primary corridor.', 'Heavy freight traffic line.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-SNT-302',
        title: 'Electronic Interlocking Logic Testing & Axle Counter Reset',
        description: 'Software interlocking verification and multi-section digital axle counter calibration post-relaying.',
        department: 'Signalling & Telecommunications (S&T)',
        section: 'Section B-1 (Suburban Corridor)',
        maintenance_type: 'Signal Interlocking Overhaul',
        planned_duration_hours: 3.0,
        actual_duration_hours: null,
        priority: 'High',
        status: 'Pending',
        resources: {
          crew_type: 'Signal Engineers Group A',
          crew_size: 4,
          equipment: ['Interlocking Test Kit ITK-3'],
          power_block_required: false,
          speed_restriction_kmh: null,
        },
        crew_availability_ratio: 1.0,
        equipment_available: true,
        dependencies: ['TSK-TRK-103'],
        compatible_with_simultaneous_types: [],
        planned_start_offset_hours: 6.5,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.35,
        risk_level: 'Medium',
        delay_factors: ['Prerequisite task TSK-TRK-103 is high-risk.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-OHE-202',
        title: 'Overhead Contact Wire Tensioning & Dropper Replacement',
        description: 'Tension adjustment and dropper clip renewal along Section B-2 Freight Loop catenary system.',
        department: 'Electrical / OHE',
        section: 'Section B-2 (Freight Loop)',
        maintenance_type: 'Overhead Wire Tensioning',
        planned_duration_hours: 3.5,
        actual_duration_hours: null,
        priority: 'Medium',
        status: 'Pending',
        resources: {
          crew_type: 'OHE Line Crew 1',
          crew_size: 4,
          equipment: ['Tower Wagon TW-202', 'Catenary Tensioning Rig CR-11'],
          power_block_required: true,
          speed_restriction_kmh: null,
        },
        crew_availability_ratio: 1.0,
        equipment_available: true,
        dependencies: [],
        compatible_with_simultaneous_types: [],
        planned_start_offset_hours: 2.0,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.25,
        risk_level: 'Low',
        delay_factors: ['Standard operating parameters and adequate crew allocation.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'TSK-SNT-303',
        title: 'Level Crossing Automatic Barrier & Flasher Servicing',
        description: 'Routine quarterly electro-mechanical servicing of Gate 12 automatic booms and obstacle detection sensors.',
        department: 'Signalling & Telecommunications (S&T)',
        section: 'Section C-1 (Terminal Approaches)',
        maintenance_type: 'Level Crossing S&T Servicing',
        planned_duration_hours: 2.0,
        actual_duration_hours: 2.1,
        priority: 'Low',
        status: 'Completed',
        resources: {
          crew_type: 'S&T Telecom Squad',
          crew_size: 2,
          equipment: ['Optical Fiber Splicer'],
          power_block_required: false,
          speed_restriction_kmh: null,
        },
        crew_availability_ratio: 1.0,
        equipment_available: true,
        dependencies: [],
        compatible_with_simultaneous_types: [],
        planned_start_offset_hours: 0.0,
        scheduled_start_hour: null,
        scheduled_end_hour: null,
        scheduled_window_id: null,
        predicted_delay_probability: 0.15,
        risk_level: 'Low',
        delay_factors: ['Completed nominally.'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    await db.setAllTasks(sampleTasks);
    return sampleTasks;
  }

  async getDashboardSummary(): Promise<any> {
    const tasks = await db.getAllTasks();

    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter((t) => t.status === 'Pending').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
    const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
    const blockedTasks = tasks.filter((t) => t.status === 'Blocked').length;

    const highRiskTasks = tasks.filter((t) => ['High', 'Critical'].includes(t.risk_level || ''));
    const avgDelayProb = totalTasks > 0
      ? Math.round((tasks.reduce((sum, t) => sum + (t.predicted_delay_probability || 0), 0) / totalTasks) * 100) / 100
      : 0.0;

    // Department Distribution
    const deptStatsMap = new Map<string, { total: number; highRisk: number; pending: number; completed: number }>();
    for (const t of tasks) {
      const cur = deptStatsMap.get(t.department) || { total: 0, highRisk: 0, pending: 0, completed: 0 };
      cur.total += 1;
      if (['High', 'Critical'].includes(t.risk_level || '')) cur.highRisk += 1;
      if (t.status === 'Pending') cur.pending += 1;
      if (t.status === 'Completed') cur.completed += 1;
      deptStatsMap.set(t.department, cur);
    }

    const departmentDistribution = Array.from(deptStatsMap.entries()).map(([dept, s]) => ({
      department: dept,
      total_tasks: s.total,
      high_risk_tasks: s.highRisk,
      pending: s.pending,
      completed: s.completed,
    }));

    // Baseline vs Optimized duration
    let optComparison = {
      baseline_window_hours: 23.5,
      optimized_window_hours: 14.5,
      downtime_hours_saved: 9.0,
      downtime_reduction_percent: 38.3,
      bundled_windows_count: 2,
      baseline_makespan: 16.5,
      optimized_makespan: 10.5,
    };

    try {
      const comp = await mlService.getScheduleComparison();
      if (comp && comp.baseline && comp.optimized) {
        optComparison = {
          baseline_window_hours: comp.baseline.total_window_hours,
          optimized_window_hours: comp.optimized.total_window_hours,
          downtime_hours_saved: comp.downtime_hours_saved,
          downtime_reduction_percent: comp.downtime_reduction_percent,
          bundled_windows_count: comp.optimized.bundled_windows_count,
          baseline_makespan: comp.baseline.makespan_hours,
          optimized_makespan: comp.optimized.makespan_hours,
        };
      }
    } catch (e) {
      // use nominal calculation
    }

    const alerts = AlertService.generateAlerts(tasks);

    const recentTasks = [...tasks]
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
      .slice(0, 6);

    return {
      overview: {
        total_tasks: totalTasks,
        pending_tasks: pendingTasks,
        in_progress_tasks: inProgressTasks,
        completed_tasks: completedTasks,
        blocked_tasks: blockedTasks,
        high_risk_count: highRiskTasks.length,
        avg_delay_probability: avgDelayProb,
        total_alerts: alerts.length,
        critical_alerts: alerts.filter((a) => a.severity === 'CRITICAL').length,
      },
      optimization_comparison: optComparison,
      department_distribution: departmentDistribution,
      high_risk_tasks: highRiskTasks.map((t) => ({
        id: t.id,
        title: t.title,
        department: t.department,
        section: t.section,
        risk_level: t.risk_level,
        delay_probability: t.predicted_delay_probability,
        delay_factors: t.delay_factors,
        priority: t.priority,
      })),
      recent_tasks: recentTasks,
      is_simulated_synthetic: true,
    };
  }

  async getDependencyGraph(): Promise<{ nodes: any[]; edges: any[] }> {
    const tasks = await db.getAllTasks();
    const nodes = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      department: t.department,
      section: t.section,
      status: t.status,
      priority: t.priority,
      risk_level: t.risk_level || 'Low',
      delay_probability: t.predicted_delay_probability || 0.0,
      planned_duration_hours: t.planned_duration_hours,
    }));

    const edges: Array<{ from: string; to: string; label: string }> = [];
    for (const t of tasks) {
      for (const dep of t.dependencies || []) {
        edges.push({
          from: dep,
          to: t.id,
          label: 'Prerequisite',
        });
      }
    }

    return { nodes, edges };
  }
}

export const taskService = new TaskService();
