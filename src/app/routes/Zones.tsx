import { useParams } from "react-router-dom";
import { TaskListView } from "@/components/schedule/TaskListView";
import { TaskForm } from "@/components/schedule/TaskForm";

const ZONE_CATEGORIES = ["cleaning"] as const;
// Cleaning zones don't have multiple slots-per-day or short intervals — only
// "daily" and "every N days" make sense. Hides confusing options.
const ZONE_SCHEDULE_TYPES = ["daily", "every_n_days"] as const;

export function ZonesRoute() {
  return (
    <TaskListView
      pageCaption="уборка"
      pageTitle="зоны и частота."
      emptyText="ни одной зоны."
      categories={ZONE_CATEGORIES}
      basePath="/zones"
      groupByCategory={false}
    />
  );
}

export function ZonesEditRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <TaskForm
      taskId={id ?? null}
      defaultCategory="cleaning"
      allowedCategories={ZONE_CATEGORIES}
      allowedScheduleTypes={ZONE_SCHEDULE_TYPES}
      backTo="/zones"
      caption="редактирование зоны"
      newH1="новая зона."
      titlePlaceholder="например, помыть пол"
    />
  );
}

export function ZonesNewRoute() {
  return (
    <TaskForm
      taskId={null}
      defaultCategory="cleaning"
      allowedCategories={ZONE_CATEGORIES}
      allowedScheduleTypes={ZONE_SCHEDULE_TYPES}
      backTo="/zones"
      caption="новая зона"
      newH1="новая зона."
      titlePlaceholder="например, помыть пол"
    />
  );
}
