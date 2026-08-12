import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";

// Phase 2 data-spine screen: proves Clerk-authenticated Convex queries work.
// The full dashboard (weekly stats, resume workout, Training Lab card) lands
// in Phase 4.
export default function DashboardScreen() {
  const user = useQuery(api.users.getCurrentUser);
  const stats = useQuery(api.workouts.getDashboardStats);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1 px-4">
        <Text className="mt-4 text-2xl font-bold">
          {user === undefined
            ? "Loading…"
            : user
              ? `Welcome back${user.name ? `, ${user.name}` : ""}`
              : "Setting up your account…"}
        </Text>
        {stats !== undefined && (
          <View className="mt-4 rounded-xl border border-neutral-200 p-4">
            <Text className="text-base text-neutral-600">
              Live Convex data: {JSON.stringify(stats)?.slice(0, 200)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
