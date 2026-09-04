import { useQuery } from "@tanstack/react-query";
import { Filter, Search as SearchIcon, Sliders } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FilterSheet, type VehicleFilters } from "../../components/FilterSheet";
import { VehicleCard, type VehicleListItem } from "../../components/VehicleCard";
import { api } from "../../lib/api";
import { useLocalSearchParams } from "expo-router";

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams();

  const [searchText, setSearchText] = useState(params.q ?? "");
  const [filters, setFilters] = useState<VehicleFilters>(() => ({
    q: params.q,
    sortBy: "created_at",
    sortDir: "desc",
  }));
  const [showFilters, setShowFilters] = useState(false);

  // Apply params on mount
  useEffect(() => {
    if (params.q) setSearchText(params.q);
    if (params.make) setFilters((f) => ({ ...f, q: params.make }));
  }, [params.q, params.make]);

  // Reference data (brands)
  const { data: refs } = useQuery({
    queryKey: ["reference", i18n.language],
    queryFn: () => api.rpc("list_reference_data", { p_locale: i18n.language }),
    staleTime: 60 * 60 * 1000,
  });

  // Search query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["vehicles", filters, i18n.language],
    queryFn: () =>
      api.rpc("search_vehicles", {
        p_q: (filters.q ?? searchText) || null,
        p_make_ids: filters.makeIds ?? null,
        p_body_type_ids: filters.bodyTypeIds ?? null,
        p_fuel_type_ids: filters.fuelTypeIds ?? null,
        p_transmission_ids: filters.transmissionIds ?? null,
        p_color_ids: filters.colorIds ?? null,
        p_country_code: filters.countryCode ?? null,
        p_city: filters.city ?? null,
        p_min_year: filters.minYear ?? null,
        p_max_year: filters.maxYear ?? null,
        p_min_price: filters.minPrice ?? null,
        p_max_price: filters.maxPrice ?? null,
        p_min_mileage: filters.minMileage ?? null,
        p_max_mileage: filters.maxMileage ?? null,
        p_condition_filter: filters.condition ?? null,
        p_lat: filters.lat ?? null,
        p_lng: filters.lng ?? null,
        p_radius_km: filters.radiusKm ?? null,
        p_locale: i18n.language,
        p_sort_by: filters.sortBy ?? "created_at",
        p_sort_dir: filters.sortDir ?? "desc",
        p_page_size: 30,
        p_page_offset: 0,
      }),
    staleTime: 30_000,
  });

  const activeFilterCount = [
    filters.makeIds?.length,
    filters.bodyTypeIds?.length,
    filters.fuelTypeIds?.length,
    filters.transmissionIds?.length,
    filters.colorIds?.length,
    filters.minYear,
    filters.maxYear,
    filters.minPrice,
    filters.maxPrice,
    filters.condition,
    filters.countryCode,
  ].filter(Boolean).length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <View className="px-5 py-3 bg-white border-b border-slate-200">
        <Text className="text-2xl font-bold text-slate-900 mb-3">{t("search.title")}</Text>

        <View className="flex-row items-center">
          <View className="flex-1 flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5">
            <SearchIcon size={18} color="#64748B" />
            <TextInput
              className="flex-1 ml-2 text-base text-slate-900"
              placeholder={t("home.searchPlaceholder")}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={() => {
                setFilters({ ...filters, q: searchText });
                refetch();
              }}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity
            className="ml-2 bg-primary-600 rounded-xl w-11 h-11 items-center justify-center relative"
            style={{ backgroundColor: "#0284C7" }}
            onPress={() => setShowFilters(true)}
          >
            <Sliders size={18} color="#FFFFFF" />
            {activeFilterCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text className="text-slate-500 mt-3">{t("common.loading")}</Text>
        </View>
      ) : data && data.length > 0 ? (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VehicleCard vehicle={item} />}
          contentContainerStyle={{ padding: 16 }}
          refreshing={isLoading}
          onRefresh={() => refetch()}
          ListHeaderComponent={
            <Text className="text-sm text-slate-500 mb-3 px-1">
              {t("search.resultsCount", { count: data.length })}
            </Text>
          }
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-slate-400 text-base mb-2">{t("search.noResults")}</Text>
          <Text className="text-slate-300 text-sm text-center">
            Filtreleri değiştirerek tekrar deneyin
          </Text>
        </View>
      )}

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={(f) => {
          setFilters(f);
        }}
        brands={refs?.brands ?? []}
      />
    </SafeAreaView>
  );
}