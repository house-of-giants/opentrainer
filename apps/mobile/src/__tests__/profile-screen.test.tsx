import { Share } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import ProfileScreen from "@/app/(app)/(tabs)/profile";
import { profileUser, profileWorkouts } from "@/__fixtures__/profile-fixtures";
import { analytics } from "@/lib/analytics";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
  useConvex: jest.fn(() => ({ query: mockConvexQuery })),
}));

const mockConvexQuery = jest.fn();

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), identify: jest.fn(), captureException: jest.fn() },
}));

const mockCapture = analytics.capture as jest.Mock;

// Files the screen writes, keyed by uri. The mock follows the expo-file-system
// `new File(directory, name)` API that the screen uses.
const mockWrittenFiles = new Map<string, string>();
jest.mock("expo-file-system", () => ({
  Paths: { cache: { uri: "file:///cache/" } },
  File: class {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    create() {}
    write(content: string) {
      mockWrittenFiles.set(this.uri, content);
    }
  },
}));

const exportPayload = {
  exportedAt: "2026-11-12T10:00:00.000Z",
  routines: [{ name: "Upper / Lower" }],
  workouts: [
    {
      title: "Upper, heavy",
      status: "completed",
      startedAt: "2026-11-10T14:03:00.000Z",
      entries: [
        {
          exerciseName: "Bench Press",
          kind: "lifting",
          lifting: { setNumber: 1, reps: 10, weight: 95, unit: "lb", isWarmup: true },
          createdAt: "2026-11-10T14:05:00.000Z",
        },
        {
          exerciseName: "Bench Press",
          kind: "lifting",
          lifting: { setNumber: 2, reps: 5, weight: 185, unit: "lb", rpe: 8 },
          notes: "paused",
          createdAt: "2026-11-10T14:08:00.000Z",
        },
        {
          exerciseName: "Rower",
          kind: "cardio",
          cardio: { mode: "steady", durationSeconds: 600 },
          createdAt: "2026-11-10T14:30:00.000Z",
        },
      ],
    },
  ],
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const mockSignOut = jest.fn();
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ signOut: mockSignOut }),
  useClerk: () => ({ signOut: mockSignOut }),
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

const mockUseQuery = useQuery as jest.Mock;

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "users:getCurrentUser": profileUser,
    "workouts:getWorkoutHistory": profileWorkouts,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWrittenFiles.clear();
  mockQueries();
});

async function renderProfile() {
  await render(
    <ThemeProvider>
      <ProfileScreen />
    </ThemeProvider>,
  );
}

