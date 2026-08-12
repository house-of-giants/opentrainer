import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { Dumbbell, History, Home, Plus, User } from "lucide-react-native";

// Mirrors apps/web/src/components/navigation/bottom-nav.tsx: 4 tabs with a
// center Start-workout FAB (not a route). The FAB opens StartWorkoutSheet once
// that ships (Phase 4); until then it is rendered but inert.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#7c3aed",
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
          // route — Phase 4 wires this to StartWorkoutSheet.
          tabBarButton: () => (
            <Pressable
              accessibilityLabel="Start workout"
              className="flex-1 items-center justify-center"
              onPress={() => {}}
            >
              <View className="-translate-y-2 h-14 w-14 items-center justify-center rounded-full bg-violet-600 shadow-lg">
                <Plus color="#fff" size={28} />
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
