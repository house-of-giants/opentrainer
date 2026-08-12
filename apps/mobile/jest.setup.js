
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

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, canAskAgain: true }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, canAskAgain: true }),
  ),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("notification-id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
}));

jest.mock("expo-keep-awake", () => ({
  useKeepAwake: jest.fn(),
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

// The analytics wrapper no-ops without an API key, but keep the native module
// out of the jest module graph entirely.
jest.mock("posthog-react-native", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    captureException: jest.fn(),
  })),
}));

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
