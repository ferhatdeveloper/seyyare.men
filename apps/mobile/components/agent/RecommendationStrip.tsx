import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { storage } from "../../lib/clients";
import { colors, fonts, radius, shadow, space } from "../../lib/theme";

interface RecommendedVehicle {
  id: string;
  title: string | null;
  price_amount: number | null;
  price_currency: string | null;
  year: number | null;
  mileage_km: number | null;
  cover_url: string | null;
  reason?: string;
}

interface Props {
  title?: string;
  vehicles: RecommendedVehicle[];
}

export function RecommendationStrip({ title, vehicles }: Props) {
  const { t: _t } = useTranslation();

  if (!vehicles || vehicles.length === 0) return null;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>{title ?? "Benzer İlanlar"}</Text>
        <ChevronRight size={16} color={colors.flame} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {vehicles.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={styles.card}
            onPress={() => router.push(`/vehicle/${v.id}`)}
            activeOpacity={0.92}
          >
            {v.cover_url ? (
              <Image
                source={{ uri: v.cover_url.startsWith("http") ? v.cover_url : `${storage.url}/${v.cover_url}` }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.placeholderText}>—</Text>
              </View>
            )}
            <View style={styles.body}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {v.title ?? "Araç"}
              </Text>
              {v.year ? (
                <Text style={styles.meta}>
                  {v.year} · {v.mileage_km?.toLocaleString() ?? "?"} km
                </Text>
              ) : null}
              <Text style={styles.price}>
                {v.price_amount?.toLocaleString() ?? "—"}{" "}
                <Text style={styles.currency}>{v.price_currency ?? ""}</Text>
              </Text>
              {v.reason ? (
                <Text style={styles.reason} numberOfLines={1}>
                  {v.reason}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: space.sm,
  },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.ink,
  },
  card: {
    marginRight: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFD8B8",
    width: 176,
    ...shadow.soft,
  },
  cover: { width: "100%", height: 110 },
  coverPlaceholder: {
    width: "100%",
    height: 110,
    backgroundColor: colors.flameSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { fontFamily: fonts.body, fontSize: 11, color: colors.inkFaint },
  body: { padding: 10 },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 2,
  },
  price: {
    fontFamily: fonts.displayMed,
    fontSize: 14,
    color: colors.flame,
    marginTop: 4,
  },
  currency: { fontSize: 10 },
  reason: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 4,
    fontStyle: "italic",
  },
});
