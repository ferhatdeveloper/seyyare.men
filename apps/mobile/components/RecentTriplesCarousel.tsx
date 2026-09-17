import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { storage } from "../lib/clients";
import { useCurrencyStore } from "../lib/currency-store";
import { colors, fonts, radius, shadow, space } from "../lib/theme";
import type { VehicleListItem } from "./VehicleCard";

const { width: SCREEN_W } = Dimensions.get("window");
const PAGE_PAD = space.xl;
const GAP = 10;
const COLS = 3;
const PAGE_W = SCREEN_W;
const INNER_W = SCREEN_W - PAGE_PAD * 2;
const CARD_W = (INNER_W - GAP * (COLS - 1)) / COLS;
const AUTO_MS = 4800;

type Props = {
  items: VehicleListItem[];
  loading?: boolean;
};

function imageUri(v: VehicleListItem) {
  if (!v.cover_url) return null;
  return v.cover_url.startsWith("http") ? v.cover_url : `${storage.url}/${v.cover_url}`;
}

function titleOf(v: VehicleListItem) {
  const makeModel = ((v.make_name ?? "") + " " + (v.model ?? "")).trim();
  return v.title ?? (makeModel || "Araç");
}

function chunk3<T>(arr: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += COLS) out.push(arr.slice(i, i + COLS));
  return out;
}

/** Son eklenenler — 3’lü sayfalı slider */
export function RecentTriplesCarousel({ items, loading }: Props) {
  const formatListing = useCurrencyStore((s) => s.formatListing);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  const pages = useMemo(() => chunk3(items.slice(0, 12)), [items]);

  const goTo = useCallback(
    (i: number) => {
      if (!pages.length) return;
      const next = ((i % pages.length) + pages.length) % pages.length;
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * PAGE_W, animated: true });
    },
    [pages.length],
  );

  useEffect(() => {
    if (pages.length < 2) return;
    const id = setInterval(() => goTo(indexRef.current + 1), AUTO_MS);
    return () => clearInterval(id);
  }, [goTo, pages.length]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
    indexRef.current = i;
    setIndex(i);
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.card, styles.skel]} />
          ))}
        </View>
      </View>
    );
  }

  if (pages.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {pages.map((page, pi) => (
          <View key={`p-${pi}`} style={styles.page}>
            <View style={styles.row}>
              {page.map((v) => {
                const uri = imageUri(v);
                const price = formatListing(v.price_amount, v.price_currency ?? "IQD");
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/vehicle/${v.id}`)}
                  >
                    {uri ? (
                      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                    ) : (
                      <View style={[styles.image, styles.imageFallback]} />
                    )}
                    <View style={styles.body}>
                      <Text style={styles.title} numberOfLines={2}>
                        {titleOf(v)}
                      </Text>
                      <Text style={styles.price} numberOfLines={1}>
                        {price}
                      </Text>
                      {v.city ? (
                        <Text style={styles.meta} numberOfLines={1}>
                          {v.year ? `${v.year} · ` : ""}
                          {v.city}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
              {/* pad incomplete last page to keep layout stable */}
              {page.length < COLS
                ? Array.from({ length: COLS - page.length }).map((_, i) => (
                    <View key={`pad-${i}`} style={[styles.card, styles.pad]} />
                  ))
                : null}
            </View>
          </View>
        ))}
      </ScrollView>
      {pages.length > 1 ? (
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View key={`d-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.sm,
  },
  page: {
    width: PAGE_W,
    paddingHorizontal: PAGE_PAD,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  card: {
    width: CARD_W,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    ...shadow.soft,
  },
  pad: {
    opacity: 0,
    borderWidth: 0,
  },
  skel: {
    height: 168,
    backgroundColor: colors.mist,
  },
  image: {
    width: "100%",
    height: 88,
    backgroundColor: colors.mist,
  },
  imageFallback: {
    backgroundColor: "#1a1a1a",
  },
  body: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 2,
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    color: colors.ink,
    minHeight: 28,
  },
  price: {
    fontFamily: fonts.displayMed,
    fontSize: 11,
    color: colors.flameDeep,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkFaint,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.line,
  },
  dotActive: {
    width: 14,
    backgroundColor: colors.flame,
  },
});
