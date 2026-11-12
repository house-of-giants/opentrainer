import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useQuery } from "convex/react";

import ExerciseHistoryScreen from "@/app/(app)/exercise/[name]";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
}));

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ name: "Bench Press" }),
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
}));

jest.mock(
  "react-native-safe-area-context",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  () => require("react-native-safe-area-context/jest/mock").default,
);

// The chart draws on the Skia canvas; stub it and assert on the screen text.
jest.mock("victory-native", () => ({
  CartesianChart: () => null,
  Line: () => null,
  Scatter: () => null,
}));

jest.mock("@shopify/react-native-skia", () => ({
  matchFont: () => {
    throw new Error("no font manager in jest");
  },
}));

const mockUseQuery = useQuery as jest.Mock;

type QueryArgs = { exerciseName: string; sessionCount?: number };

function mockQueries(history: unknown, user: unknown = { tier: "free", preferredUnits: "kg" }) {
  const calls: QueryArgs[] = [];
  mockUseQuery.mockImplementation((ref: unknown, args: QueryArgs) => {
    const name = getFunctionName(ref as never);
    if (name === "users:getCurrentUser") return user;
    if (name === "entries:getExerciseHistory") {
      calls.push(args);
      return history;
    }
    throw new Error(`Unmocked query: ${name}`);
  });
  return calls;
}

function set(setNumber: number, weight: number, reps: number, extra = {}) {
  return { setNumber, weight, reps, rpe: null, unit: "kg", isWarmup: false, ...extra };
}

// Newest first, as entries.getExerciseHistory returns them.
const history = [
  {
    workoutId: "w2",
    date: "2026-07-08T12:00:00.000Z",
    sets: [set(1, 60, 5, { isWarmup: true }), set(2, 95, 5)],
    bestSet: { weight: 95, reps: 5, rpe: null, unit: "kg" },
  },
  {
    workoutId: "w1",
    date: "2026-07-01T12:00:00.000Z",
    sets: [set(1, 100, 3)],
    bestSet: { weight: 100, reps: 3, rpe: null, unit: "kg" },
  },
];

async function renderScreen() {
  await render(
    <ThemeProvider>
      <ExerciseHistoryScreen />
    </ThemeProvider>,
  );
}

describe("ExerciseHistoryScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("asks the history query for every session, not the default three", async () => {
    const calls = mockQueries(history);
    await renderScreen();

    expect(calls.length).toBeGreaterThan(0);
    for (const args of calls) {
      expect(args.exerciseName).toBe("Bench Press");
      expect(args.sessionCount).toBeGreaterThan(100);
    }
  });

  it("shows a lighter 5-rep set as an e1RM PR when it beats the old best, for a free user", async () => {
    mockQueries(history);
    await renderScreen();

    // 95 × 5 → 110.8 kg beats 100 × 3 → 110 kg.
    expect(screen.getByText("110.8 kg")).toBeOnTheScreen();
    expect(screen.getByText(/95 kg × 5 on Jul 8, 2026/)).toBeOnTheScreen();
    expect(screen.getByText("e1RM PR")).toBeOnTheScreen();
    expect(screen.getByText("2 sessions", { exact: false })).toBeOnTheScreen();

    // Each session lists its sets; the warm-up is shown but has no PR.
    expect(screen.getByText("e1RM 110.8 kg")).toBeOnTheScreen();
    expect(screen.getByText("e1RM 110 kg")).toBeOnTheScreen();
    expect(screen.getByText("Warmup")).toBeOnTheScreen();
    expect(screen.getByText("60 kg × 5")).toBeOnTheScreen();

    // Best set for each rep count, from work sets only (not the 60 kg warm-up).
    const repBests = screen.getByTestId("rep-bests");
    expect(within(repBests).getByText("3 reps")).toBeOnTheScreen();
    expect(within(repBests).getByText("100 kg")).toBeOnTheScreen();
    expect(within(repBests).getByText("5 reps")).toBeOnTheScreen();
    expect(within(repBests).getByText("95 kg")).toBeOnTheScreen();
    expect(within(repBests).queryByText("60 kg")).not.toBeOnTheScreen();

    expect(screen.getByText("e1RM over time")).toBeOnTheScreen();
  });

  it("counts every session in a history longer than 100 workouts", async () => {
    const long = Array.from({ length: 150 }, (_, i) => ({
      workoutId: `w${i}`,
      date: new Date(Date.UTC(2024, 0, 1) + (150 - i) * 86_400_000).toISOString(),
      sets: [set(1, 100, 5)],
      bestSet: { weight: 100, reps: 5, rpe: null, unit: "kg" },
    }));
    mockQueries(long);
    await renderScreen();

    expect(screen.getByText("150 sessions", { exact: false })).toBeOnTheScreen();
  });

  it("shows an empty state before the exercise has a finished session", async () => {
    mockQueries([]);
    await renderScreen();

    expect(screen.getByText("No finished sessions yet")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Go back"));
    expect(mockBack).toHaveBeenCalled();
  });
});
