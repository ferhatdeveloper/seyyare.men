import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { BrandMark } from "./BrandMark";
import { BrandWordmark, type BrandScript } from "./BrandWordmark";

export type SplashLocale = "tr" | "en" | "ar" | "ku";

const LOCALES: SplashLocale[] = ["tr", "en", "ar", "ku"];

const WORDMARK: Record<SplashLocale, BrandScript> = {
  tr: "latin",
  en: "latin",
  ar: "arabic",
  ku: "kurdish",
};

const HOLD_MS = 850;
const FADE_MS = 260;

type BelowCtx = {
  locale: SplashLocale;
  opacity: Animated.Value;
  rtl: boolean;
};

type Props = {
  markSize?: number;
  wordSize?: number;
  /** loop = services tab; once = splash one full TR→…→TR */
  mode?: "loop" | "once";
  onCycleComplete?: () => void;
  /** Optional row under wordmark (splash service icons) — shares fade opacity */
  below?: (ctx: BelowCtx) => ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Splash logo lockup: fixed BrandMark + fading multilingual wordmark.
 */
export function AnimatedBrandLockup({
  markSize = 88,
  wordSize = 36,
  mode = "loop",
  onCycleComplete,
  below,
  style,
}: Props) {
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [localeIndex, setLocaleIndex] = useState(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onCycleComplete);
  onCompleteRef.current = onCycleComplete;

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    doneRef.current = false;
    textOpacity.setValue(1);

    const cycle = () => {
      if (cancelled) return;

      Animated.timing(textOpacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;

        i = (i + 1) % LOCALES.length;
        setLocaleIndex(i);

        if (mode === "once" && i === 0 && !doneRef.current) {
          doneRef.current = true;
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: FADE_MS,
            useNativeDriver: true,
          }).start(() => {
            onCompleteRef.current?.();
          });
          return;
        }

        Animated.timing(textOpacity, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(() => {
          if (!cancelled) setTimeout(cycle, HOLD_MS);
        });
      });
    };

    const t = setTimeout(cycle, HOLD_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mode, textOpacity]);

  const locale = LOCALES[localeIndex];
  const script = WORDMARK[locale];
  const rtl = locale === "ar" || locale === "ku";

  return (
    <View style={[styles.root, style]}>
      <BrandMark size={markSize} style={styles.mark} />
      <View style={[styles.wordSlot, { minHeight: wordSize + 12 }]}>
        <Animated.View style={{ opacity: textOpacity }}>
          <BrandWordmark script={script} size={wordSize} tone="light" />
        </Animated.View>
      </View>
      {below?.({ locale, opacity: textOpacity, rtl })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    width: "100%",
  },
  mark: {
    marginBottom: 14,
  },
  wordSlot: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
});
