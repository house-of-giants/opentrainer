import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

import { FeedbackButton } from "@/components/feedback/feedback-button";

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  // Never render null while Clerk initializes (see (auth)/_layout.tsx).
  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Web renders <FeedbackButton /> globally inside <SignedIn>; this layout is
  // the mobile equivalent of that auth boundary. App Store screenshot builds
  // hide it so it does not cover content; Expo inlines the flag at build time.
  const screenshotMode = process.env.EXPO_PUBLIC_SCREENSHOT_MODE === "1";
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }} />
      {!screenshotMode && <FeedbackButton />}
    </View>
  );
}
