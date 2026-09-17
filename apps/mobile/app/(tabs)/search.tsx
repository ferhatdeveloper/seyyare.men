import { FlashList } from "@shopify/flash-list";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  SearchX,
  Share2,
  SlidersHorizontal,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "../../components/BrandLogo";
import { AppHeader } from "../../components/brand";
import { VehicleCardSkeleton } from "../../components/Skeleton";
import { VehicleCard, type VehicleListItem } from "../../components/VehicleCard";
import { type VehicleFilters } from "../../components/FilterSheet";
import { Chip } from "../../components/ui/Chip";
import { api } from "../../lib/api";
import { withBrandLogos } from "../../lib/brand-logos";
import { MARKET_CITIES, useCityStore, type SelectedCity } from "../../lib/city-store";
import {
  readVehiclesSnapshot,
  writeVehiclesSnapshot,
} from "../../lib/offline-snapshot";
import {
  buildSearchShareMessage,
  savedSearchesStore,
  type SavedSearchParams,
} from "../../lib/saved-searches-store";
import { colors, fonts, radius, space } from "../../lib/theme";

type ConditionKey = "all" | "used" | "new";
type PriceBand = "under" | "mid" | "over";
type YearBand = "y2020" | "y2015" | "older";

const YEARS = Array.from({ length: 30 }, (_, i) => 2026 - i);
const CITIES = [...MARKET_CITIES];
const PLATE_TYPE_KEYS = [
  { value: "private", labelKey: "search.platePrivate" },
  { value: "commercial", labelKey: "search.plateCommercial" },
  { value: "official", labelKey: "search.plateOfficial" },
] as const;

/** IQD quick-filter bands (millions). */
const PRICE_UNDER = 10_000_000;
const PRICE_MID = 25_000_000;
const TOP_BRAND_CHIPS = 5;

