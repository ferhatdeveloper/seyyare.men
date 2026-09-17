import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { colors, fonts, radius, space } from "../lib/theme";
import type { VehicleListItem } from "./VehicleCard";

const { width: SCREEN_W } = Dimensions.get("window");
const SIDE = space.xl;
const CARD_W = SCREEN_W - SIDE * 2;
const AUTO_MS = 4200;

type Props = {
  items: VehicleListItem[];
};

function imageUri(v: VehicleListItem) {
  if (!v.cover_url) return null;
  return v.cover_url.startsWith("http") ? v.cover_url : `${storage.url}/${v.cover_url}`;
}

function titleOf(v: VehicleListItem) {
  const makeModel = ((v.make_name ?? "") + " " + (v.model ?? "")).trim();
  return v.title ?? (makeModel || "Araç");
}

/** Auto-advancing promo carousel of existing featured/recent vehicles. */
export function PromoCarousel({ items }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const list = items.slice(0, 6);

  const goTo = useCallback(
    (i: number) => {
      if (!list.length) return;
      const next = ((i % list.length) + list.length) % list.length;
      indexRef.current = next;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
    },
    [list.length],
  );

  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => goTo(indexRef.current + 1), AUTO_MS);
    return () => clearInterval(id);
  }, [goTo, list.length]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    indexRef.current = i;
    setIndex(i);
  };

  if (list.length === 0) return null;

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
        {list.map((v) => {
          const uri = imageUri(v);
          const price = v.price_amount
            ? `${Number(v.price_amount).toLocaleString("tr-TR")} ${v.price_currency ?? ""}`.trim()
            : "";
          return (
            <View key={v.id} style={styles.page}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.92}
                onPress={() => router.push(`/vehicle/${v.id}`)}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.imageFallback]} />
                )}
                <View style={styles.scrim} />
                <View style={styles.copy}>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badge}>{v.featured ? "Top pick" : "İlan"}</Text>
                  </View>
                  <Text style={styles.title} numberOfLines={1}>
                    {titleOf(v)}
                  </Text>
                  {price ? <Text style={styles.price}>{price}</Text> : null}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
      {list.length > 1 ? (
        <View style={styles.dots}>
          {list.map((v, i) => (
            <View key={v.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.md,
  },
  page: {
    width: SCREEN_W,
    paddingHorizontal: SIDE,
  },
  card: {
    width: CARD_W,
    height: 128,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.ink,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    backgroundColor: "#1a1a1a",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.42)",
  },
  copy: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },
  badgeWrap: {
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,106,0,0.9)",
  },
  badge: {
    color: colors.white,
    fontFamily: fonts.bodySemi,
    fontSize: 9,
  },
  title: {
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.white,
    marginBottom: 1,
  },
  price: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.flameMid,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 8,
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
