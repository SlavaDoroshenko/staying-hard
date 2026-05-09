import { getDb } from "./client";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function getBoolSetting(
  key: string,
  fallback: boolean,
): Promise<boolean> {
  const v = await getSetting(key);
  if (v === null) return fallback;
  return v === "1" || v === "true";
}

export async function setBoolSetting(
  key: string,
  value: boolean,
): Promise<void> {
  await setSetting(key, value ? "1" : "0");
}
