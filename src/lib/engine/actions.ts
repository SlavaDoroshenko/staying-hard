import { invoke } from "@tauri-apps/api/core";
import {
  deleteLogById,
  getLogByTaskAndSlot,
  insertLog,
  updateLogStatus,
} from "@/lib/db/logs";
import type { TaskStatus } from "@/types/task";

export interface ResolveInput {
  taskId: string;
  scheduledAt: number;
  status: Extract<TaskStatus, "completed" | "skipped" | "missed">;
  quickAction?: string;
}

function notifLabel(taskId: string, scheduledAt: number) {
  return `notif-${taskId}-${scheduledAt}`;
}

export async function resolveNotification(input: ResolveInput): Promise<void> {
  // If the engine already inserted a pending log when it fired this slot,
  // UPDATE it. Otherwise (user pre-completed before the engine fired) INSERT.
  // One log per (task, scheduledAt) — no double-logging, no phantom "missed".
  const existing = await getLogByTaskAndSlot(input.taskId, input.scheduledAt);
  const completedAt = input.status === "completed" ? Date.now() : null;
  const quickAction = input.quickAction ?? null;

  if (existing && existing.id != null) {
    await updateLogStatus(existing.id, input.status, completedAt, quickAction);
  } else {
    await insertLog({
      taskId: input.taskId,
      scheduledAt: input.scheduledAt,
      completedAt,
      status: input.status,
      quickAction,
    });
  }

  const label = notifLabel(input.taskId, input.scheduledAt);
  // Allow CloseRequested to actually close hard windows.
  await invoke("mark_notification_resolved", { label });
  await invoke("close_notification_window", { label });
}

/**
 * Undo a completion. Deletes the log for (task, slot) entirely. With the
 * single-log model the slot just disappears — no leftover pending → missed
 * sweep, no phantom "missed" row appearing after the user undoes.
 */
export async function unresolveCompletion(input: {
  taskId: string;
  scheduledAt: number;
}): Promise<void> {
  const existing = await getLogByTaskAndSlot(input.taskId, input.scheduledAt);
  if (existing && existing.id != null) {
    await deleteLogById(existing.id);
  }
}
