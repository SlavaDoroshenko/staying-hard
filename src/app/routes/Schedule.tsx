import { useParams } from "react-router-dom";
import { TaskListView } from "@/components/schedule/TaskListView";
import { TaskForm } from "@/components/schedule/TaskForm";

const SCHEDULE_CATEGORIES = ["food", "water", "hygiene"] as const;
const SCHEDULE_TYPES = [
  "fixed_times",
  "interval",
  "daily",
  "every_n_days",
] as const;

export function ScheduleRoute() {
  return (
    <TaskListView
      pageCaption="расписание"
      pageTitle="режим дня."
      emptyText="ещё ничего не настроено."
      categories={SCHEDULE_CATEGORIES}
      basePath="/schedule"
      groupByCategory
    />
  );
}

export function ScheduleEditRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <TaskForm
      taskId={id ?? null}
      defaultCategory="food"
      allowedCategories={SCHEDULE_CATEGORIES}
      allowedScheduleTypes={SCHEDULE_TYPES}
      backTo="/schedule"
      caption="редактирование"
      newH1="новая задача."
      titlePlaceholder="например, поесть"
    />
  );
}

export function ScheduleNewRoute() {
  return (
    <TaskForm
      taskId={null}
      defaultCategory="food"
      allowedCategories={SCHEDULE_CATEGORIES}
      allowedScheduleTypes={SCHEDULE_TYPES}
      backTo="/schedule"
      caption="новая задача"
      newH1="новая задача."
      titlePlaceholder="например, поесть"
    />
  );
}
