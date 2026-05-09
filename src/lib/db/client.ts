import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:data.db";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}
