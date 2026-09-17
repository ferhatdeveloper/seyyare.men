import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "../../components/BrandLogo";
import { VehicleCard, type VehicleListItem } from "../../components/VehicleCard";
import { type VehicleFilters } from "../../components/FilterSheet";
import { api } from "../../lib/api";
import { withBrandLogos } from "../../lib/brand-logos";
import { colors, fonts, radius, space } from "../../lib/theme";

type ConditionKey = "all" | "used" | "new";

const YEARS = Array.from({ length: 30 }, (_, i) => 2026 - i);
const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Gaziantep", "Konya"];
const PLATE_TYPES = ["Özel", "Ticari", "Resmi"];

type PickerKind =
  | "model"
  | "trim"
  | "minYear"
  | "maxYear"
  | "minPrice"
  | "maxPrice"
  | "minMileage"
  | "maxMileage"
  | "city"
  | "plateType"
  | null;

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams();

  const [mode, setMode] = useState<"filter" | "results">("filter");
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [model, setModel] = useState<string | null>(null);
  const [trim, setTrim] = useState<string | null>(null);
  const [plateType, setPlateType] = useState<string | null>(null);
  const [condition, setCondition] = useState<ConditionKey>("all");
  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(
    params.makeId ? Number(params.makeId) : null,
  );
  const [filters, setFilters] = useState<VehicleFilters>(() => ({
    q: params.make ? String(params.make) : params.q ? String(params.q) : undefined,
    makeIds: params.makeId ? [Number(params.makeId)] : undefined,
    sortBy: "created_at",
    sortDir: "desc",
  }));

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      setMode("filter");
    }, []),
  );

  useEffect(() => {
    if (params.makeId) {
      const id = Number(params.makeId);
      setSelectedMakeId(id);
      setFilters((f) => ({
        ...f,
        makeIds: [id],
        q: params.make ? String(params.make) : f.q,
      }));
      setMode("filter");
    } else if (params.make || params.q) {
      const q = String(params.make ?? params.q);
      setFilters((f) => ({ ...f, q, makeIds: undefined }));
      setSelectedMakeId(null);
    }
  }, [params.make, params.makeId, params.q]);

  const { data: refs } = useQuery({
    queryKey: ["reference", i18n.language],
    queryFn: () =>
      api.rpc<{ brands: Array<{ id: number; name: string }> }>("list_reference_data", {
        p_locale: i18n.language,
      }),
    staleTime: 60 * 60 * 1000,
  });

  const brands = useMemo(() => withBrandLogos(refs?.brands ?? []), [refs?.brands]);
  const brandPreview = brands.slice(0, 7);

  const queryFilters = useMemo((): VehicleFilters => {
    const qParts = [filters.q, model, trim].filter(Boolean);
    return {
      ...filters,
      q: qParts.length ? qParts.join(" ") : undefined,
      makeIds: selectedMakeId != null ? [selectedMakeId] : filters.makeIds,
      condition:
        condition === "all" ? undefined : condition === "new" ? "new" : "used",
    };
  }, [filters, model, trim, selectedMakeId, condition]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["vehicles-iq", queryFilters, i18n.language],
    queryFn: () =>
      api.rpc<VehicleListItem[]>("search_vehicles", {
        p_q: queryFilters.q || null,
        p_make_ids: queryFilters.makeIds ?? null,
        p_body_type_ids: null,
        p_fuel_type_ids: null,
        p_transmission_ids: null,
        p_color_ids: null,
        p_country_code: queryFilters.countryCode ?? null,
        p_city: queryFilters.city ?? null,
        p_min_year: queryFilters.minYear ?? null,
        p_max_year: queryFilters.maxYear ?? null,
        p_min_price: queryFilters.minPrice ?? null,
        p_max_price: queryFilters.maxPrice ?? null,
        p_min_mileage: queryFilters.minMileage ?? null,
        p_max_mileage: queryFilters.maxMileage ?? null,
        p_condition_filter: queryFilters.condition ?? null,
        p_lat: null,
        p_lng: null,
        p_radius_km: null,
        p_locale: i18n.language,
        p_sort_by: "created_at",
        p_sort_dir: "desc",
        p_page_size: 40,
        p_page_offset: 0,
      }),
    staleTime: 20_000,
  });

  const results = data ?? [];
  const count = results.length;

  const reset = () => {
    setSelectedMakeId(null);
    setModel(null);
    setTrim(null);
    setPlateType(null);
    setCondition("all");
    setFilters({ sortBy: "created_at", sortDir: "desc" });
    setMode("filter");
  };

  const selectBrand = (id: number) => {
    const next = selectedMakeId === id ? null : id;
    setSelectedMakeId(next);
    const brand = brands.find((b) => b.id === next);
    setFilters((f) => ({
      ...f,
      makeIds: next != null ? [next] : undefined,
      q: brand?.name,
    }));
    setModel(null);
    setTrim(null);
  };

  const pickerOptions = useMemo(() => {
    switch (picker) {
      case "minYear":
      case "maxYear":
        return YEARS.map(String);
      case "minPrice":
      case "maxPrice":
        return ["100000", "250000", "500000", "750000", "1000000", "1500000", "2000000", "3000000"];
      case "minMileage":
      case "maxMileage":
        return ["0", "25000", "50000", "75000", "100000", "150000", "200000"];
      case "city":
        return CITIES;
      case "plateType":
        return PLATE_TYPES;
      case "model":
        return ["Corolla", "Civic", "3 Series", "A4", "Focus", "Sportage", "Model 3", "T10X"];
      case "trim":
        return ["Base", "Comfort", "Premium", "Sport", "Luxury"];
      default:
        return [];
    }
  }, [picker]);

  const applyPicker = (value: string) => {
    const num = Number(value);
    switch (picker) {
      case "model":
        setModel(value);
        break;
      case "trim":
        setTrim(value);
        break;
      case "minYear":
        setFilters((f) => ({ ...f, minYear: num }));
        break;
      case "maxYear":
        setFilters((f) => ({ ...f, maxYear: num }));
        break;
      case "minPrice":
        setFilters((f) => ({ ...f, minPrice: num }));
        break;
      case "maxPrice":
        setFilters((f) => ({ ...f, maxPrice: num }));
        break;
      case "minMileage":
        setFilters((f) => ({ ...f, minMileage: num }));
        break;
      case "maxMileage":
        setFilters((f) => ({ ...f, maxMileage: num }));
        break;
      case "city":
        setFilters((f) => ({ ...f, city: value }));
        break;
      case "plateType":
        setPlateType(value);
        break;
    }
    setPicker(null);
  };

  const formatPrice = (n?: number) =>
    n == null ? null : `${n.toLocaleString("tr-TR")} ₺`;

  if (mode === "results") {
    const popular = (() => {
      const map = new Map<string, number>();
      for (const v of results) {
        const key = [v.make_name, v.model].filter(Boolean).join(" ").trim();
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return Array.from(map.entries())
        .map(([name, n]) => ({ name, count: n }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    })();

    return (
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.white}>
          <View style={styles.resultsTop}>
            <TouchableOpacity style={styles.iconHit} onPress={() => setMode("filter")} hitSlop={8}>
              <ChevronLeft size={22} color={colors.ink} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.resultsTitle} numberOfLines={1}>
              {count.toLocaleString("tr-TR")} cars
            </Text>
            <TouchableOpacity style={styles.iconHit} onPress={() => setMode("filter")} hitSlop={8}>
              <Text style={styles.editFilters}>Filter</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {popular.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularRow}
          >
            {popular.map((m) => (
              <TouchableOpacity
                key={m.name}
                style={styles.popularChip}
                onPress={() => {
                  setFilters((f) => ({ ...f, q: m.name }));
                  setModel(null);
                  setSelectedMakeId(null);
                  setMode("filter");
                }}
              >
                <Text style={styles.popularChipText}>
                  {m.name} ({m.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.flame} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <VehicleCard vehicle={item} index={index} />}
            contentContainerStyle={styles.list}
            refreshing={isFetching}
            onRefresh={() => refetch()}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>{t("search.noResults")}</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.white}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>Filter</Text>
          <TouchableOpacity style={styles.iconHit} onPress={reset} hitSlop={8}>
            <RotateCcw size={18} color={colors.inkMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>Brands</Text>
        <View style={styles.brandGrid}>
          {brandPreview.map((b) => {
            const active = selectedMakeId === b.id;
            return (
              <TouchableOpacity
                key={b.id}
                style={[styles.brandCell, active && styles.brandCellActive]}
                onPress={() => selectBrand(b.id)}
                activeOpacity={0.85}
              >
                <BrandLogo name={b.name} logoUrl={b.logo_url} size={42} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.brandCell}
            onPress={() => setShowAllBrands(true)}
            activeOpacity={0.85}
          >
            <ChevronRight size={22} color={colors.inkMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.row2}>
          <SelectField
            label="Model"
            value={model}
            onPress={() => setPicker("model")}
            style={styles.half}
          />
          <SelectField
            label="Trim"
            value={trim}
            onPress={() => setPicker("trim")}
            style={styles.half}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label="From Year"
            value={filters.minYear != null ? String(filters.minYear) : null}
            onPress={() => setPicker("minYear")}
            style={styles.half}
          />
          <SelectField
            label="To Year"
            value={filters.maxYear != null ? String(filters.maxYear) : null}
            onPress={() => setPicker("maxYear")}
            style={styles.half}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label="Min Price"
            value={formatPrice(filters.minPrice)}
            onPress={() => setPicker("minPrice")}
            style={styles.half}
          />
          <SelectField
            label="Max Price"
            value={formatPrice(filters.maxPrice)}
            onPress={() => setPicker("maxPrice")}
            style={styles.half}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label="Min Mileage"
            value={
              filters.minMileage != null
                ? `${filters.minMileage.toLocaleString("tr-TR")} km`
                : null
            }
            onPress={() => setPicker("minMileage")}
            style={styles.half}
          />
          <SelectField
            label="Max Mileage"
            value={
              filters.maxMileage != null
                ? `${filters.maxMileage.toLocaleString("tr-TR")} km`
                : null
            }
            onPress={() => setPicker("maxMileage")}
            style={styles.half}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label="Plate City"
            value={filters.city ?? null}
            onPress={() => setPicker("city")}
            style={styles.half}
          />
          <SelectField
            label="Plate Type"
            value={plateType}
            onPress={() => setPicker("plateType")}
            style={styles.half}
          />
        </View>

        <Text style={[styles.sectionLabel, styles.conditionLabel]}>Condition</Text>
        <View style={styles.conditionRow}>
          {(
            [
              { key: "all", label: "All" },
              { key: "used", label: "Used" },
              { key: "new", label: "New" },
            ] as const
          ).map((c) => {
            const active = condition === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.conditionChip, active && styles.conditionChipActive]}
                onPress={() => setCondition(c.key)}
                activeOpacity={0.88}
              >
                <Text style={[styles.conditionText, active && styles.conditionTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footerSafe}>
        <View style={styles.footer}>
          <TouchableOpacity onPress={reset} hitSlop={8}>
            <Text style={styles.resetLink}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.showBtn}
            activeOpacity={0.9}
            onPress={() => setMode("results")}
          >
            {isFetching ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.showBtnText}>
                Show {count.toLocaleString("tr-TR")} Cars
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>


      {/* All brands sheet */}
      <Modal visible={showAllBrands} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("search.make")}</Text>
            <TouchableOpacity onPress={() => setShowAllBrands(false)}>
              <Text style={styles.modalDone}>{t("common.done") ?? "Tamam"}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.allBrands}>
            {brands.map((b) => {
              const active = selectedMakeId === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.allBrandCell, active && styles.brandCellActive]}
                  onPress={() => {
                    selectBrand(b.id);
                    setShowAllBrands(false);
                  }}
                >
                  <BrandLogo name={b.name} logoUrl={b.logo_url} size={44} />
                  <Text style={styles.allBrandName} numberOfLines={1}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Value picker */}
      <Modal visible={picker != null} transparent animationType="fade">
        <Pressable style={styles.pickerBackdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>Seç</Text>
            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  if (!picker) return;
                  if (picker === "model") setModel(null);
                  else if (picker === "trim") setTrim(null);
                  else if (picker === "plateType") setPlateType(null);
                  else if (picker === "city") setFilters((f) => ({ ...f, city: undefined }));
                  else if (picker === "minYear") setFilters((f) => ({ ...f, minYear: undefined }));
                  else if (picker === "maxYear") setFilters((f) => ({ ...f, maxYear: undefined }));
                  else if (picker === "minPrice") setFilters((f) => ({ ...f, minPrice: undefined }));
                  else if (picker === "maxPrice") setFilters((f) => ({ ...f, maxPrice: undefined }));
                  else if (picker === "minMileage")
                    setFilters((f) => ({ ...f, minMileage: undefined }));
                  else if (picker === "maxMileage")
                    setFilters((f) => ({ ...f, maxMileage: undefined }));
                  setPicker(null);
                }}
              >
                <Text style={styles.pickerItemText}>All</Text>
              </TouchableOpacity>
              {pickerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.pickerItem}
                  onPress={() => applyPicker(opt)}
                >
                  <Text style={styles.pickerItemText}>
                    {picker === "minPrice" || picker === "maxPrice"
                      ? `${Number(opt).toLocaleString("tr-TR")} ₺`
                      : picker === "minMileage" || picker === "maxMileage"
                        ? `${Number(opt).toLocaleString("tr-TR")} km`
                        : opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SelectField({
  label,
  value,
  onPress,
  style,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
  style?: object;
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectBox} onPress={onPress} activeOpacity={0.85}>
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]} numberOfLines={1}>
          {value ?? "All"}
        </Text>
        <ChevronDown size={16} color={colors.inkFaint} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  white: { backgroundColor: colors.white },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  topTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
  },
  editFilters: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.flame,
  },
  iconHit: {
    minWidth: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  form: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.lg,
    backgroundColor: colors.white,
  },
  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: space.sm,
  },
  brandGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: space.xl,
  },
  brandCell: {
    width: "22%",
    aspectRatio: 1,
    minWidth: 70,
    flexGrow: 1,
    maxWidth: "24%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  brandCellActive: {
    borderColor: colors.ink,
    backgroundColor: colors.mist,
  },
  row2: {
    flexDirection: "row",
    gap: 12,
    marginBottom: space.md,
  },
  half: { flex: 1 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    marginBottom: 6,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 13,
    minHeight: 48,
  },
  selectValue: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    marginRight: 6,
  },
  selectPlaceholder: {
    color: colors.inkFaint,
  },
  conditionLabel: { marginTop: space.sm },
  conditionRow: {
    flexDirection: "row",
    gap: 10,
  },
  conditionChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  conditionChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  conditionText: {
    fontFamily: fonts.bodyMed,
    fontSize: 14,
    color: colors.ink,
  },
  conditionTextActive: {
    color: colors.white,
    fontFamily: fonts.bodySemi,
  },
  bottomSpacer: { height: 24 },
  footerSafe: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    gap: space.lg,
  },
  resetLink: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  showBtn: {
    flex: 1,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  showBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
  resultsTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  resultsTitle: {
    flex: 1,
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    textAlign: "center",
  },
  popularRow: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: 8,
    backgroundColor: colors.white,
  },
  popularChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.line,
  },
  popularChipText: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    color: colors.ink,
  },
  list: { padding: space.lg, paddingBottom: space.section },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
  },
  modal: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 18,
    color: colors.ink,
  },
  modalDone: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.flame,
  },
  allBrands: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: space.xl,
  },
  allBrandCell: {
    width: "22%",
    flexGrow: 1,
    maxWidth: "24%",
    aspectRatio: 0.9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 8,
  },
  allBrandName: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkMuted,
    textAlign: "center",
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "55%",
    paddingBottom: space.xl,
  },
  pickerTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  pickerList: { paddingHorizontal: space.lg },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pickerItemText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
});
