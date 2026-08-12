import { View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

import { FeedbackButton } from "@/components/feedback/feedback-button";

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Web renders <FeedbackButton /> globally inside <SignedIn>; this layout is
  // the mobile equivalent of that auth boundary.
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }} />
      <FeedbackButton />
    </View>
  );
}
