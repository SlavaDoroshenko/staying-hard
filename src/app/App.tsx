import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./Shell";
import { NotificationRoute } from "./routes/Notification";

// Lazy: keep notification-window bundle minimal. Schedule/Zones/Settings/Stats
// import Tauri plugins (autostart, dialog, fs) — top-level evaluation in the
// notification webview was suspected of crashing the second window's render.
const TodayRoute = lazy(() =>
  import("./routes/Today").then((m) => ({ default: m.TodayRoute })),
);
const ScheduleRoute = lazy(() =>
  import("./routes/Schedule").then((m) => ({ default: m.ScheduleRoute })),
);
const ScheduleEditRoute = lazy(() =>
  import("./routes/Schedule").then((m) => ({ default: m.ScheduleEditRoute })),
);
const ScheduleNewRoute = lazy(() =>
  import("./routes/Schedule").then((m) => ({ default: m.ScheduleNewRoute })),
);
const ZonesRoute = lazy(() =>
  import("./routes/Zones").then((m) => ({ default: m.ZonesRoute })),
);
const ZonesEditRoute = lazy(() =>
  import("./routes/Zones").then((m) => ({ default: m.ZonesEditRoute })),
);
const ZonesNewRoute = lazy(() =>
  import("./routes/Zones").then((m) => ({ default: m.ZonesNewRoute })),
);
const StatsRoute = lazy(() =>
  import("./routes/Stats").then((m) => ({ default: m.StatsRoute })),
);
const SettingsRoute = lazy(() =>
  import("./routes/Settings").then((m) => ({ default: m.SettingsRoute })),
);

export function App() {
  const params = new URLSearchParams(window.location.search);
  const windowKind = params.get("window");

  if (
    windowKind === "notification" ||
    windowKind === "emergency" ||
    windowKind === "review"
  ) {
    return <NotificationRoute />;
  }

  return (
    <HashRouter>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center font-display italic text-muted-foreground">
            …
          </div>
        }
      >
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayRoute />} />
            <Route path="/schedule" element={<ScheduleRoute />} />
            <Route path="/schedule/new" element={<ScheduleNewRoute />} />
            <Route path="/schedule/:id" element={<ScheduleEditRoute />} />
            <Route path="/zones" element={<ZonesRoute />} />
            <Route path="/zones/new" element={<ZonesNewRoute />} />
            <Route path="/zones/:id" element={<ZonesEditRoute />} />
            <Route path="/stats" element={<StatsRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
