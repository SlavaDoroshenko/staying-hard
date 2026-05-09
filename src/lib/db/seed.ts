import { computeNextFire } from "@/lib/schedule/next-fire";
import type { NewTaskInput } from "./tasks";
import { countTasks, insertTask } from "./tasks";

export const DEFAULT_TASKS: NewTaskInput[] = [
  {
    id: "food-default",
    category: "food",
    title: "Поесть",
    schedule: {
      type: "fixed_times",
      times: ["13:00", "17:00", "21:00", "01:00"],
    },
    notificationLevel: "soft",
  },
  {
    id: "water-default",
    category: "water",
    title: "Выпить воды",
    schedule: {
      type: "interval",
      intervalMinutes: 90,
      activeFrom: "12:00",
      activeTo: "03:00",
    },
    notificationLevel: "soft",
  },
  {
    id: "shower-default",
    category: "hygiene",
    title: "Душ",
    schedule: { type: "daily", time: "12:30" },
    notificationLevel: "hard",
  },
  {
    id: "teeth-morning-default",
    category: "hygiene",
    title: "Зубы (утром)",
    schedule: { type: "daily", time: "12:35" },
    notificationLevel: "soft",
  },
  {
    id: "teeth-evening-default",
    category: "hygiene",
    title: "Зубы (вечером)",
    schedule: { type: "daily", time: "02:30" },
    notificationLevel: "soft",
  },
  {
    id: "trash-default",
    category: "cleaning",
    title: "Вынести мусор",
    schedule: { type: "every_n_days", n: 1, time: "22:00" },
    notificationLevel: "hard",
    estimateMinutes: 5,
  },
  {
    id: "dishes-default",
    category: "cleaning",
    title: "Помыть посуду",
    schedule: { type: "every_n_days", n: 1, time: "22:00" },
    notificationLevel: "hard",
    estimateMinutes: 10,
  },
  {
    id: "desk-default",
    category: "cleaning",
    title: "Прибраться на столе",
    schedule: { type: "every_n_days", n: 1, time: "22:00" },
    notificationLevel: "soft",
    estimateMinutes: 5,
  },
  {
    id: "bed-default",
    category: "cleaning",
    title: "Заправить постель",
    schedule: { type: "daily", time: "13:00" },
    notificationLevel: "soft",
    estimateMinutes: 2,
  },
  {
    id: "floor-default",
    category: "cleaning",
    title: "Вымыть пол",
    schedule: { type: "every_n_days", n: 3, time: "22:00" },
    notificationLevel: "hard",
    estimateMinutes: 20,
  },
  {
    id: "bathroom-default",
    category: "cleaning",
    title: "Помыть ванную",
    schedule: { type: "every_n_days", n: 7, time: "22:00" },
    notificationLevel: "hard",
    estimateMinutes: 30,
  },
  {
    id: "fridge-default",
    category: "cleaning",
    title: "Холодильник: выкинуть просрочку",
    schedule: { type: "every_n_days", n: 7, time: "22:00" },
    notificationLevel: "soft",
    estimateMinutes: 10,
  },
  {
    id: "linens-default",
    category: "cleaning",
    title: "Сменить постельное бельё",
    schedule: { type: "every_n_days", n: 14, time: "22:00" },
    notificationLevel: "hard",
    estimateMinutes: 15,
  },
];

export async function seedDefaultsIfEmpty(now: Date = new Date()): Promise<void> {
  const existing = await countTasks();
  if (existing > 0) return;
  for (const t of DEFAULT_TASKS) {
    const nextFireAt = computeNextFire(t.schedule, now);
    await insertTask({ ...t, nextFireAt });
  }
}
