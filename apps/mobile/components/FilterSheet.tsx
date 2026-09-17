import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { BrandLogo } from "./BrandLogo";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";
import { colors, fonts, radius, space } from "../lib/theme";

interface Brand {
  id: number;
  name: string;
  name_en?: string | null;
  logo_url?: string | null;
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
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.cancel}>{t("common.cancel")}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("search.filters")}</Text>
          <TouchableOpacity onPress={reset} hitSlop={8}>
            <Text style={styles.reset}>{t("search.reset")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
          <FilterSection title="Arama">
            <Field
              placeholder={t("home.searchPlaceholder")}
              value={filters.q ?? ""}
              onChangeText={(q) => setFilters({ ...filters, q: q || undefined })}
              containerStyle={styles.fieldFlush}
            />
          </FilterSection>

          {/* Make */}
          {brands.length > 0 && (
            <FilterSection title={t("search.make")}>
              <View style={styles.brandGrid}>
                {brands.slice(0, 30).map((b) => {
                  const active = filters.makeIds?.includes(b.id);
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.brandCell, active && styles.brandCellActive]}
                      onPress={() => toggleId("makeIds", b.id)}
                      activeOpacity={0.85}
                    >
                      <BrandLogo
                        name={b.name}
                        nameEn={b.name_en}
                        logoUrl={b.logo_url}
                        size={40}
                      />
                      <Text
                        style={[styles.brandCellName, active && styles.brandCellNameActive]}
                        numberOfLines={1}
                      >
                        {b.name.replace("Mercedes-Benz", "Mercedes")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </FilterSection>
          )}

          {/* Year range */}
          <FilterSection title={t("search.year")}>
            <View style={styles.rangeRow}>
              <RangeInput
                placeholder="Min"
                value={filters.minYear ? String(filters.minYear) : ""}
                onChangeText={(v) => setFilters({ ...filters, minYear: v ? Number(v) : undefined })}
              />
              <RangeInput
                placeholder="Maks"
                value={filters.maxYear ? String(filters.maxYear) : ""}
                onChangeText={(v) => setFilters({ ...filters, maxYear: v ? Number(v) : undefined })}
              />
            </View>
          </FilterSection>

          <FilterSection title={t("search.priceRange")}>
            <View style={styles.rangeRow}>
              <RangeInput
                placeholder="Min"
                value={filters.minPrice ? String(filters.minPrice) : ""}
                onChangeText={(v) => setFilters({ ...filters, minPrice: v ? Number(v) : undefined })}
              />
              <RangeInput
                placeholder="Maks"
                value={filters.maxPrice ? String(filters.maxPrice) : ""}
                onChangeText={(v) => setFilters({ ...filters, maxPrice: v ? Number(v) : undefined })}
              />
            </View>
          </FilterSection>

          <FilterSection title={t("search.bodyType")}>
            <View style={styles.chipRow}>
              {BODY_TYPES.map((b) => {
                const active = filters.bodyTypeIds?.includes(b.id);
                return (
                  <FilterChip
                    key={b.id}
                    active={!!active}
                    label={b.code}
                    onPress={() => toggleId("bodyTypeIds", b.id)}
                  />
                );
              })}
            </View>
          </FilterSection>

          <FilterSection title={t("search.fuel")}>
            <View style={styles.chipRow}>
              {FUEL_TYPES.map((f) => {
                const active = filters.fuelTypeIds?.includes(f.id);
                return (
                  <FilterChip
                    key={f.id}
                    active={!!active}
                    label={f.code}
                    onPress={() => toggleId("fuelTypeIds", f.id)}
                  />
                );
              })}
            </View>
          </FilterSection>

          <FilterSection title={t("search.transmission")}>
            <View style={styles.chipRow}>
              {TRANSMISSIONS.map((tr) => {
                const active = filters.transmissionIds?.includes(tr.id);
                return (
                  <FilterChip
                    key={tr.id}
                    active={!!active}
                    label={tr.code.replace("_", " ")}
                    onPress={() => toggleId("transmissionIds", tr.id)}
                  />
                );
              })}
            </View>
          </FilterSection>

          <FilterSection title="Durum">
            <View style={styles.chipRow}>
              {CONDITIONS.map((c) => {
                const active = filters.condition === c.code;
                return (
                  <FilterChip
                    key={c.code}
                    active={!!active}
                    label={c.label}
                    onPress={() =>
                      setFilters({
                        ...filters,
                        condition: active ? undefined : (c.code as VehicleFilters["condition"]),
                      })
                    }
                  />
                );
              })}
            </View>
          </FilterSection>

          <FilterSection title={t("search.country")}>
            <View style={styles.chipRow}>
              {COUNTRIES.map((c) => {
                const active = filters.countryCode === c.code;
                return (
                  <FilterChip
                    key={c.code}
                    active={!!active}
                    label={c.name}
                    onPress={() =>
                      setFilters({
                        ...filters,
                        countryCode: active ? undefined : c.code,
                      })
                    }
                  />
                );
              })}
            </View>
          </FilterSection>

          <FilterSection title="Sıralama">
            <View style={styles.chipRow}>
              {[
                { key: "created_at", label: "En Yeni" },
                { key: "price", label: "Fiyat" },
                { key: "year", label: "Yıl" },
                { key: "mileage", label: "KM" },
              ].map((s) => {
                const active = filters.sortBy === s.key;
                return (
                  <FilterChip
                    key={s.key}
                    active={!!active}
                    label={s.label}
                    onPress={() => setFilters({ ...filters, sortBy: s.key as VehicleFilters["sortBy"] })}
                  />
                );
              })}
            </View>
            <View style={styles.sortDirRow}>
              {(["asc", "desc"] as const).map((d) => {
                const active = filters.sortDir === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.sortDirBtn, active && styles.sortDirBtnActive]}
                    onPress={() => setFilters({ ...filters, sortDir: d })}
                  >
                    <Text style={[styles.sortDirText, active && styles.sortDirTextActive]}>
                      {d === "asc" ? "Artan ↑" : "Azalan ↓"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FilterSection>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={t("search.reset")}
            variant="ghost"
            onPress={reset}
            style={styles.footerGhost}
          />
          <Button
            label={t("search.apply")}
            variant="primary"
            onPress={apply}
            style={styles.footerPrimary}
          />
        </View>
      </View>
    </Modal>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RangeInput({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <TextInput
      style={styles.rangeInput}
      placeholder={placeholder}
      placeholderTextColor={colors.inkFaint}
      keyboardType="numeric"
      value={value}
      onChangeText={onChangeText}
    />
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.xl, paddingVertical: space.lg, paddingBottom: space.xxl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  cancel: { fontFamily: fonts.body, fontSize: 15, color: colors.inkFaint },
  headerTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  reset: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.flame },
  section: { marginBottom: space.xxl },
  sectionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.inkFaint,
    marginBottom: space.md,
    textTransform: "uppercase",
    letterSpacing: 0.55,
  },
  fieldFlush: { marginBottom: 0 },
  brandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  brandCell: {
    width: "23%",
    minWidth: 72,
    flexGrow: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  brandCellActive: {
    borderColor: colors.flame,
    backgroundColor: colors.flameSoft,
  },
  brandCellName: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: "center",
  },
  brandCellNameActive: {
    fontFamily: fonts.bodySemi,
    color: colors.flameDeep,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  chipText: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: colors.inkMuted,
    textTransform: "capitalize",
  },
  chipTextActive: {
    fontFamily: fonts.bodySemi,
    color: colors.white,
  },
  rangeRow: { flexDirection: "row", gap: space.md },
  rangeInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  sortDirRow: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  sortDirBtn: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
  },
  sortDirBtnActive: {
    backgroundColor: colors.flame,
    borderColor: colors.flame,
  },
  sortDirText: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.inkMuted },
  sortDirTextActive: { fontFamily: fonts.bodySemi, color: colors.white },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  footerGhost: { flex: 1 },
  footerPrimary: { flex: 2 },
});