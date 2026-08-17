import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { AppProviders } from "@/components/providers/app-providers";
import { toastConfig } from "@/components/ui/toast";
import { ThemeProvider, useTheme } from "@/theme/theme-provider";

function ThemedShell() {
  const { resolved } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <Toast config={toastConfig(resolved)} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <ThemeProvider>
          <ThemedShell />
        </ThemeProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
