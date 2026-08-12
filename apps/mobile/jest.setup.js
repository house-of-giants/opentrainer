
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const mock = require("@gorhom/bottom-sheet/mock");
  return mock;
});

// Reanimated's shipped mock still requires the real native worklets module;
// a minimal manual mock covers everything the design system uses.
jest.mock("react-native-reanimated", () => {
  const { View, Text, ScrollView } = require("react-native");
  return {
    __esModule: true,
    default: { View, Text, ScrollView },
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (value) => value,
    withSpring: (value) => value,
    withRepeat: (value) => value,
    Easing: { linear: (t) => t, ease: (t) => t },
  };
});
