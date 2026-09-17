/**
 * Visual map stand-in for Expo Go / no native rebuild.
 * react-native-maps is not in Expo Go deps — SoftGradient city grid avoids crashes.
 */
import { SoftGradient as LinearGradient } from "./SoftGradient";
import { MapPin, Navigation } from "lucide-react-native";
import {
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, fonts, radius, shadow } from "../lib/theme";

type Props = {
  pickupLabel: string;
  destinationLabel?: string;
  /** Shown as a region chip; defaults to Baghdad */
  regionLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Baghdad city-center default framing (33.3152, 44.3661). */
export const BAGHDAD_REGION = {
  latitude: 33.3152,
  longitude: 44.3661,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const H_GRID = [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88];
const V_GRID = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94];

/** Soft city-block fills — approximate map parcels */
const BLOCKS: Array<{
  top: DimensionValue;
  left: DimensionValue;
  w: DimensionValue;
  h: DimensionValue;
}> = [
  { top: "14%", left: "8%", w: "18%", h: "12%" },
  { top: "16%", left: "32%", w: "14%", h: "10%" },
  { top: "12%", left: "62%", w: "22%", h: "14%" },
  { top: "42%", left: "6%", w: "16%", h: "14%" },
  { top: "52%", left: "48%", w: "20%", h: "12%" },
  { top: "68%", left: "18%", w: "24%", h: "10%" },
  { top: "72%", left: "66%", w: "18%", h: "12%" },
];

export function MapPlaceholder({
  pickupLabel,
  destinationLabel,
  regionLabel = "Baghdad",
  style,
}: Props) {
  const pickup = pickupLabel.trim() || "—";
  const dest = destinationLabel?.trim();

  return (
    <View style={[styles.root, style]} accessibilityRole="image" accessibilityLabel="Map">
      <LinearGradient
        colors={["#0B121A", "#121C28", "#182434", "#101820"]}
        locations={[0, 0.35, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Parcel blocks */}
      {BLOCKS.map((b, i) => (
        <View
          key={`b-${i}`}
          style={[
            styles.block,
            { top: b.top, left: b.left, width: b.w, height: b.h },
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Street grid */}
      {H_GRID.map((pct) => (
        <View
          key={`h-${pct}`}
          style={[styles.gridH, { top: `${pct * 100}%` }]}
          pointerEvents="none"
        />
      ))}
      {V_GRID.map((pct) => (
        <View
          key={`v-${pct}`}
          style={[styles.gridV, { left: `${pct * 100}%` }]}
          pointerEvents="none"
        />
      ))}

      {/* Primary arteries */}
      <View style={styles.arteryH} pointerEvents="none" />
      <View style={styles.arteryV} pointerEvents="none" />
      <View style={styles.arteryDiag} pointerEvents="none" />
      <View style={styles.river} pointerEvents="none" />

      {/* Route between pins */}
      <View style={styles.route} pointerEvents="none" />
      <View style={styles.routeDotA} pointerEvents="none" />
      <View style={styles.routeDotB} pointerEvents="none" />

      <View style={[styles.pinWrap, styles.pickupPos]}>
        <View style={styles.pinHalo} />
        <View style={styles.pinLabel}>
          <Text style={styles.pinChip}>A</Text>
          <Text style={styles.pinLabelText} numberOfLines={1}>
            {pickup}
          </Text>
        </View>
        <View style={[styles.pinDot, styles.pickupDot]}>
          <MapPin size={16} color={colors.white} strokeWidth={2.4} />
        </View>
        <View style={styles.pinStem} />
      </View>

      {dest ? (
        <View style={[styles.pinWrap, styles.destPos]}>
          <View style={[styles.pinHalo, styles.destHalo]} />
          <View style={[styles.pinLabel, styles.destLabel]}>
            <Text style={[styles.pinChip, styles.destChip]}>B</Text>
            <Text style={styles.pinLabelText} numberOfLines={1}>
              {dest}
            </Text>
          </View>
          <View style={[styles.pinDot, styles.destDot]}>
            <Navigation size={14} color={colors.ink} strokeWidth={2.4} />
          </View>
          <View style={[styles.pinStem, styles.destStem]} />
        </View>
      ) : null}

      <View style={styles.regionBar} pointerEvents="none">
        <View style={styles.regionChip}>
          <Text style={styles.regionText}>{regionLabel}</Text>
          <Text style={styles.regionCoords}>
            {BAGHDAD_REGION.latitude.toFixed(2)}°N · {BAGHDAD_REGION.longitude.toFixed(2)}°E
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#101820",
  },
  block: {
    position: "absolute",
    backgroundColor: "rgba(40,55,72,0.45)",
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.04)",
  },
  gridH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  gridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  arteryH: {
    position: "absolute",
    top: "46%",
    left: "-8%",
    width: "116%",
    height: 11,
    backgroundColor: "rgba(90,110,140,0.42)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(180,200,220,0.18)",
    transform: [{ rotate: "-6deg" }],
  },
  arteryV: {
    position: "absolute",
    top: "8%",
    left: "48%",
    width: 12,
    height: "96%",
    backgroundColor: "rgba(80,100,130,0.4)",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(180,200,220,0.15)",
    transform: [{ rotate: "8deg" }],
  },
  arteryDiag: {
    position: "absolute",
    top: "22%",
    left: "8%",
    width: "78%",
    height: 8,
    backgroundColor: "rgba(70,95,125,0.35)",
    transform: [{ rotate: "32deg" }],
  },
  river: {
    position: "absolute",
    top: "58%",
    left: "-5%",
    width: "50%",
    height: 14,
    borderRadius: 8,
    backgroundColor: "rgba(50,110,150,0.28)",
    transform: [{ rotate: "-18deg" }],
  },
  route: {
    position: "absolute",
    top: "48%",
    left: "28%",
    width: "40%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,106,0,0.7)",
    transform: [{ rotate: "26deg" }],
  },
  routeDotA: {
    position: "absolute",
    top: "46%",
    left: "26%",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.flame,
  },
  routeDotB: {
    position: "absolute",
    top: "64%",
    left: "62%",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  pinWrap: {
    position: "absolute",
    alignItems: "center",
    width: 168,
  },
  pickupPos: {
    top: "34%",
    left: "14%",
  },
  destPos: {
    top: "56%",
    right: "8%",
  },
  pinHalo: {
    position: "absolute",
    bottom: 2,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,106,0,0.18)",
  },
  destHalo: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  pinLabel: {
    maxWidth: 158,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: "rgba(10,10,10,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,106,0,0.5)",
    marginBottom: 6,
    ...shadow.soft,
  },
  destLabel: {
    borderColor: "rgba(255,255,255,0.22)",
  },
  pinChip: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: colors.flame,
    minWidth: 12,
  },
  destChip: {
    color: colors.white,
  },
  pinLabelText: {
    flexShrink: 1,
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    color: colors.white,
  },
  pinDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 1,
  },
  pickupDot: {
    backgroundColor: colors.flame,
  },
  destDot: {
    backgroundColor: colors.white,
  },
  pinStem: {
    width: 3,
    height: 10,
    marginTop: -2,
    backgroundColor: colors.flame,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  destStem: {
    backgroundColor: colors.white,
  },
  regionBar: {
    position: "absolute",
    bottom: 52,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  regionChip: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(10,10,10,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  regionText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.white,
  },
  regionCoords: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 9,
    color: "rgba(255,255,255,0.55)",
  },
});
