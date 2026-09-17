import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const KEY = "seyyare.driver_intent_v1";

type DriverState = {
  hydrated: boolean;
  isDriver: boolean;
  hydrate: () => Promise<void>;
  setDriver: (value: boolean) => Promise<void>;
};

export const useDriverStore = create<DriverState>((set) => ({
  hydrated: false,
  isDriver: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ hydrated: true, isDriver: raw === "1" });
    } catch {
      set({ hydrated: true, isDriver: false });
    }
  },
  setDriver: async (value) => {
    set({ isDriver: value });
    if (value) await AsyncStorage.setItem(KEY, "1");
    else await AsyncStorage.removeItem(KEY);
  },
}));
