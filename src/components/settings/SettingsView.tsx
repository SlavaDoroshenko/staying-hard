import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { exportToJson, importFromJson } from "@/lib/backup";
import {
  getBoolSetting,
  setBoolSetting,
} from "@/lib/db/settings";
import { cn } from "@/lib/cn";

const SOUND_KEY = "sound_enabled";
const APP_VERSION = "0.1.0";

export function SettingsView() {
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [sound, setSound] = useState<boolean | null>(null);
  const [busyAuto, setBusyAuto] = useState(false);
  const [busySound, setBusySound] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => setAutostart(false));
    getBoolSetting(SOUND_KEY, true).then(setSound).catch(() => setSound(true));
  }, []);

  async function toggleAutostart() {
    if (autostart === null || busyAuto) return;
    setBusyAuto(true);
    try {
      if (autostart) await disable();
      else await enable();
      setAutostart(!autostart);
    } catch (err) {
      console.error(err);
    } finally {
      setBusyAuto(false);
    }
  }

  async function toggleSound() {
    if (sound === null || busySound) return;
    setBusySound(true);
    try {
      const next = !sound;
      await setBoolSetting(SOUND_KEY, next);
      setSound(next);
    } finally {
      setBusySound(false);
    }
  }

  async function runExport() {
    setExportStatus(null);
    try {
      const res = await exportToJson();
      if (res) setExportStatus("сохранено.");
    } catch (err) {
      console.error(err);
      setExportStatus("ошибка.");
    }
  }

  async function runImport() {
    setImportStatus(null);
    try {
      const res = await importFromJson();
      if (res) {
        setImportStatus(
          `загружено: ${res.imported.tasks} задач, ${res.imported.logs} логов.`,
        );
      }
    } catch (err) {
      console.error(err);
      setImportStatus(err instanceof Error ? err.message : "ошибка.");
    }
  }

  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  async function runReset() {
    if (resetBusy) return;
    setResetBusy(true);
    try {
      await invoke("reset_database");
      // App restarts; control never returns. If it does (failure), keep UI live.
    } catch (err) {
      console.error(err);
      setResetBusy(false);
      setResetConfirming(false);
    }
  }

  async function testNotif() {
    try {
      await invoke("open_notification_window", {
        payload: {
          taskId: "__test__",
          title: "тест",
          category: "food",
          level: "soft",
          scheduledAt: Date.now(),
          estimateMinutes: null,
        },
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function testEmergency() {
    try {
      await invoke("open_emergency_window", {
        payload: {
          category: "food",
          daysWithout: 3,
          message:
            "3 дня без полноценной еды. Тело работает на резервах. Закажи доставку — это две минуты.",
        },
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function testReview() {
    try {
      const data = {
        food: { done: 4, total: 7 },
        hygiene: { done: 5, total: 7 },
        cleaning: { done: 6, total: 7 },
        topMissed: { title: "поесть", dayName: "в среду" },
      };
      await invoke("open_review_window", {
        dataJson: encodeURIComponent(JSON.stringify(data)),
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] px-12 py-16">
      <header className="mb-12">
        <div className="caption">настройки</div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.02em]">
          поведение и данные.
        </h1>
      </header>

      <section className="mb-12">
        <div className="caption mb-4">поведение</div>

        <Row
          label="запускать при старте системы"
          hint="иначе нотификации не сработают, пока ты сам не откроешь приложение"
          value={autostart}
          onClick={toggleAutostart}
          busy={busyAuto}
        />
        <Row
          label="звук при уведомлении"
          hint="мягкий beep при появлении окна"
          value={sound}
          onClick={toggleSound}
          busy={busySound}
        />

        <div className="mt-6 flex flex-col gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <button
            type="button"
            onClick={testNotif}
            className="self-start hover:text-foreground"
          >
            → запустить тест-уведомление
          </button>
          <button
            type="button"
            onClick={testEmergency}
            className="self-start hover:text-foreground"
          >
            → тест аварийного режима
          </button>
          <button
            type="button"
            onClick={testReview}
            className="self-start hover:text-foreground"
          >
            → тест воскресного обзора
          </button>
        </div>
      </section>

      <section className="mb-12">
        <div className="caption mb-4">данные</div>
        <div className="space-y-3">
          <ActionRow
            label="экспортировать в json"
            hint="все задачи, логи и настройки одним файлом"
            onClick={runExport}
            status={exportStatus}
          />
          <ActionRow
            label="импортировать из json"
            hint="заменит текущие данные"
            onClick={runImport}
            status={importStatus}
            destructive
          />
          {resetConfirming ? (
            <div className="flex items-baseline justify-between gap-6 border-b border-border/40 py-3">
              <div className="min-w-0 flex-1">
                <span className="block text-[15px] text-destructive">
                  точно сбросить? все локальные задачи и логи удалятся.
                </span>
                <span className="mt-1 block font-mono text-[12px] text-faint-foreground">
                  бэкап БД останется в data.db.backup-*
                </span>
              </div>
              <div className="flex shrink-0 gap-3 font-mono text-[11px] uppercase tracking-[0.16em]">
                <button
                  type="button"
                  onClick={runReset}
                  disabled={resetBusy}
                  className="text-destructive hover:text-foreground"
                >
                  {resetBusy ? "сбрасываю…" : "да, сбросить"}
                </button>
                <button
                  type="button"
                  onClick={() => setResetConfirming(false)}
                  disabled={resetBusy}
                  className="text-muted-foreground hover:text-foreground"
                >
                  отмена
                </button>
              </div>
            </div>
          ) : (
            <ActionRow
              label="сбросить локальную базу"
              hint="полное стирание + перезапуск приложения. крайняя мера, если база сломана."
              onClick={() => setResetConfirming(true)}
              status={null}
              destructive
            />
          )}
        </div>
      </section>

      <section>
        <div className="caption mb-4">о приложении</div>
        <dl className="grid grid-cols-[140px_1fr] gap-y-2 font-mono text-[12px] tabular-nums">
          <dt className="text-faint-foreground">version</dt>
          <dd className="text-muted-foreground">{APP_VERSION}</dd>
          <dt className="text-faint-foreground">channel</dt>
          <dd className="text-muted-foreground">stable</dd>
          <dt className="text-faint-foreground">storage</dt>
          <dd className="text-muted-foreground">sqlite (local)</dd>
        </dl>
      </section>
    </div>
  );
}

function Row({
  label,
  hint,
  value,
  onClick,
  busy,
}: {
  label: string;
  hint: string;
  value: boolean | null;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={value === null || busy}
      className="group flex w-full items-center justify-between gap-6 border-b border-border/40 py-3 text-left disabled:opacity-50"
    >
      <div className="min-w-0 flex-1">
        <span className="block text-[15px] text-foreground transition-colors group-hover:text-accent">
          {label}
        </span>
        <span className="mt-1 block font-mono text-[12px] text-faint-foreground">
          {hint}
        </span>
      </div>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          value ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-foreground shadow-sm transition-transform",
            value ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function ActionRow({
  label,
  hint,
  onClick,
  status,
  destructive = false,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  status: string | null;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-baseline justify-between gap-6 border-b border-border/40 py-3 text-left"
    >
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] transition-colors",
            destructive
              ? "text-foreground group-hover:text-destructive"
              : "text-foreground group-hover:text-accent",
          )}
        >
          {label}
        </span>
        <span className="mt-1 block font-mono text-[12px] text-faint-foreground">
          {hint}
          {status && (
            <>
              {" · "}
              <span className="text-muted-foreground">{status}</span>
            </>
          )}
        </span>
      </div>
      <span
        aria-hidden
        className={cn(
          "font-mono text-[12px] text-faint-foreground transition-colors",
          destructive
            ? "group-hover:text-destructive"
            : "group-hover:text-accent",
        )}
      >
        →
      </span>
    </button>
  );
}
