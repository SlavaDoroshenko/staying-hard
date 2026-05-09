import { create } from "zustand";
import { listActiveTasks } from "@/lib/db/tasks";
import { listLogsForRange } from "@/lib/db/logs";
import { todayRangeMs } from "@/lib/time/day";
import type { RecurringTask, TaskLog } from "@/types/task";

interface TodayState {
  tasks: RecurringTask[];
  logs: TaskLog[];
  loading: boolean;
  loadedAt: number | null;
  refresh: () => Promise<void>;
}

export const useTodayStore = create<TodayState>((set) => ({
  tasks: [],
  logs: [],
  loading: false,
  loadedAt: null,
  async refresh() {
    set({ loading: true });
    try {
      const { from, to } = todayRangeMs();
      const [tasks, logs] = await Promise.all([
        listActiveTasks(),
        listLogsForRange(from, to),
      ]);
      set({ tasks, logs, loadedAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },
}));