type RefItem = { id: number; name: string; code?: string };
type ReferenceData = {
  brands: Array<{ id: number; name: string }>;
  fuel_types?: RefItem[];
  transmission_types?: RefItem[];
};

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
  const storedCity = useCityStore((s) => s.city);
  const setStoredCity = useCityStore((s) => s.setCity);

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
    city:
      params.city != null
        ? String(params.city)
        : storedCity !== "all"
          ? storedCity
          : undefined,
    sortBy: "created_at",
    sortDir: "desc",
  }));

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
    }, []),
  );

  useEffect(() => {
    const hasRouteParams =
      params.makeId != null ||
      params.make != null ||
      params.q != null ||
      params.minPrice != null ||
      params.maxPrice != null ||
      params.minYear != null ||
      params.maxYear != null ||
      params.minMileage != null ||
      params.maxMileage != null ||
      params.city != null ||
      params.condition != null ||
      params.openResults != null;

    if (!hasRouteParams) return;

    const openResults = String(params.openResults ?? "") === "1";
    const makeIdRaw = params.makeId != null ? Number(params.makeId) : null;
    const makeId = makeIdRaw != null && Number.isFinite(makeIdRaw) ? makeIdRaw : null;
    const condRaw = params.condition != null ? String(params.condition) : null;
    const nextCondition: ConditionKey =
      condRaw === "new" || condRaw === "used" || condRaw === "all" ? condRaw : "all";

    const numOrUndef = (v: unknown): number | undefined => {
      if (v == null) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    if (params.makeId != null || openResults) {
      setSelectedMakeId(makeId);
    }
    if (condRaw || openResults) setCondition(condRaw ? nextCondition : "all");

    setFilters((f) => {
      const base: VehicleFilters = openResults
        ? { sortBy: "created_at", sortDir: "desc" }
        : { ...f };
      return {
        ...base,
        q: params.make
          ? String(params.make)
          : params.q
            ? String(params.q)
            : openResults
              ? undefined
              : base.q,
        makeIds: makeId != null ? [makeId] : openResults ? undefined : base.makeIds,
        minPrice: numOrUndef(params.minPrice) ?? (openResults ? undefined : base.minPrice),
        maxPrice: numOrUndef(params.maxPrice) ?? (openResults ? undefined : base.maxPrice),
        minYear: numOrUndef(params.minYear) ?? (openResults ? undefined : base.minYear),
        maxYear: numOrUndef(params.maxYear) ?? (openResults ? undefined : base.maxYear),
        minMileage: numOrUndef(params.minMileage) ?? (openResults ? undefined : base.minMileage),
        maxMileage: numOrUndef(params.maxMileage) ?? (openResults ? undefined : base.maxMileage),
        city:
          params.city != null
            ? String(params.city)
            : openResults
              ? undefined
              : base.city ?? (storedCity !== "all" ? storedCity : undefined),
        sortBy:
          params.sortBy === "price" || params.sortBy === "created_at"
            ? params.sortBy
            : base.sortBy ?? "created_at",
        sortDir:
          params.sortDir === "asc" || params.sortDir === "desc"
            ? params.sortDir
            : base.sortDir ?? "desc",
      };
    });

    if (openResults) {
      setMode("results");
    }

    if (params.city != null) {
      const c = String(params.city);
      void setStoredCity(
        (MARKET_CITIES as readonly string[]).includes(c) ? (c as SelectedCity) : "all",
      );
    }
  }, [
    params.make,
    params.makeId,
    params.q,
    params.minPrice,
    params.maxPrice,
    params.minYear,
    params.maxYear,
    params.minMileage,
    params.maxMileage,
    params.city,
    params.condition,
    params.sortBy,
    params.sortDir,
    params.openResults,
    setStoredCity,
    storedCity,
  ]);

  const { data: refs } = useQuery({
    queryKey: ["reference", i18n.language],
    queryFn: () =>
      api.rpc<ReferenceData>("list_reference_data", {
        p_locale: i18n.language,
      }),
    staleTime: 60 * 60 * 1000,
  });

  const brands = useMemo(() => withBrandLogos(refs?.brands ?? []), [refs?.brands]);
  const fuelTypes = refs?.fuel_types ?? [];
  const transmissionTypes = refs?.transmission_types ?? [];
  const brandPreview = brands.slice(0, 7);
  const quickBrands = useMemo(() => brands.slice(0, TOP_BRAND_CHIPS), [brands]);

  const currentSearchParams = useMemo((): SavedSearchParams => {
    const out: SavedSearchParams = {};
    if (filters.q) out.q = filters.q;
    if (selectedMakeId != null) {
      out.makeId = String(selectedMakeId);
      const brand = brands.find((b) => b.id === selectedMakeId);
      if (brand?.name) out.make = brand.name;
      else if (filters.q) out.make = filters.q;
    } else if (filters.q) {
      out.make = filters.q;
    }
    if (filters.minPrice != null) out.minPrice = String(filters.minPrice);
    if (filters.maxPrice != null) out.maxPrice = String(filters.maxPrice);
    if (filters.minYear != null) out.minYear = String(filters.minYear);
    if (filters.maxYear != null) out.maxYear = String(filters.maxYear);
    if (filters.minMileage != null) out.minMileage = String(filters.minMileage);
    if (filters.maxMileage != null) out.maxMileage = String(filters.maxMileage);
    if (filters.city) out.city = filters.city;
    if (condition !== "all") out.condition = condition;
    if (filters.sortBy) out.sortBy = filters.sortBy;
    if (filters.sortDir) out.sortDir = filters.sortDir;
    return out;
  }, [filters, selectedMakeId, condition, brands]);

  const onSaveSearch = async () => {
    try {
      await savedSearchesStore.save(currentSearchParams);
      Alert.alert(t("search.savedTitle"), t("search.savedBody"));
    } catch {
      Alert.alert(t("common.error"), t("search.saveFailed"));
    }
  };

  const onShareSearch = async () => {
    try {
      await Share.share({
        message: buildSearchShareMessage(
          currentSearchParams,
          currentSearchParams.make ?? currentSearchParams.q,
        ),
      });
    } catch {
      /* user dismissed */
    }
  };

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

  const activePriceBand = useMemo((): PriceBand | null => {
    if (filters.maxPrice === PRICE_UNDER && filters.minPrice == null) return "under";
    if (filters.minPrice === PRICE_UNDER && filters.maxPrice === PRICE_MID) return "mid";
    if (filters.minPrice === PRICE_MID && filters.maxPrice == null) return "over";
    return null;
  }, [filters.minPrice, filters.maxPrice]);

  const activeYearBand = useMemo((): YearBand | null => {
    if (filters.minYear === 2020 && filters.maxYear == null) return "y2020";
    if (filters.minYear === 2015 && filters.maxYear == null) return "y2015";
    if (filters.maxYear === 2014 && filters.minYear == null) return "older";
    return null;
  }, [filters.minYear, filters.maxYear]);

  const isNewestSort =
    (filters.sortBy ?? "created_at") === "created_at" && (filters.sortDir ?? "desc") === "desc";
  const isPriceLowSort = filters.sortBy === "price" && filters.sortDir === "asc";

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["vehicles-iq", queryFilters, i18n.language],
    queryFn: async () => {
      try {
        const rows = await api.rpc<VehicleListItem[]>("search_vehicles", {
          p_q: queryFilters.q || null,
          p_make_ids: queryFilters.makeIds ?? null,
          p_body_type_ids: null,
          p_fuel_type_ids: queryFilters.fuelTypeIds ?? null,
          p_transmission_ids: queryFilters.transmissionIds ?? null,
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
          p_sort_by: queryFilters.sortBy ?? "created_at",
          p_sort_dir: queryFilters.sortDir ?? "desc",
          p_page_size: 40,
          p_page_offset: 0,
        });
        if (Array.isArray(rows) && rows.length > 0) {
          void writeVehiclesSnapshot(rows);
          return rows;
        }
      } catch {
        /* fall through to snapshot */
      }
      const snap = await readVehiclesSnapshot();
      return snap ?? [];
    },
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });

  const results = data ?? [];
  const count = results.length;

  const resultsHeading = useMemo(() => {
    const parts: string[] = [];
    if (selectedMakeId != null) {
      const brand = brands.find((b) => b.id === selectedMakeId);
      if (brand?.name) parts.push(brand.name);
    } else if (filters.q) {
      parts.push(filters.q);
    }
    if (model) parts.push(model);
    if (filters.city) parts.push(filters.city);
    if (condition === "new") parts.push(t("search.conditionNew"));
    else if (condition === "used") parts.push(t("search.conditionUsed"));
    return parts.length > 0 ? parts.join(" · ") : t("search.allListings");
  }, [selectedMakeId, brands, filters.q, filters.city, model, condition, t]);

  const toggleFuel = (id: number) => {
    setFilters((f) => {
      const current = f.fuelTypeIds ?? [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...f, fuelTypeIds: next.length ? next : undefined };
    });
  };

  const toggleTransmission = (id: number) => {
    setFilters((f) => {
      const current = f.transmissionIds ?? [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...f, transmissionIds: next.length ? next : undefined };
    });
  };

  const plateTypeLabel = (value: string | null) => {
    if (!value) return null;
    const row = PLATE_TYPE_KEYS.find((p) => p.value === value);
    return row ? t(row.labelKey) : value;
  };

  const reset = () => {
    setSelectedMakeId(null);
    setModel(null);
    setTrim(null);
    setPlateType(null);
    setCondition("all");
    setFilters({
      sortBy: "created_at",
      sortDir: "desc",
      city: storedCity !== "all" ? storedCity : undefined,
    });
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

  const setPriceBand = (band: PriceBand) => {
    setFilters((f) => {
      const clear = { ...f, minPrice: undefined, maxPrice: undefined };
      if (activePriceBand === band) return clear;
      if (band === "under") return { ...f, minPrice: undefined, maxPrice: PRICE_UNDER };
      if (band === "mid") return { ...f, minPrice: PRICE_UNDER, maxPrice: PRICE_MID };
      return { ...f, minPrice: PRICE_MID, maxPrice: undefined };
    });
  };

  const setYearBand = (band: YearBand) => {
    setFilters((f) => {
      const clear = { ...f, minYear: undefined, maxYear: undefined };
      if (activeYearBand === band) return clear;
      if (band === "y2020") return { ...f, minYear: 2020, maxYear: undefined };
      if (band === "y2015") return { ...f, minYear: 2015, maxYear: undefined };
      return { ...f, minYear: undefined, maxYear: 2014 };
    });
  };

  const setSortNewest = () => {
    setFilters((f) => ({ ...f, sortBy: "created_at", sortDir: "desc" }));
  };

  const setSortPriceLow = () => {
    setFilters((f) => {
      if (f.sortBy === "price" && f.sortDir === "asc") {
        return { ...f, sortBy: "created_at", sortDir: "desc" };
      }
      return { ...f, sortBy: "price", sortDir: "asc" };
    });
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
        return PLATE_TYPE_KEYS.map((p) => p.value);
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
        void setStoredCity(
          (MARKET_CITIES as readonly string[]).includes(value)
            ? (value as SelectedCity)
            : "all",
        );
        break;
      case "plateType":
        setPlateType(value);
        break;
    }
    setPicker(null);
  };

  const formatPrice = (n?: number) =>
    n == null ? null : `${n.toLocaleString("tr-TR")} IQD`;

  if (mode === "results") {
    return (
      <View style={styles.resultsRoot}>
        <AppHeader />
        <View style={styles.resultsSticky}>
          <View style={styles.resultsNav}>
            <TouchableOpacity
              style={styles.iconHit}
              onPress={() => setMode("filter")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("search.filters")}
            >
              <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
            </TouchableOpacity>

            <View style={styles.resultsNavCenter}>
              <Text style={styles.resultsHeading} numberOfLines={1}>
                {resultsHeading}
              </Text>
              <Text style={styles.resultsCount}>
                {isLoading
                  ? t("search.searching")
                  : t("search.resultsCount", { count })}
              </Text>
            </View>

            <View style={styles.resultsActions}>
              <TouchableOpacity
                style={styles.iconHit}
                onPress={() => void onSaveSearch()}
                hitSlop={8}
              >
                <Bookmark size={19} color={colors.flame} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconHit}
                onPress={() => void onShareSearch()}
                hitSlop={8}
              >
                <Share2 size={19} color={colors.ink} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.resultsToolbar}>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setMode("filter")}
              activeOpacity={0.88}
            >
              <SlidersHorizontal size={15} color={colors.ink} strokeWidth={2.2} />
              <Text style={styles.filterBtnText}>{t("search.filters")}</Text>
            </TouchableOpacity>

            <View style={styles.sortGroup}>
              <Chip
                label={t("search.sortNewest")}
                selected={isNewestSort}
                onPress={setSortNewest}
                style={styles.sortChip}
              />
              <Chip
                label={t("search.sortPriceLow")}
                selected={isPriceLowSort}
                onPress={setSortPriceLow}
                style={styles.sortChip}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
            style={styles.quickScroll}
          >
            {quickBrands.map((b) => (
              <Chip
                key={`make-${b.id}`}
                label={b.name}
                selected={selectedMakeId === b.id}
                onPress={() => selectBrand(b.id)}
                style={styles.quickChip}
              />
            ))}

            {quickBrands.length > 0 ? <View style={styles.chipDivider} /> : null}

            <Chip
              label={t("search.priceUnder")}
              selected={activePriceBand === "under"}
              onPress={() => setPriceBand("under")}
              style={styles.quickChip}
            />
            <Chip
              label={t("search.priceMid")}
              selected={activePriceBand === "mid"}
              onPress={() => setPriceBand("mid")}
              style={styles.quickChip}
            />
            <Chip
              label={t("search.priceOver")}
              selected={activePriceBand === "over"}
              onPress={() => setPriceBand("over")}
              style={styles.quickChip}
            />
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.listPad}>
            <VehicleCardSkeleton />
            <VehicleCardSkeleton />
            <VehicleCardSkeleton />
          </View>
        ) : (
          <FlashList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View style={styles.cardWrap}>
                <VehicleCard vehicle={item} index={index} />
              </View>
            )}
            contentContainerStyle={styles.listPad}
            style={styles.flex}
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <SearchX size={28} color={colors.inkFaint} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>{t("search.noResults")}</Text>
                <Text style={styles.emptyHint}>{t("search.noResultsHint")}</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setMode("filter")}
                  activeOpacity={0.88}
                >
                  <Text style={styles.emptyBtnText}>{t("search.filters")}</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader />
      <View style={styles.white}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>{t("common.filter")}</Text>
          <TouchableOpacity style={styles.iconHit} onPress={reset} hitSlop={8}>
            <RotateCcw size={18} color={colors.inkMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>{t("search.city")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityFilterRow}
        >
          <Chip
            label={t("common.all")}
            selected={!filters.city}
            onPress={() => {
              setFilters((f) => ({ ...f, city: undefined }));
              void setStoredCity("all");
            }}
            style={styles.quickChip}
          />
          {CITIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={filters.city === c}
              onPress={() => {
                const next = filters.city === c ? undefined : c;
                setFilters((f) => ({ ...f, city: next }));
                void setStoredCity(next ? (next as SelectedCity) : "all");
              }}
              style={styles.quickChip}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>{t("search.brands")}</Text>
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
                <BrandLogo name={b.name} nameEn={b.name_en} logoUrl={b.logo_url} size={42} />
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
            label={t("search.model")}
            value={model}
            onPress={() => setPicker("model")}
            style={styles.half}
            allLabel={t("common.all")}
          />
          <SelectField
            label={t("search.trim")}
            value={trim}
            onPress={() => setPicker("trim")}
            style={styles.half}
            allLabel={t("common.all")}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label={t("search.fromYear")}
            value={filters.minYear != null ? String(filters.minYear) : null}
            onPress={() => setPicker("minYear")}
            style={styles.half}
            allLabel={t("common.all")}
          />
          <SelectField
            label={t("search.toYear")}
            value={filters.maxYear != null ? String(filters.maxYear) : null}
            onPress={() => setPicker("maxYear")}
            style={styles.half}
            allLabel={t("common.all")}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label={t("search.minPrice")}
            value={formatPrice(filters.minPrice)}
            onPress={() => setPicker("minPrice")}
            style={styles.half}
            allLabel={t("common.all")}
          />
          <SelectField
            label={t("search.maxPrice")}
            value={formatPrice(filters.maxPrice)}
            onPress={() => setPicker("maxPrice")}
            style={styles.half}
            allLabel={t("common.all")}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label={t("search.minMileage")}
            value={
              filters.minMileage != null
                ? `${filters.minMileage.toLocaleString("tr-TR")} ${t("common.km")}`
                : null
            }
            onPress={() => setPicker("minMileage")}
            style={styles.half}
            allLabel={t("common.all")}
          />
          <SelectField
            label={t("search.maxMileage")}
            value={
              filters.maxMileage != null
                ? `${filters.maxMileage.toLocaleString("tr-TR")} ${t("common.km")}`
                : null
            }
            onPress={() => setPicker("maxMileage")}
            style={styles.half}
            allLabel={t("common.all")}
          />
        </View>

        <View style={styles.row2}>
          <SelectField
            label={t("search.plateCity")}
            value={filters.city ?? null}
            onPress={() => setPicker("city")}
            style={styles.half}
            allLabel={t("common.all")}
          />
          <SelectField
            label={t("search.plateType")}
            value={plateTypeLabel(plateType)}
            onPress={() => setPicker("plateType")}
            style={styles.half}
            allLabel={t("common.all")}
          />
        </View>

        <Text style={[styles.sectionLabel, styles.conditionLabel]}>{t("search.condition")}</Text>
        <View style={styles.conditionRow}>
          {(
            [
              { key: "all" as const, labelKey: "common.all" },
              { key: "used" as const, labelKey: "search.conditionUsed" },
              { key: "new" as const, labelKey: "search.conditionNew" },
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
                  {t(c.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {fuelTypes.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, styles.conditionLabel]}>{t("search.fuel")}</Text>
            <View style={styles.conditionRow}>
              {fuelTypes.map((ft) => {
                const active = filters.fuelTypeIds?.includes(ft.id) ?? false;
                return (
                  <TouchableOpacity
                    key={ft.id}
                    style={[styles.conditionChip, active && styles.conditionChipActive]}
                    onPress={() => toggleFuel(ft.id)}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.conditionText, active && styles.conditionTextActive]}>
                      {ft.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {transmissionTypes.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, styles.conditionLabel]}>
              {t("search.transmission")}
            </Text>
            <View style={styles.conditionRow}>
              {transmissionTypes.map((tr) => {
                const active = filters.transmissionIds?.includes(tr.id) ?? false;
                return (
                  <TouchableOpacity
                    key={tr.id}
                    style={[styles.conditionChip, active && styles.conditionChipActive]}
                    onPress={() => toggleTransmission(tr.id)}
                    activeOpacity={0.88}
                  >
                    <Text style={[styles.conditionText, active && styles.conditionTextActive]}>
                      {tr.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footerSafe}>
        <View style={styles.footer}>
          <TouchableOpacity onPress={reset} hitSlop={8}>
            <Text style={styles.resetLink}>{t("search.reset")}</Text>
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
                {t("search.showCars", { count })}
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
                  <BrandLogo name={b.name} nameEn={b.name_en} logoUrl={b.logo_url} size={44} />
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
            <Text style={styles.pickerTitle}>{t("common.select")}</Text>
            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  if (!picker) return;
                  if (picker === "model") setModel(null);
                  else if (picker === "trim") setTrim(null);
                  else if (picker === "plateType") setPlateType(null);
                  else if (picker === "city") {
                    setFilters((f) => ({ ...f, city: undefined }));
                    void setStoredCity("all");
                  }
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
                <Text style={styles.pickerItemText}>{t("common.all")}</Text>
              </TouchableOpacity>
              {pickerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.pickerItem}
                  onPress={() => applyPicker(opt)}
                >
                  <Text style={styles.pickerItemText}>
                    {picker === "minPrice" || picker === "maxPrice"
                      ? `${Number(opt).toLocaleString("tr-TR")} IQD`
                      : picker === "minMileage" || picker === "maxMileage"
                        ? `${Number(opt).toLocaleString("tr-TR")} ${t("common.km")}`
                        : picker === "plateType"
                          ? t(
                              PLATE_TYPE_KEYS.find((p) => p.value === opt)?.labelKey ??
                                "common.all",
                            )
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
  allLabel = "All",
}: {
  label: string;
  value: string | null;
  onPress: () => void;
  style?: object;
  allLabel?: string;
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectBox} onPress={onPress} activeOpacity={0.85}>
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]} numberOfLines={1}>
          {value ?? allLabel}
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
  cityFilterRow: {
    gap: 8,
    marginBottom: space.xl,
    paddingRight: space.sm,
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
    flexWrap: "wrap",
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

  /* —— Results mode (marketplace) —— */
  resultsRoot: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  resultsSticky: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    zIndex: 2,
  },
  resultsNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: space.sm,
    gap: 4,
  },
  resultsNavCenter: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  resultsHeading: {
    fontFamily: fonts.displayMed,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  resultsCount: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
  },
  resultsActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  resultsToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    gap: space.md,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.mist,
  },
  filterBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink,
  },
  sortGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  sortChip: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickScroll: {
    maxHeight: 48,
  },
  quickRow: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: 8,
    alignItems: "center",
  },
  quickChip: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.line,
    marginHorizontal: 2,
  },
  listPad: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.section,
  },
  cardWrap: {
    marginBottom: space.md,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
    paddingTop: 64,
    paddingBottom: space.section,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  emptyTitle: {
    fontFamily: fonts.displayMed,
    fontSize: 17,
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  emptyHint: {
    marginTop: space.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: space.xl,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  emptyBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.white,
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
