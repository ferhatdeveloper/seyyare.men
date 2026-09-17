import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ModeSelect } from "../components/ModeSelect";
import { colors } from "../lib/theme";

/** Careem-style first-entry service picker. */
export default function ModeSelectScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <ModeSelect variant="full" />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  flex: { flex: 1 },
});
