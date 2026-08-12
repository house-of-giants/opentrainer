import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { Dumbbell, History, Home, Plus, User } from "lucide-react-native";

import {
  StartWorkoutProvider,
  useStartWorkout,
} from "@/components/workout/start-workout-provider";
import { useTheme } from "@/theme/theme-provider";

// Mirrors apps/web/src/components/navigation/bottom-nav.tsx: 4 tabs with a
// center Start-workout FAB (not a route). The provider owns the single
// StartWorkoutSheet instance so the FAB and any tab screen can open it.
export default function TabsLayout() {
  return (
    <StartWorkoutProvider>
      <TabsNavigator />
    </StartWorkoutProvider>
  );
}

function TabsNavigator() {
  const { colors } = useTheme();
  const { open } = useStartWorkout();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <History color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="start"
        options={{
          title: "",
          // Custom center button: never navigates to the (empty) "start"
          // route — it opens StartWorkoutSheet, matching web's bottom-nav
          // onStartWorkout.
          tabBarButton: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start workout"
              className="flex-1 items-center justify-center"
              onPress={open}
            >
              <View className="-translate-y-2 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg">
                <Plus color={colors.primaryForeground} size={28} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: "Routines",
          tabBarIcon: ({ color, size }) => (
            <Dumbbell color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
