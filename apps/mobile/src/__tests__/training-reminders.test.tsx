import { Linking } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFunctionName } from "convex/server";
import { useQuery } from "convex/react";
import * as Notifications from "expo-notifications";

import ProfileScreen from "@/app/(app)/(tabs)/profile";
import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { TrainingReminderOffer } from "@/components/reminders/training-reminder-offer";
import { profileUser, profileWorkouts } from "@/__fixtures__/profile-fixtures";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
  useConvex: jest.fn(() => ({ query: jest.fn() })),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let mockIsFocused = true;
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useIsFocused: () => mockIsFocused,
}));

jest.mock(
  "react-native-safe-area-context",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
  useClerk: () => ({ signOut: jest.fn() }),
  useUser: () => ({
    isLoaded: true,
    user: {
      id: "user_clerk",
      imageUrl: "https://img.clerk.com/avatar.png",
      fullName: "Dom Trainer",
      primaryEmailAddress: { emailAddress: "dom@example.com" },
      delete: jest.fn(),
    },
  }),
}));

const getPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const scheduleNotificationAsync = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelScheduledNotificationAsync =
  Notifications.cancelScheduledNotificationAsync as jest.Mock;

const ALL_REMINDER_IDS = [1, 2, 3, 4, 5, 6, 7].map((d) => `training-reminder-${d}`);

const activeWorkout = {
  _id: "workout1",
  title: "Push Day",
  startedAt: Date.now() - 10 * 60000,
  routineId: "routine1",
  exerciseNotes: [],
};

const queryResults: Record<string, unknown> = {
  "users:getCurrentUser": profileUser,
  "workouts:getWorkoutHistory": profileWorkouts,
  "workouts:getActiveWorkout": activeWorkout,
  "entries:getEntriesByWorkout": [
    {
      _id: "entry1",
      exerciseName: "Bench Press",
      kind: "lifting",
      lifting: { setNumber: 1, reps: 8, weight: 135, unit: "lb" },
    },
  ],
  "workouts:getRoutineExercisesForWorkout": [
    { exerciseName: "Bench Press", kind: "lifting", targetSets: 3, targetReps: "8-12" },
  ],
  "ai/swapMutations:getSwapsForWorkout": [],
  "entries:getExerciseHistory": [],
  "exercises:getWeightStep": null,
  "entries:getTimedExerciseHistory": [],
  "exercises:getExercises": [],
  "exercises:getMuscleGroups": [],
};

/** The weekly triggers passed to expo-notifications, as [weekday, hour, minute]. */
function scheduledTriggers() {
  return scheduleNotificationAsync.mock.calls.map(([request]) => [
    request.trigger.weekday,
    request.trigger.hour,
    request.trigger.minute,
  ]);
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockIsFocused = true;
  await AsyncStorage.clear();
  getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  scheduleNotificationAsync.mockResolvedValue("notification-id");
  (useQuery as jest.Mock).mockImplementation((ref, args) => {
    if (args === "skip") return undefined;
    const name = getFunctionName(ref);
    if (!(name in queryResults)) throw new Error(`Unmocked query: ${name}`);
    return queryResults[name];
  });
});

async function renderProfile() {
  await render(
    <ThemeProvider>
      <ProfileScreen />
    </ThemeProvider>,
  );
  // The stored reminder settings load asynchronously.
  await waitFor(() => expect(screen.getByText("Training Reminders")).toBeOnTheScreen());
}

