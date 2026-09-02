import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { localeNativeName, supportedLocales, type LocaleCode } from "../lib/locales";
import { useTranslation } from "react-i18next";

interface Brand {
  id: number;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: VehicleFilters) => void;
  brands?: Brand[];
}

export interface VehicleFilters {
  q?: string;
  makeIds?: number[];
  bodyTypeIds?: number[];
  fuelTypeIds?: number[];
  transmissionIds?: number[];
  colorIds?: number[];
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  condition?: "new" | "like_new" | "used" | "damaged";
  countryCode?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: "created_at" | "price" | "year" | "mileage" | "distance";
  sortDir?: "asc" | "desc";
}

const BODY_TYPES = [
  { id: 1, code: "sedan" },
  { id: 2, code: "hatchback" },
  { id: 3, code: "suv" },
  { id: 4, code: "pickup" },
  { id: 5, code: "coupe" },
  { id: 6, code: "convertible" },
  { id: 7, code: "wagon" },
  { id: 8, code: "van" },
];

const FUEL_TYPES = [
  { id: 1, code: "gasoline" },
  { id: 2, code: "diesel" },
  { id: 3, code: "lpg" },
  { id: 4, code: "hybrid" },
  { id: 5, code: "electric" },
];

const TRANSMISSIONS = [
  { id: 1, code: "manual" },
  { id: 2, code: "automatic" },
  { id: 3, code: "cvt" },
];

const CONDITIONS = [
  { code: "new", label: "Sıfır" },
  { code: "like_new", label: "Sıfır Ayarında" },
  { code: "used", label: "İkinci El" },
  { code: "damaged", label: "Hasarlı" },
] as const;

const COUNTRIES = [
  { code: "TR", name: "Türkiye" },
  { code: "IQ", name: "Irak" },
  { code: "DE", name: "Almanya" },
  { code: "SA", name: "Suudi Arabistan" },
  { code: "AE", name: "BAE" },
  { code: "US", name: "ABD" },
  { code: "GB", name: "İngiltere" },
];

