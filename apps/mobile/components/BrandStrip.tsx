import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BrandLogo } from "./BrandLogo";
import { colors, fonts, radius, shadow, space } from "../lib/theme";

export type BrandItem = {
  id: number;
  name: string;
  name_en?: string | null;
  logo_url?: string | null;
};

type Props = {
  brands: BrandItem[];
  selectedId?: number | null;
  onSelect: (brand: BrandItem) => void;
  /** Horizontal strip (home/search) vs wrap grid (filters) */
  variant?: "strip" | "grid";
  limit?: number;
};

/** DubiCars / YallaMotor tarzı marka logosu şeridi */
export function BrandStrip({
  brands,
  selectedId,
  onSelect,
  variant = "strip",
  limit = 24,
}: Props) {
  const list = brands.slice(0, limit);

  if (variant === "grid") {
    return (
      <View style={styles.grid}>
        {list.map((b) => {
          const selected = selectedId === b.id;
          return (
            <TouchableOpacity
              key={b.id}
              style={[styles.gridItem, selected && styles.itemSelected]}
              onPress={() => onSelect(b)}
              activeOpacity={0.85}
            >
              <BrandLogo name={b.name} nameEn={b.name_en} logoUrl={b.logo_url} size={44} />
              <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
                {shortName(b.name)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {list.map((b) => {
        const selected = selectedId === b.id;
        return (
          <TouchableOpacity
            key={b.id}
            style={[styles.stripItem, selected && styles.itemSelected]}
            onPress={() => onSelect(b)}
            activeOpacity={0.85}
          >
            <BrandLogo name={b.name} nameEn={b.name_en} logoUrl={b.logo_url} size={48} />
            <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
              {shortName(b.name)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function shortName(name: string) {
  return name.replace("Mercedes-Benz", "Mercedes").replace("Volkswagen", "VW");
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: space.xl,
    gap: 10,
  },
  stripItem: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "22%",
    minWidth: 68,
    flexGrow: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemSelected: {
    borderColor: colors.flame,
    backgroundColor: colors.flameSoft,
    ...shadow.soft,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 72,
  },
  nameSelected: {
    fontFamily: fonts.bodySemi,
    color: colors.flameDeep,
  },
});
