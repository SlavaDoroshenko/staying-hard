import { save, open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { getDb } from "./db/client";
import {
  insertTask,
  listAllTasks,
  type NewTaskInput,
} from "./db/tasks";
import { insertLog, listLogsForRange } from "./db/logs";

const SCHEMA_VERSION = 1;

export interface BackupBundle {
  schemaVersion: number;
  exportedAt: number;
  tasks: ReturnType<typeof tasksToJson>;
  logs: Awaited<ReturnType<typeof listLogsForRange>>;
  settings: { key: string; value: string }[];
}

function tasksToJson(tasks: Awaited<ReturnType<typeof listAllTasks>>) {
  return tasks.map((t) => ({
    id: t.id,
    category: t.category,
    title: t.title,
    schedule: t.schedule,
    notificationLevel: t.notificationLevel,
    active: t.active,
    estimateMinutes: t.estimateMinutes ?? null,
    nextFireAt: t.nextFireAt ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function exportToJson(): Promise<{ path: string } | null> {
  const path = await save({
    title: "Куда сохранить бэкап?",
    defaultPath: `staying-hard-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path) return null;

  const db = await getDb();
  const tasks = await listAllTasks();
  const allLogs = await listLogsForRange(0, Date.now() + 365 * 24 * 60 * 60 * 1000);
  const settingsRows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings",
  );

  const bundle: BackupBundle = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    tasks: tasksToJson(tasks),
    logs: allLogs,
    settings: settingsRows,
  };

  await writeTextFile(path, JSON.stringify(bundle, null, 2));
  return { path };
}

export async function importFromJson(): Promise<{
  imported: { tasks: number; logs: number; settings: number };
} | null> {
  const path = await open({
    title: "Какой бэкап импортировать?",
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path || typeof path !== "string") return null;

  const raw = await readTextFile(path);
  const bundle: BackupBundle = JSON.parse(raw);
  if (bundle.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `несовместимая версия бэкапа: ${bundle.schemaVersion}, ожидаем ${SCHEMA_VERSION}`,
    );
  }

  const db = await getDb();
  // Wrap the destructive wipe + insert in a single transaction. If any
  // INSERT fails midway, ROLLBACK leaves the existing DB untouched — the
  // user doesn't end up with a half-imported database.
  await db.execute("BEGIN TRANSACTION");

  let tCount = 0;
  let lCount = 0;
  let sCount = 0;

  try {
    await db.execute("DELETE FROM task_logs");
    await db.execute("DELETE FROM tasks");
    await db.execute("DELETE FROM settings");

    for (const t of bundle.tasks) {
      const input: NewTaskInput = {
        id: t.id,
        category: t.category,
        title: t.title,
        schedule: t.schedule,
        notificationLevel: t.notificationLevel,
        active: t.active,
        estimateMinutes: t.estimateMinutes,
        nextFireAt: t.nextFireAt,
      };
      await insertTask(input);
      tCount++;
    }

    for (const log of bundle.logs) {
      await insertLog({
        taskId: log.taskId,
        scheduledAt: log.scheduledAt,
        completedAt: log.completedAt,
        status: log.status,
        quickAction: log.quickAction ?? null,
      });
      lCount++;
    }

    for (const s of bundle.settings) {
      await db.execute(
        `INSERT INTO settings (key, value) VALUES ($1, $2)`,
        [s.key, s.value],
      );
      sCount++;
    }

    await db.execute("COMMIT");
  } catch (err) {
    try {
      await db.execute("ROLLBACK");
    } catch {
      /* swallow — original error matters more */
    }
    throw err;
  }

  return { imported: { tasks: tCount, logs: lCount, settings: sCount } };
}