export function FilterSheet({ visible, onClose, onApply, brands = [] }: Props) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<VehicleFilters>({});

  const toggleId = (key: keyof VehicleFilters, id: number) => {
    const current = (filters[key] as number[] | undefined) ?? [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setFilters({ ...filters, [key]: next.length > 0 ? next : undefined });
  };

  const apply = () => {
    onApply(filters);
    onClose();
  };

  const reset = () => {
    setFilters({});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-slate-500 text-base">{t("common.cancel")}</Text>
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">{t("search.filters")}</Text>
          <TouchableOpacity onPress={reset}>
            <Text className="text-primary-600 text-sm">{t("search.reset")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 py-4">
          {/* Search query */}
          <FilterSection title="Arama">
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
              placeholder={t("home.searchPlaceholder")}
              value={filters.q ?? ""}
              onChangeText={(q) => setFilters({ ...filters, q: q || undefined })}
            />
          </FilterSection>

          {/* Make */}
          {brands.length > 0 && (
            <FilterSection title={t("search.make")}>
              <View className="flex-row flex-wrap gap-2">
                {brands.slice(0, 30).map((b) => {
                  const active = filters.makeIds?.includes(b.id);
                  return (
                    <TouchableOpacity
                      key={b.id}
                      className={`px-3 py-2 rounded-full ${
                        active ? "bg-primary-600" : "bg-slate-100"
                      }`}
                      onPress={() => toggleId("makeIds", b.id)}
                    >
                      <Text
                        className={`text-sm ${active ? "text-white font-semibold" : "text-slate-700"}`}
                      >
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterSection>
          )}

          {/* Year range */}
          <FilterSection title={t("search.year")}>
            <View className="flex-row gap-3">
              <TextInput
                className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                placeholder="Min"
                keyboardType="numeric"
                value={filters.minYear ? String(filters.minYear) : ""}
                onChangeText={(v) =>
                  setFilters({ ...filters, minYear: v ? Number(v) : undefined })
                }
              />
              <TextInput
                className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                placeholder="Maks"
                keyboardType="numeric"
                value={filters.maxYear ? String(filters.maxYear) : ""}
                onChangeText={(v) =>
                  setFilters({ ...filters, maxYear: v ? Number(v) : undefined })
                }
              />
            </View>
          </FilterSection>

          {/* Price range */}
          <FilterSection title={t("search.priceRange")}>
            <View className="flex-row gap-3">
              <TextInput
                className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                placeholder="Min"
                keyboardType="numeric"
                value={filters.minPrice ? String(filters.minPrice) : ""}
                onChangeText={(v) =>
                  setFilters({ ...filters, minPrice: v ? Number(v) : undefined })
                }
              />
              <TextInput
                className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-base text-slate-900"
                placeholder="Maks"
                keyboardType="numeric"
                value={filters.maxPrice ? String(filters.maxPrice) : ""}
                onChangeText={(v) =>
                  setFilters({ ...filters, maxPrice: v ? Number(v) : undefined })
                }
              />
            </View>
          </FilterSection>

          {/* Body type */}
          <FilterSection title={t("search.bodyType")}>
            <View className="flex-row flex-wrap gap-2">
              {BODY_TYPES.map((b) => {
                const active = filters.bodyTypeIds?.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    className={`px-3 py-2 rounded-full ${
                      active ? "bg-primary-600" : "bg-slate-100"
                    }`}
                    onPress={() => toggleId("bodyTypeIds", b.id)}
                  >
                    <Text
                      className={`text-sm capitalize ${active ? "text-white font-semibold" : "text-slate-700"}`}
                    >
                      {b.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Fuel */}
          <FilterSection title={t("search.fuel")}>
            <View className="flex-row flex-wrap gap-2">
              {FUEL_TYPES.map((f) => {
                const active = filters.fuelTypeIds?.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    className={`px-3 py-2 rounded-full ${
                      active ? "bg-primary-600" : "bg-slate-100"
                    }`}
                    onPress={() => toggleId("fuelTypeIds", f.id)}
                  >
                    <Text
                      className={`text-sm capitalize ${active ? "text-white font-semibold" : "text-slate-700"}`}
                    >
                      {f.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Transmission */}
          <FilterSection title={t("search.transmission")}>
            <View className="flex-row flex-wrap gap-2">
              {TRANSMISSIONS.map((tr) => {
                const active = filters.transmissionIds?.includes(tr.id);
                return (
                  <TouchableOpacity
                    key={tr.id}
                    className={`px-3 py-2 rounded-full ${
                      active ? "bg-primary-600" : "bg-slate-100"
                    }`}
                    onPress={() => toggleId("transmissionIds", tr.id)}
                  >
                    <Text
                      className={`text-sm capitalize ${active ? "text-white font-semibold" : "text-slate-700"}`}
                    >
                      {tr.code.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Condition */}
          <FilterSection title="Durum">
            <View className="flex-row flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const active = filters.condition === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    className={`px-3 py-2 rounded-full ${
                      active ? "bg-primary-600" : "bg-slate-100"
                    }`}
                    onPress={() =>
                      setFilters({
                        ...filters,
                        condition: active ? undefined : (c.code as VehicleFilters["condition"]),
                      })
                    }
                  >
                    <Text
                      className={`text-sm ${active ? "text-white font-semibold" : "text-slate-700"}`}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Country */}
          <FilterSection title={t("search.country")}>
            <View className="flex-row flex-wrap gap-2">
              {COUNTRIES.map((c) => {
                const active = filters.countryCode === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    className={`px-3 py-2 rounded-full ${
                      active ? "bg-primary-600" : "bg-slate-100"
                    }`}
                    onPress={() =>
                      setFilters({
                        ...filters,
                        countryCode: active ? undefined : c.code,
                      })
                    }
                  >
                    <Text
                      className={`text-sm ${active ? "text-white font-semibold" : "text-slate-700"}`}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>

          {/* Sort */}
          <FilterSection title="Sıralama">
            <View className="flex-row flex-wrap gap-2">
              {[
                { key: "created_at", label: "En Yeni" },
                { key: "price", label: "Fiyat" },
                { key: "year", label: "Yıl" },
                { key: "mileage", label: "KM" },
              ].map((s) => {
                const active = filters.sortBy === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    className={`px-3 py-2 rounded-full ${
                      active ? "bg-primary-600" : "bg-slate-100"
                    }`}
                    onPress={() => setFilters({ ...filters, sortBy: s.key as VehicleFilters["sortBy"] })}
                  >
                    <Text
                      className={`text-sm ${active ? "text-white font-semibold" : "text-slate-700"}`}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View className="flex-row gap-2 mt-2">
              {["asc", "desc"].map((d) => {
                const active = filters.sortDir === d;
                return (
                  <TouchableOpacity
                    key={d}
                    className={`flex-1 py-2 rounded-lg ${active ? "bg-primary-600" : "bg-slate-100"}`}
                    onPress={() => setFilters({ ...filters, sortDir: d as "asc" | "desc" })}
                  >
                    <Text
                      className={`text-center text-sm ${active ? "text-white font-semibold" : "text-slate-700"}`}
                    >
                      {d === "asc" ? "Artan ↑" : "Azalan ↓"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>
        </ScrollView>

        <View className="px-5 py-4 border-t border-slate-200">
          <TouchableOpacity
            className="bg-primary-600 rounded-2xl py-4 items-center"
            style={{ backgroundColor: "#0284C7" }}
            onPress={apply}
          >
            <Text className="text-white font-bold text-base">{t("search.apply")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-slate-700 mb-2">{title}</Text>
      {children}
    </View>
  );
}