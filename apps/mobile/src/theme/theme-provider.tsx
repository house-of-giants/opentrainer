import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { View, useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme as nativewindColorScheme } from "nativewind";

import { colorPalettes, themes } from "./tokens";

// Mirrors next-themes semantics on web: user preference is
// light | dark | system, persisted, resolved against the OS scheme.
export type ThemePreference = "light" | "dark" | "system";
type ResolvedScheme = "light" | "dark";

const STORAGE_KEY = "opentrainer.theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedScheme;
  colors: (typeof colorPalettes)["light"];
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const resolved: ResolvedScheme =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  useEffect(() => {
    // Keep NativeWind's `dark:` variant handling in sync with our resolution.
    nativewindColorScheme.set(preference);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      colors: colorPalettes[resolved],
      setPreference,
    }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={themes[resolved]} className="flex-1 bg-background">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
