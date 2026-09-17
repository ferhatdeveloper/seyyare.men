import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { colors, fonts, radius, space } from "../../lib/theme";

interface Props extends TextInputProps {
  label?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function Field({ label, required, containerStyle, style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.req}> *</Text> : null}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.inkFaint}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 8,
  },
  req: { color: colors.danger },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
    fontFamily: fonts.body,
  },
});
