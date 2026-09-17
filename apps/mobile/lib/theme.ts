/**
 * Seyyare brand tokens — black asphalt + flame orange (logo).
 * Marketplace polish inspired by DubiCars / YallaMotor / CarSwitch.
 */
import { Platform, type ViewStyle } from "react-native";

export const colors = {
  ink: "#0A0A0A",
  inkMuted: "#4A4A4A",
  inkFaint: "#8A8A8A",
  line: "#E8E8E8",
  mist: "#F2F2F2",
  paper: "#F7F7F7",
  white: "#FFFFFF",

  /** Logo flame */
  flame: "#FF6A00",
  flameMid: "#FF8C1A",
  flameDeep: "#E04F00",
  flameSoft: "#FFF1E6",

  /** Aliases — existing screens use viridian* */
  viridian: "#FF6A00",
  viridianDeep: "#E04F00",
  viridianSoft: "#FFF1E6",

  brass: "#C47A2A",
  brassSoft: "#FFF6EC",
  danger: "#C43C3C",
  overlay: "rgba(10, 10, 10, 0.55)",
  overlaySoft: "rgba(10, 10, 10, 0.28)",
} as const;

export const fonts = {
  display: "Outfit_700Bold",
  displayMed: "Outfit_600SemiBold",
  displayReg: "Outfit_500Medium",
  body: "IBMPlexSans_400Regular",
  bodyMed: "IBMPlexSans_500Medium",
  bodySemi: "IBMPlexSans_600SemiBold",
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  section: 36,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0A0A0A",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    android: { elevation: 3 },
    default: {},
  })!,
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0A0A0A",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 1 },
    default: {},
  })!,
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#FF6A00",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  })!,
} as const;
