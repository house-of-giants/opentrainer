import { Platform } from "react-native";
import { matchFont } from "@shopify/react-native-skia";
import type { SkFont } from "@shopify/react-native-skia";

// Victory Native renders axis labels on the Skia canvas, so it needs an SkFont
// rather than a text style. Web's charts inherit the page font; on mobile we
// match the platform system font instead of bundling a typeface.
export function getChartFont(fontSize = 11): SkFont | null {
  try {
    return matchFont({
      fontFamily: Platform.select({ ios: "Helvetica", default: "sans-serif" }),
      fontSize,
    });
  } catch {
    // matchFont throws when no font manager is available (e.g. tests).
    return null;
  }
}
