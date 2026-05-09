import {
  type NotificationLevel,
  type RecurringTask,
  type Schedule,
  type TaskCategory,
} from "@/types/task";
import { getDb } from "./client";

interface TaskRow {
  id: string;
  category: TaskCategory;
  title: string;
  schedule_json: string;
  notification_level: NotificationLevel;
  active: number;
  next_fire_at: number | null;
  last_fire_at: number | null;
  estimate_minutes: number | null;
  created_at: number;
  updated_at: number;
}

function rowToTask(row: TaskRow): RecurringTask {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    schedule: JSON.parse(row.schedule_json) as Schedule,
    notificationLevel: row.notification_level,
    active: row.active === 1,
    nextFireAt: row.next_fire_at,
    lastFireAt: row.last_fire_at,
    estimateMinutes: row.estimate_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAllTasks(): Promise<RecurringTask[]> {
  const db = await getDb();
  const rows = await db.select<TaskRow[]>(
    "SELECT * FROM tasks ORDER BY category, title",
  );
  return rows.map(rowToTask);
}

export async function listActiveTasks(): Promise<RecurringTask[]> {
  const db = await getDb();
  const rows = await db.select<TaskRow[]>(
    "SELECT * FROM tasks WHERE active = 1 ORDER BY next_fire_at",
  );
  return rows.map(rowToTask);
}

export async function getTask(id: string): Promise<RecurringTask | null> {
  const db = await getDb();
  const rows = await db.select<TaskRow[]>("SELECT * FROM tasks WHERE id = $1", [
    id,
  ]);
  return rows[0] ? rowToTask(rows[0]) : null;
}

export interface NewTaskInput {
  id: string;
  category: TaskCategory;
  title: string;
  schedule: Schedule;
  notificationLevel: NotificationLevel;
  active?: boolean;
  estimateMinutes?: number | null;
  nextFireAt?: number | null;
}

export async function insertTask(input: NewTaskInput): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    `INSERT INTO tasks
     (id, category, title, schedule_json, notification_level, active,
      next_fire_at, last_fire_at, estimate_minutes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $9)`,
    [
      input.id,
      input.category,
      input.title,
      JSON.stringify(input.schedule),
      input.notificationLevel,
      input.active === false ? 0 : 1,
      input.nextFireAt ?? null,
      input.estimateMinutes ?? null,
      now,
    ],
  );
}

export interface TaskPatch {
  title?: string;
  schedule?: Schedule;
  notificationLevel?: NotificationLevel;
  active?: boolean;
  estimateMinutes?: number | null;
  nextFireAt?: number | null;
  lastFireAt?: number | null;
}

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.title !== undefined) {
    sets.push(`title = $${i++}`);
    values.push(patch.title);
  }
  if (patch.schedule !== undefined) {
    sets.push(`schedule_json = $${i++}`);
    values.push(JSON.stringify(patch.schedule));
  }
  if (patch.notificationLevel !== undefined) {
    sets.push(`notification_level = $${i++}`);
    values.push(patch.notificationLevel);
  }
  if (patch.active !== undefined) {
    sets.push(`active = $${i++}`);
    values.push(patch.active ? 1 : 0);
  }
  if (patch.estimateMinutes !== undefined) {
    sets.push(`estimate_minutes = $${i++}`);
    values.push(patch.estimateMinutes);
  }
  if (patch.nextFireAt !== undefined) {
    sets.push(`next_fire_at = $${i++}`);
    values.push(patch.nextFireAt);
  }
  if (patch.lastFireAt !== undefined) {
    sets.push(`last_fire_at = $${i++}`);
    values.push(patch.lastFireAt);
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = $${i++}`);
  values.push(Date.now());
  values.push(id);
  await db.execute(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${i}`,
    values,
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
}

export async function countTasks(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) AS c FROM tasks",
  );
  return rows[0]?.c ?? 0;
}
