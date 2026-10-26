import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { MaintenanceTask } from '../contracts/schemas.js';

// Fallback JSON file path matching backend/data/active_tasks.json
const FALLBACK_DATA_FILE = path.resolve(process.cwd(), '..', 'backend', 'data', 'active_tasks.json');

class DatabaseManager {
  private prisma: PrismaClient | null = null;
  private isPostgresAvailable = false;
  private fallbackStore: Map<string, MaintenanceTask> = new Map();
  private initialized = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Test PostgreSQL connectivity
    try {
      if (this.prisma) {
        await this.prisma.$connect();
        await this.prisma.$queryRaw`SELECT 1`;
        this.isPostgresAvailable = true;
        console.log('✅ [Database] Successfully connected to PostgreSQL via Prisma ORM.');
      }
    } catch (err: any) {
      this.isPostgresAvailable = false;
      console.warn('⚠️ [Database] PostgreSQL is not running or unreachable at DATABASE_URL.');
      console.warn('⚡ [Database] Activating robust Local Storage Fallback so the server runs seamlessly without crashing!');
    }

    // Always seed/load fallback store as safety backup
    this.loadFallbackData();
    this.initialized = true;
  }

  private loadFallbackData(): void {
    try {
      if (fs.existsSync(FALLBACK_DATA_FILE)) {
        const raw = fs.readFileSync(FALLBACK_DATA_FILE, 'utf-8');
        const tasks: any[] = JSON.parse(raw);
        for (const t of tasks) {
          this.fallbackStore.set(t.id, t);
        }
      }
    } catch (e) {
      console.error('Failed to load initial fallback tasks:', e);
    }
  }

  private persistFallbackData(): void {
    try {
      const data = Array.from(this.fallbackStore.values());
      const dir = path.dirname(FALLBACK_DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(FALLBACK_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist fallback tasks:', e);
    }
  }

  get isPostgresActive(): boolean {
    return this.isPostgresAvailable;
  }

  get client(): PrismaClient | null {
    return this.prisma;
  }

  // Unified Data Access Methods
  async getAllTasks(): Promise<MaintenanceTask[]> {
    await this.initialize();
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const records = await this.prisma.task.findMany({
          orderBy: { id: 'asc' },
        });
        return records.map((r) => this.mapPrismaToTask(r));
      } catch (e) {
        console.warn('Postgres query failed, falling back to local store:', e);
      }
    }
    return Array.from(this.fallbackStore.values());
  }

  async getTaskById(id: string): Promise<MaintenanceTask | null> {
    await this.initialize();
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const record = await this.prisma.task.findUnique({ where: { id } });
        if (record) return this.mapPrismaToTask(record);
      } catch (e) {
        // fallback
      }
    }
    return this.fallbackStore.get(id) || null;
  }

  async saveTask(task: MaintenanceTask): Promise<MaintenanceTask> {
    await this.initialize();
    if (this.isPostgresAvailable && this.prisma) {
      try {
        const mapped = this.mapTaskToPrisma(task);
        await this.prisma.task.upsert({
          where: { id: task.id },
          update: mapped,
          create: mapped,
        });
      } catch (e) {
        console.warn('Prisma save failed, falling back:', e);
      }
    }
    this.fallbackStore.set(task.id, task);
    this.persistFallbackData();
    return task;
  }

  async deleteTask(id: string): Promise<boolean> {
    await this.initialize();
    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.task.delete({ where: { id } });
      } catch (e) {
        // ignore
      }
    }
    const existed = this.fallbackStore.delete(id);
    if (existed) {
      // Clean up dependencies from other tasks
      for (const t of this.fallbackStore.values()) {
        if (t.dependencies.includes(id)) {
          t.dependencies = t.dependencies.filter((d) => d !== id);
        }
      }
      this.persistFallbackData();
    }
    return existed;
  }

  async setAllTasks(tasks: MaintenanceTask[]): Promise<void> {
    await this.initialize();
    this.fallbackStore.clear();
    for (const t of tasks) {
      this.fallbackStore.set(t.id, t);
    }
    this.persistFallbackData();

    if (this.isPostgresAvailable && this.prisma) {
      try {
        await this.prisma.task.deleteMany({});
        for (const t of tasks) {
          await this.prisma.task.create({ data: this.mapTaskToPrisma(t) });
        }
      } catch (e) {
        console.warn('Prisma bulk save failed:', e);
      }
    }
  }

  private mapPrismaToTask(r: any): MaintenanceTask {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      department: r.department,
      section: r.section,
      maintenance_type: r.maintenanceType,
      planned_duration_hours: r.plannedDurationHours,
      actual_duration_hours: r.actualDurationHours,
      priority: r.priority,
      status: r.status,
      resources: {
        crew_type: r.crewType,
        crew_size: r.crewSize,
        equipment: r.equipment,
        power_block_required: r.powerBlockRequired,
        speed_restriction_kmh: r.speedRestrictionKmh,
      },
      crew_availability_ratio: r.crewAvailabilityRatio,
      equipment_available: r.equipmentAvailable,
      dependencies: r.dependencies,
      compatible_with_simultaneous_types: r.compatibleWithSimultaneousTypes,
      planned_start_offset_hours: r.plannedStartOffsetHours,
      scheduled_start_hour: r.scheduledStartHour,
      scheduled_end_hour: r.scheduledEndHour,
      scheduled_window_id: r.scheduledWindowId,
      predicted_delay_probability: r.predictedDelayProbability,
      risk_level: r.riskLevel,
      delay_factors: r.delayFactors,
      created_at: r.createdAt?.toISOString?.() || undefined,
      updated_at: r.updatedAt?.toISOString?.() || undefined,
    };
  }

  private mapTaskToPrisma(t: MaintenanceTask): any {
    return {
      id: t.id,
      title: t.title,
      description: t.description || '',
      department: t.department,
      section: t.section,
      maintenanceType: t.maintenance_type,
      plannedDurationHours: t.planned_duration_hours,
      actualDurationHours: t.actual_duration_hours ?? null,
      priority: t.priority,
      status: t.status,
      crewType: t.resources.crew_type,
      crewSize: t.resources.crew_size,
      equipment: t.resources.equipment,
      powerBlockRequired: t.resources.power_block_required,
      speedRestrictionKmh: t.resources.speed_restriction_kmh ?? null,
      crewAvailabilityRatio: t.crew_availability_ratio,
      equipmentAvailable: t.equipment_available,
      dependencies: t.dependencies,
      compatibleWithSimultaneousTypes: t.compatible_with_simultaneous_types,
      plannedStartOffsetHours: t.planned_start_offset_hours,
      scheduledStartHour: t.scheduled_start_hour ?? null,
      scheduledEndHour: t.scheduled_end_hour ?? null,
      scheduledWindowId: t.scheduled_window_id ?? null,
      predictedDelayProbability: t.predicted_delay_probability ?? null,
      riskLevel: t.risk_level ?? 'Low',
      delayFactors: t.delay_factors || [],
    };
  }
}

export const db = new DatabaseManager();
