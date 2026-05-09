import { NotificationShell } from "@/components/notifications/NotificationShell";
import { EmergencyShell } from "@/components/notifications/EmergencyShell";
import { ReviewShell } from "@/components/notifications/ReviewShell";

export function NotificationRoute() {
  const sp = new URLSearchParams(window.location.search);
  const kind = sp.get("window");
  if (kind === "emergency") return <EmergencyShell />;
  if (kind === "review") return <ReviewShell />;
  return <NotificationShell />;
}
