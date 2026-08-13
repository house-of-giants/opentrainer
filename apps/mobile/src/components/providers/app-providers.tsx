import { ReactNode, useMemo } from "react";
import { Text, View } from "react-native";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;
const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function MissingEnvWarning() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="mb-4 text-2xl font-bold">Configuration Required</Text>
      <Text className="mb-4 text-center">
        Set EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in
        apps/mobile/.env
      </Text>
    </View>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    if (!CONVEX_URL) return null;
    return new ConvexReactClient(CONVEX_URL, {
      unsavedChangesWarning: false,
    });
  }, []);

  if (!CONVEX_URL || !CLERK_KEY || !convex) {
    return <MissingEnvWarning />;
  }

  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
