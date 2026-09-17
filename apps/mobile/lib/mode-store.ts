import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const KEY = "seyyare.mode_gate_v3";

export type AppMode = "buy" | "rent" | "ride" | "sell";

type ModeState = {
  hydrated: boolean;
  /** False until user picks a mode at least once (first entry gate). */
  hasChosen: boolean;
  lastMode: AppMode | null;
  hydrate: () => Promise<void>;
  choose: (mode: AppMode) => Promise<void>;
  resetGate: () => Promise<void>;
};

export const useModeStore = create<ModeState>((set) => ({
  hydrated: false,
  hasChosen: false,
  lastMode: null,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) {
        set({ hydrated: true, hasChosen: false, lastMode: null });
        return;
      }
      const parsed = JSON.parse(raw) as { hasChosen?: boolean; lastMode?: AppMode };
      set({
        hydrated: true,
        hasChosen: Boolean(parsed.hasChosen),
        lastMode: parsed.lastMode ?? null,
      });
    } catch {
      set({ hydrated: true, hasChosen: false, lastMode: null });
    }
  },
  choose: async (mode) => {
    const next = { hasChosen: true, lastMode: mode };
    set({ ...next });
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  },
  resetGate: async () => {
    set({ hasChosen: false, lastMode: null });
    await AsyncStorage.removeItem(KEY);
  },
}));
