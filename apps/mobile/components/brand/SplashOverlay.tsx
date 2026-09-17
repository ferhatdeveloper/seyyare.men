import { Car, CarTaxiFront, KeyRound } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../../lib/theme";
import {
  AnimatedBrandLockup,
  type SplashLocale,
} from "./AnimatedBrandLockup";

type Props = {
  visible: boolean;
  onFinish: () => void;
};

/** Dil → hizmet yazıları (ikonlar sabit) */
const SERVICE_COPY: Record<
  SplashLocale,
  { sell: string; rent: string; taxi: string }
> = {
  tr: {
    sell: "Araç Satış",
    rent: "Kiralama",
    taxi: "Taksi Çağırma",
  },
  en: {
    sell: "Car Sales",
    rent: "Rentals",
    taxi: "Call Taxi",
  },
  ar: {
    sell: "بيع السيارات",
    rent: "تأجير",
    taxi: "طلب تاكسي",
  },
  ku: {
    sell: "فرۆشتنی ئۆتۆمبێل",
    rent: "کرێ",
    taxi: "داواکردنی تاکسی",
  },
};

const SERVICE_ICONS = [
  { key: "sell" as const, Icon: Car },
  { key: "rent" as const, Icon: KeyRound },
  { key: "taxi" as const, Icon: CarTaxiFront },
];

/** Splash: sabit ikon + TR → EN → AR → KU yazı döngüsü */
export function SplashOverlay({ visible, onFinish }: Props) {
  const rootOpacity = useRef(new Animated.Value(1)).current;
  const doneRef = useRef(false);

  const onCycleComplete = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setTimeout(() => {
      Animated.timing(rootOpacity, {
        toValue: 0,
        duration: 360,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, 420);
  }, [onFinish, rootOpacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.root, { opacity: rootOpacity }]} pointerEvents="auto">
      <View style={styles.center}>
        <AnimatedBrandLockup
          markSize={88}
          wordSize={36}
          mode="once"
          onCycleComplete={onCycleComplete}
          below={({ locale, opacity, rtl }) => {
            const labels = SERVICE_COPY[locale];
            return (
              <Animated.View
                style={[
                  styles.services,
                  { opacity },
                  rtl ? styles.servicesRtl : null,
                ]}
              >
                {SERVICE_ICONS.map((s, idx) => {
                  const Icon = s.Icon;
                  return (
                    <View key={s.key} style={styles.serviceItem}>
                      {idx > 0 ? <View style={styles.serviceDivider} /> : null}
                      <View style={styles.serviceInner}>
                        <View style={styles.serviceIcon}>
                          <Icon size={18} color={colors.flame} strokeWidth={2.2} />
                        </View>
                        <Text style={styles.serviceLabel} numberOfLines={2}>
                          {labels[s.key]}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Animated.View>
            );
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    paddingHorizontal: 28,
    width: "100%",
    maxWidth: 360,
  },
  services: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.14)",
    paddingTop: 22,
    marginTop: 22,
    minHeight: 88,
  },
  servicesRtl: {
    flexDirection: "row-reverse",
  },
  serviceItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  serviceDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.18)",
    marginVertical: 2,
  },
  serviceInner: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,106,0,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceLabel: {
    fontFamily: fonts.bodyMed,
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },
});
