import { create } from "zustand";
import type { Update } from "@tauri-apps/plugin-updater";

interface UpdaterState {
  available: Update | null;
  dismissed: boolean;
  setAvailable: (u: Update | null) => void;
  dismiss: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  available: null,
  dismissed: false,
  setAvailable: (available) => set({ available }),
  dismiss: () => set({ dismissed: true }),
}));
