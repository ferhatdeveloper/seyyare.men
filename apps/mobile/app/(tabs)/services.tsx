import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import { ModeSelect } from "../../components/ModeSelect";
import { colors } from "../../lib/theme";

/** Alt menü — hizmet seçimi */
export default function ServicesScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ModeSelect variant="home" style={styles.body} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  body: {
    flex: 1,
  },
});
