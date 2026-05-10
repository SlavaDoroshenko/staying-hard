import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { UpdateBanner } from "@/components/UpdateBanner";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/today", label: "сегодня" },
  { to: "/schedule", label: "расписание" },
  { to: "/zones", label: "уборка" },
  { to: "/stats", label: "статистика" },
  { to: "/settings", label: "настройки" },
] as const;

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function Shell() {
  const now = useNow();

  return (
    <div className="flex h-full bg-background">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-border/60 px-5 py-7">
        <div>
          <div className="caption">staying hard</div>
          <nav className="mt-12 flex flex-col gap-1 text-[15px]">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 py-1.5 transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        "h-1 w-1 rounded-full transition-all",
                        isActive
                          ? "bg-accent shadow-[0_0_10px_hsl(var(--accent)/0.55)]"
                          : "bg-transparent",
                      )}
                    />
                    <span className="font-body">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-1">
          <div className="caption">сейчас</div>
          <div className="font-mono text-[15px] tabular-nums text-foreground">
            {pad(now.getHours())}:{pad(now.getMinutes())}
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <UpdateBanner />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