describe("Training reminders in Profile", () => {
  it("schedules a weekly reminder on each chosen weekday at the chosen time", async () => {
    await renderProfile();
    expect(screen.getByText("Off")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Training Reminders"));

    // 4 days/week of availability preselects Mon, Tue, Thu, Fri.
    for (const day of ["Mon", "Tue", "Thu", "Fri"]) {
      expect(screen.getByRole("checkbox", { name: day })).toBeChecked();
    }
    for (const day of ["Wed", "Sat", "Sun"]) {
      expect(screen.getByRole("checkbox", { name: day })).not.toBeChecked();
    }
    expect(screen.getByText("8:00 AM")).toBeOnTheScreen();

    // Pick Mon, Wed, Sat at 6:30 PM.
    await fireEvent.press(screen.getByRole("checkbox", { name: "Tue" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Thu" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Fri" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Wed" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Sat" }));
    for (let i = 0; i < 21; i++) {
      await fireEvent.press(screen.getByRole("button", { name: "Later" }));
    }
    expect(screen.getByText("6:30 PM")).toBeOnTheScreen();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(scheduleNotificationAsync).toHaveBeenCalledTimes(3));
    // expo-notifications weekdays: 1 = Sunday, so Mon = 2, Wed = 4, Sat = 7.
    expect(scheduledTriggers()).toEqual([
      [2, 18, 30],
      [4, 18, 30],
      [7, 18, 30],
    ]);
    const [request] = scheduleNotificationAsync.mock.calls[0];
    expect(request).toEqual({
      identifier: "training-reminder-2",
      content: {
        title: "Training day",
        body: "Your next session is ready.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 2,
        hour: 18,
        minute: 30,
      },
    });
    await waitFor(() =>
      expect(screen.getByText("Mon, Wed, Sat · 6:30 PM")).toBeOnTheScreen(),
    );
  });

  it("cancels only the training reminders when the user turns them off", async () => {
    await AsyncStorage.setItem(
      "opentrainer.trainingReminders",
      JSON.stringify({ enabled: true, weekdays: [2, 4, 6], hour: 7, minute: 0 }),
    );
    await renderProfile();
    expect(screen.getByText("Mon, Wed, Fri · 7:00 AM")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Training Reminders"));
    await fireEvent.press(screen.getByRole("button", { name: "Turn off" }));

    await waitFor(() => expect(screen.getByText("Off")).toBeOnTheScreen());
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    // Fixed ids keep a pending rest-timer notification alive.
    expect(cancelScheduledNotificationAsync.mock.calls.map(([id]) => id).sort()).toEqual(
      ALL_REMINDER_IDS,
    );
    expect(JSON.parse((await AsyncStorage.getItem("opentrainer.trainingReminders"))!)).toEqual(
      { enabled: false, weekdays: [2, 4, 6], hour: 7, minute: 0 },
    );
  });

  it("replaces the old schedule when the user changes the days", async () => {
    await AsyncStorage.setItem(
      "opentrainer.trainingReminders",
      JSON.stringify({ enabled: true, weekdays: [2, 4, 6], hour: 7, minute: 0 }),
    );
    await renderProfile();

    await fireEvent.press(screen.getByText("Training Reminders"));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Fri" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(scheduleNotificationAsync).toHaveBeenCalledTimes(2));
    expect(scheduledTriggers()).toEqual([
      [2, 7, 0],
      [4, 7, 0],
    ]);
    // Friday's old reminder is cancelled before the new schedule goes in.
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith("training-reminder-6");
    expect(cancelScheduledNotificationAsync.mock.invocationCallOrder[0]).toBeLessThan(
      scheduleNotificationAsync.mock.invocationCallOrder[0],
    );
    await waitFor(() => expect(screen.getByText("Mon, Wed · 7:00 AM")).toBeOnTheScreen());
  });

  it("saves nothing when the user denies notification permission", async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    await renderProfile();

    await fireEvent.press(screen.getByText("Training Reminders"));
    await fireEvent.press(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(requestPermissionsAsync).toHaveBeenCalledTimes(1));
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("opentrainer.trainingReminders")).toBeNull();
  });
});

describe("Rate OpenTrainer", () => {
  it("opens the App Store review page", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await renderProfile();

    await fireEvent.press(screen.getByText("Rate OpenTrainer"));

    expect(openURL).toHaveBeenCalledWith(
      "https://apps.apple.com/app/id6800907584?action=write-review",
    );
    openURL.mockRestore();
  });
});

describe("Post-workout reminder offer", () => {
  async function renderWorkoutWithOffer() {
    await render(
      <ThemeProvider>
        <ActiveWorkoutScreen />
        <TrainingReminderOffer />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText("Finish")).toBeOnTheScreen());
  }

  it("does not ask for permission or show the offer before a workout is completed", async () => {
    // A fresh install: the tabs (with the offer) and Profile mount, no workout yet.
    await render(
      <ThemeProvider>
        <ProfileScreen />
        <TrainingReminderOffer />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText("Training Reminders")).toBeOnTheScreen());

    expect(screen.queryByText("Remind you on training days?")).toBeNull();
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("offers reminders after a completed workout and asks for permission only on accept", async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    await renderWorkoutWithOffer();

    await fireEvent.press(screen.getByText("Finish"));

    await waitFor(() =>
      expect(screen.getByText("Remind you on training days?")).toBeOnTheScreen(),
    );
    expect(requestPermissionsAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(scheduleNotificationAsync).toHaveBeenCalledTimes(4));
    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(scheduledTriggers()).toEqual([
      [2, 8, 0],
      [3, 8, 0],
      [5, 8, 0],
      [6, 8, 0],
    ]);
  });

  it("does not prompt again when permission was already granted for rest timers", async () => {
    await renderWorkoutWithOffer();

    await fireEvent.press(screen.getByText("Finish"));
    await waitFor(() =>
      expect(screen.getByText("Remind you on training days?")).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Turn on" }));

    await waitFor(() => expect(scheduleNotificationAsync).toHaveBeenCalledTimes(4));
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("waits until the user is back on the tabs before showing the offer", async () => {
    mockIsFocused = false;
    await renderWorkoutWithOffer();

    await fireEvent.press(screen.getByText("Finish"));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)"));
    expect(screen.queryByText("Remind you on training days?")).toBeNull();

    mockIsFocused = true;
    await screen.rerender(
      <ThemeProvider>
        <ActiveWorkoutScreen />
        <TrainingReminderOffer />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("Remind you on training days?")).toBeOnTheScreen(),
    );
  });

  it("offers reminders only once", async () => {
    await renderWorkoutWithOffer();

    await fireEvent.press(screen.getByText("Finish"));
    await waitFor(() =>
      expect(screen.getByText("Remind you on training days?")).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
    await waitFor(() =>
      expect(screen.queryByText("Remind you on training days?")).toBeNull(),
    );

    await waitFor(() => expect(screen.getByText("Finish")).toBeOnTheScreen());
    await fireEvent.press(screen.getByText("Finish"));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Remind you on training days?")).toBeNull();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
