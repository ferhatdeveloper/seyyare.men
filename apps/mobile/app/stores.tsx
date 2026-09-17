import { Redirect } from "expo-router";

/** Eski /stores yolu → Mağazalar sekmesi */
export default function StoresRedirect() {
  return <Redirect href="/(tabs)/stores" />;
}
