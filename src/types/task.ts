import { z } from "zod";

export const TASK_CATEGORIES = ["food", "water", "hygiene", "cleaning"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const NOTIFICATION_LEVELS = ["soft", "hard"] as const;
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

export const TASK_STATUSES = [
  "pending",
  "completed",
  "skipped",
  "missed",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

const TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM expected");

export const ScheduleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fixed_times"),
    times: z.array(TimeStringSchema).min(1),
  }),
  z.object({
    type: z.literal("interval"),
    intervalMinutes: z.number().int().positive(),
    activeFrom: TimeStringSchema,
    activeTo: TimeStringSchema,
  }),
  z.object({
    type: z.literal("daily"),
    time: TimeStringSchema,
  }),
  z.object({
    type: z.literal("every_n_days"),
    n: z.number().int().positive(),
    time: TimeStringSchema,
  }),
]);
export type Schedule = z.infer<typeof ScheduleSchema>;

export const RecurringTaskSchema = z.object({
  id: z.string(),
  category: z.enum(TASK_CATEGORIES),
  title: z.string().min(1),
  schedule: ScheduleSchema,
  notificationLevel: z.enum(NOTIFICATION_LEVELS),
  active: z.boolean(),
  estimateMinutes: z.number().int().positive().nullable().optional(),
  nextFireAt: z.number().int().nullable().optional(),
  lastFireAt: z.number().int().nullable().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type RecurringTask = z.infer<typeof RecurringTaskSchema>;

export const TaskLogSchema = z.object({
  id: z.number().int().optional(),
  taskId: z.string(),
  scheduledAt: z.number().int(),
  completedAt: z.number().int().nullable(),
  status: z.enum(TASK_STATUSES),
  quickAction: z.string().nullable().optional(),
});
export type TaskLog = z.infer<typeof TaskLogSchema>;

export const CATEGORY_LABEL_RU: Record<TaskCategory, string> = {
  food: "Еда",
  water: "Вода",
  hygiene: "Гигиена",
  cleaning: "Уборка",
};
