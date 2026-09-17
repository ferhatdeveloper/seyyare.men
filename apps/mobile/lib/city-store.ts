import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

/** Persisted marketplace city preference */
export const CITY_STORAGE_KEY = "seyyare.city_v1";

export const MARKET_CITIES = [
  "Baghdad",
  "Erbil",
  "Basra",
  "Mosul",
  "Sulaymaniyah",
  "Kirkuk",
  "Duhok",
] as const;

export type MarketCity = (typeof MARKET_CITIES)[number];
export type SelectedCity = MarketCity | "all";

function parseCity(raw: string | null | undefined): SelectedCity {
  if (!raw || raw === "all") return "all";
  if ((MARKET_CITIES as readonly string[]).includes(raw)) return raw as MarketCity;
  return "all";
}

type CityState = {
  hydrated: boolean;
  city: SelectedCity;
  hydrate: () => Promise<void>;
  setCity: (city: SelectedCity) => Promise<void>;
};

export const useCityStore = create<CityState>((set) => ({
  hydrated: false,
  city: "all",
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(CITY_STORAGE_KEY);
      set({ hydrated: true, city: parseCity(raw) });
    } catch {
      set({ hydrated: true, city: "all" });
    }
  },
  setCity: async (city) => {
    set({ city });
    await AsyncStorage.setItem(CITY_STORAGE_KEY, city);
  },
}));