describe("Profile screen", () => {
  it("renders the user card, stats and training profile values", async () => {
    await renderProfile();

    expect(screen.getByText("Dom Trainer")).toBeOnTheScreen();
    expect(screen.getByText("dom@example.com")).toBeOnTheScreen();

    // Stats only count completed workouts (2 of the 3 fixtures).
    expect(screen.getByText("2")).toBeOnTheScreen();
    expect(screen.getByText("30")).toBeOnTheScreen();
    expect(screen.getByText("20k")).toBeOnTheScreen();
    expect(screen.getByText("Volume (lb)")).toBeOnTheScreen();

    // Training Profile rows.
    expect(screen.getByText("Strength, Hypertrophy")).toBeOnTheScreen();
    expect(screen.getByText("Intermediate")).toBeOnTheScreen();
    expect(screen.getByText("3 items selected")).toBeOnTheScreen();
    expect(screen.getByText("4 days/week · 60 min")).toBeOnTheScreen();
    // Body + preferences.
    expect(screen.getByText("185 lb")).toBeOnTheScreen();
    expect(screen.getByText("Imperial (lb)")).toBeOnTheScreen();
  });

  it("renders no subscription or billing surface", async () => {
    await renderProfile();

    for (const copy of [
      "Subscription",
      "Pro Plan",
      "Get Pro Free",
      "Manage subscription",
      "Free during alpha",
      "ACTIVE",
      "ALPHA",
    ]) {
      expect(screen.queryByText(copy)).toBeNull();
    }
  });

  it("cycles the appearance preference light -> dark -> system", async () => {
    await renderProfile();

    // ThemeProvider defaults to "system"; web's cycle sends system -> light.
    expect(screen.getByText("System")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Appearance"));
    expect(screen.getByText("Light")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Appearance"));
    expect(screen.getByText("Dark")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Appearance"));
    expect(screen.getByText("System")).toBeOnTheScreen();
  });

  it("switches the effort scale from the RPE default to RIR", async () => {
    const updatePreferences = jest.fn(async () => "user_1");
    (useMutation as jest.Mock).mockImplementation((ref: unknown) =>
      getFunctionName(ref as never) === "users:updatePreferences"
        ? updatePreferences
        : jest.fn(),
    );
    await renderProfile();

    expect(screen.getByText("RPE 6–10, in half steps")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Effort Scale"));

    expect(updatePreferences).toHaveBeenCalledTimes(1);
    expect(updatePreferences).toHaveBeenCalledWith({ effortScale: "rir" });
  });

  it("shows the stored RIR scale and switches back to RPE", async () => {
    const updatePreferences = jest.fn(async () => "user_1");
    (useMutation as jest.Mock).mockImplementation((ref: unknown) =>
      getFunctionName(ref as never) === "users:updatePreferences"
        ? updatePreferences
        : jest.fn(),
    );
    mockQueries({
      "users:getCurrentUser": { ...profileUser, effortScale: "rir" },
    });
    await renderProfile();

    expect(screen.getByText("Reps in reserve, 0–4")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Effort Scale"));

    expect(updatePreferences).toHaveBeenCalledWith({ effortScale: "rpe" });
  });

  it("signs out through Clerk from the account row", async () => {
    await renderProfile();

    await fireEvent.press(screen.getByText("Sign Out"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("shows the loading skeleton until Convex resolves the user", async () => {
    mockQueries({ "users:getCurrentUser": undefined });
    await renderProfile();

    expect(screen.queryByText("Profile")).toBeNull();
    expect(screen.queryByText("Training Profile")).toBeNull();
  });
  it("shares workout history as a CSV file, not as message text", async () => {
    mockConvexQuery.mockResolvedValue(exportPayload);
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction } as never);
    await renderProfile();

    await fireEvent.press(screen.getByText("Export Workout History"));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));

    const [content] = shareSpy.mock.calls[0];
    expect(content).not.toHaveProperty("message");
    expect(content.url).toMatch(/^file:\/\/\/cache\/opentrainer-export-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content.title).toBe(content.url!.replace("file:///cache/", ""));
    expect(mockWrittenFiles.get(content.url!)).toBe(
      "date,workout_title,exercise,set_number,set_type,weight,unit,reps,duration_seconds,rpe,rir,notes\r\n" +
        '2026-11-10T14:03:00.000Z,"Upper, heavy",Bench Press,1,warmup,95,lb,10,,,,\r\n' +
        '2026-11-10T14:03:00.000Z,"Upper, heavy",Bench Press,2,work,185,lb,5,,8,,paused\r\n',
    );
    await waitFor(() =>
      expect(mockCapture.mock.calls).toEqual([
        ["data_exported", { scope: "all_data", method: "share", format: "csv" }],
      ]),
    );
    shareSpy.mockRestore();
  });

  it("shares all data as a JSON file and does not count a dismissed share", async () => {
    mockConvexQuery.mockResolvedValue(exportPayload);
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValueOnce({ action: Share.sharedAction } as never)
      .mockResolvedValueOnce({ action: Share.dismissedAction } as never);
    await renderProfile();

    await fireEvent.press(screen.getByText("Export All Data"));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    await act(async () => {});

    const [content] = shareSpy.mock.calls[0];
    expect(content).not.toHaveProperty("message");
    expect(content.url).toMatch(/^file:\/\/\/cache\/opentrainer-export-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(mockWrittenFiles.get(content.url!)!)).toEqual(exportPayload);

    await waitFor(() =>
      expect(screen.getByText("A JSON file with your workouts, routines & more")).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByText("Export All Data"));
    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(2));
    await act(async () => {});

    expect(mockCapture.mock.calls).toEqual([
      ["data_exported", { scope: "all_data", method: "share", format: "json" }],
    ]);
    shareSpy.mockRestore();
  });
});
