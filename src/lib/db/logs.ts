import type { TaskLog, TaskStatus } from "@/types/task";
import { getDb } from "./client";

interface LogRow {
  id: number;
  task_id: string;
  scheduled_at: number;
  completed_at: number | null;
  status: TaskStatus;
  quick_action: string | null;
}

function rowToLog(row: LogRow): TaskLog {
  return {
    id: row.id,
    taskId: row.task_id,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    status: row.status,
    quickAction: row.quick_action,
  };
}

export async function insertLog(log: Omit<TaskLog, "id">): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO task_logs (task_id, scheduled_at, completed_at, status, quick_action)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      log.taskId,
      log.scheduledAt,
      log.completedAt,
      log.status,
      log.quickAction ?? null,
    ],
  );
  return result.lastInsertId ?? 0;
}

export async function listLogsForRange(
  fromMs: number,
  toMs: number,
): Promise<TaskLog[]> {
  const db = await getDb();
  const rows = await db.select<LogRow[]>(
    `SELECT * FROM task_logs
     WHERE scheduled_at >= $1 AND scheduled_at < $2
     ORDER BY scheduled_at ASC`,
    [fromMs, toMs],
  );
  return rows.map(rowToLog);
}

export async function getLatestLogForTask(
  taskId: string,
): Promise<TaskLog | null> {
  const db = await getDb();
  const rows = await db.select<LogRow[]>(
    `SELECT * FROM task_logs
     WHERE task_id = $1
     ORDER BY scheduled_at DESC
     LIMIT 1`,
    [taskId],
  );
  return rows[0] ? rowToLog(rows[0]) : null;
}

export async function getLogByTaskAndSlot(
  taskId: string,
  scheduledAt: number,
): Promise<TaskLog | null> {
  const db = await getDb();
  const rows = await db.select<LogRow[]>(
    `SELECT * FROM task_logs
     WHERE task_id = $1 AND scheduled_at = $2
     ORDER BY id DESC
     LIMIT 1`,
    [taskId, scheduledAt],
  );
  return rows[0] ? rowToLog(rows[0]) : null;
}

export async function updateLogStatus(
  id: number,
  status: TaskStatus,
  completedAt: number | null,
  quickAction: string | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE task_logs
     SET status = $1, completed_at = $2, quick_action = $3
     WHERE id = $4`,
    [status, completedAt, quickAction, id],
  );
}

export async function deleteLogById(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM task_logs WHERE id = $1`, [id]);
}

export async function markPendingMissed(beforeMs: number): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `UPDATE task_logs SET status = 'missed'
     WHERE status = 'pending' AND scheduled_at < $1`,
    [beforeMs],
  );
  return result.rowsAffected;
}

