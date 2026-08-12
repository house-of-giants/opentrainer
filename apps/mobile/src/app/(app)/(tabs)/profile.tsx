import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-neutral-500">Profile — coming in a later phase</Text>
      </View>
    </SafeAreaView>
  );
}
