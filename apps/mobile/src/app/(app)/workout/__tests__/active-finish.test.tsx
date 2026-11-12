import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { resetPendingSets } from "@/test-utils/pending-sets";
import { ThemeProvider } from "@/theme/theme-provider";

// Proof for the Finish path: the Convex mutations are mocked, and completing
// clears the active workout as Convex does before the mutation resolves.
// Everything else is the real active workout screen and the real set queue.

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  useConvex: () => require("@/test-utils/pending-sets").mockConvexClient,
}));

jest.mock("@/lib/pending-set-queue", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  require("@/test-utils/pending-sets").pendingSetQueueModuleMock(),
);

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), captureException: jest.fn() },
}));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

const STORAGE_KEY = "opentrainer.pendingSets.v1";
const HOME = "/(app)/(tabs)";
const SUMMARY = { pathname: "/(app)/workout/summary", params: { id: "workout_1" } };

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const addLiftingEntry = jest.fn();
const completeWorkout = jest.fn();

type ServerEntry = {
  _id: string;
  clientId: string;
  exerciseName: string;
  kind: "lifting";
  lifting: Record<string, unknown>;
};

const routineWorkout = {
  _id: "workout_1",
  title: "Push",
  status: "in_progress",
  startedAt: Date.now() - 30 * 60000,
  routineId: "routine_1",
};

const routineExercises = [
  { exerciseName: "Bench Press", kind: "lifting", targetSets: 3, targetReps: "5" },
];

let activeWorkout: Record<string, unknown> | null;
let serverEntries: ServerEntry[];
let routineExerciseRows: unknown;
let swaps: unknown[];

/** Accepts a set like addLiftingEntry: a known clientId is not inserted again. */
async function serverAcceptsSet(args: {
  clientId: string;
  exerciseName: string;
  lifting: Record<string, unknown>;
}) {
  const existing = serverEntries.find((entry) => entry.clientId === args.clientId);
  if (existing) return existing._id;
  const entry: ServerEntry = {
    _id: `entry_${serverEntries.length + 1}`,
    clientId: args.clientId,
    exerciseName: args.exerciseName,
    kind: "lifting",
    lifting: args.lifting,
  };
  serverEntries = [...serverEntries, entry];
  return entry._id;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await resetPendingSets();
  activeWorkout = routineWorkout;
  serverEntries = [];
  routineExerciseRows = routineExercises;
  swaps = [];
  mockUseQuery.mockImplementation((ref: unknown, args: unknown) => {
    if (args === "skip") return undefined;
    switch (getFunctionName(ref as never)) {
      case "workouts:getActiveWorkout":
        return activeWorkout;
      case "users:getCurrentUser":
        return { preferredUnits: "lb", effortScale: "rpe" };
      case "entries:getEntriesByWorkout":
        return serverEntries;
      case "workouts:getRoutineExercisesForWorkout":
        return routineExerciseRows;
      case "ai/swapMutations:getSwapsForWorkout":
        return swaps;
      case "exercises:getWeightStep":
        return null;
      case "entries:getExerciseHistory":
      case "entries:getTimedExerciseHistory":
        return [];
      default:
        return undefined;
    }
  });
  completeWorkout.mockImplementation(async () => {
    activeWorkout = null;
  });
  mockUseMutation.mockImplementation((ref: unknown) => {
    switch (getFunctionName(ref as never)) {
      case "entries:addLiftingEntry":
        return addLiftingEntry;
      case "workouts:completeWorkout":
        return completeWorkout;
      default:
        return jest.fn();
    }
  });
});

async function renderScreen() {
  await render(
    <ThemeProvider>
      <ActiveWorkoutScreen />
    </ThemeProvider>,
  );
}

async function storedClientIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as { args: { clientId: string } }[]).map(
    (item) => item.args.clientId,
  );
}

/** Logs one Bench Press set that the server rejects. */
async function logRejectedSet() {
  addLiftingEntry.mockRejectedValueOnce(new Error("User not found"));
  await renderScreen();
  await fireEvent.press(await screen.findByText("LOG SET 1/3"));
  await screen.findByText("Not saved · Retry");
  // Close the rest timer so its interval does not outlive the test.
  await fireEvent.press(screen.getByText("Skip Rest"));
}

describe("Finish with a set the server rejected", () => {
  it("sends the set again before it completes the workout", async () => {
    await logRejectedSet();
    addLiftingEntry.mockImplementation(serverAcceptsSet);

    await fireEvent.press(screen.getByText("Finish"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(SUMMARY));
    expect(addLiftingEntry).toHaveBeenCalledTimes(2);
    expect(serverEntries).toHaveLength(1);
    // The set is on the server before the workout completes.
    expect(addLiftingEntry.mock.invocationCallOrder[1]).toBeLessThan(
      completeWorkout.mock.invocationCallOrder[0],
    );
    expect(completeWorkout).toHaveBeenCalledWith({ workoutId: "workout_1" });
    expect(screen.queryByText("1 set not saved")).toBeNull();
    await waitFor(async () => expect(await storedClientIds()).toEqual([]));
  });

  it("asks before it finishes without a set that still fails, and keeps it until told", async () => {
    await logRejectedSet();
    const [[{ clientId }]] = addLiftingEntry.mock.calls;
    addLiftingEntry.mockRejectedValue(new Error("User not found"));

    await fireEvent.press(screen.getByText("Finish"));

    expect(await screen.findByText("1 set not saved")).toBeOnTheScreen();
    expect(addLiftingEntry).toHaveBeenCalledTimes(2);
    expect(completeWorkout).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();

    // Try again sends the set once more and asks again while it still fails.
    await fireEvent.press(screen.getByText("Try again"));
    await waitFor(() => expect(addLiftingEntry).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("1 set not saved")).toBeOnTheScreen();
    expect(completeWorkout).not.toHaveBeenCalled();
    expect(await storedClientIds()).toEqual([clientId]);

    await fireEvent.press(screen.getByText("Finish without it"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(SUMMARY));
    expect(completeWorkout).toHaveBeenCalledTimes(1);
    expect(addLiftingEntry).toHaveBeenCalledTimes(3);
    await waitFor(async () => expect(await storedClientIds()).toEqual([]));
  });

  it("sends the set again before it finishes with an edited time", async () => {
    await logRejectedSet();
    addLiftingEntry.mockImplementation(serverAcceptsSet);

    await fireEvent.press(screen.getByText("Edit time"));
    await fireEvent.press(await screen.findByText("Finish Workout"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(SUMMARY));
    expect(serverEntries).toHaveLength(1);
    expect(addLiftingEntry.mock.invocationCallOrder[1]).toBeLessThan(
      completeWorkout.mock.invocationCallOrder[0],
    );
    expect(completeWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutId: "workout_1",
        startedAtOverride: expect.any(Number),
        completedAtOverride: expect.any(Number),
      }),
    );
  });
});

describe("Finish a workout that did not come from a routine", () => {
  beforeEach(() => {
    activeWorkout = { ...routineWorkout, routineId: undefined };
    routineExerciseRows = [];
    serverEntries = [
      {
        _id: "entry_1",
        clientId: "saved-1",
        exerciseName: "Bench Press",
        kind: "lifting",
        lifting: { setNumber: 1, reps: 5, weight: 135, unit: "lb" },
      },
    ];
  });

  it("offers to save it as a routine instead of going home", async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByText("Finish"));

    expect(await screen.findByText("Save as Routine?")).toBeOnTheScreen();
    expect(completeWorkout).toHaveBeenCalledWith({ workoutId: "workout_1" });
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Skip"));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(HOME));
  });

  it("goes home when the lifter closes the save offer", async () => {
    await renderScreen();
    await fireEvent.press(await screen.findByText("Finish"));
    await screen.findByText("Save as Routine?");

    await fireEvent.press(screen.getByLabelText("Close"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(HOME));
  });

  it("asks about swaps first, then offers to save it as a routine", async () => {
    swaps = [
      {
        _id: "swap_1",
        originalExercise: "Barbell Row",
        substitutedExercise: "Bench Press",
        reason: "discomfort",
      },
    ];
    await renderScreen();
    await fireEvent.press(await screen.findByText("Finish"));

    expect(await screen.findByText("About your exercise swaps")).toBeOnTheScreen();
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Dismiss all"));
    expect(await screen.findByText("Save as Routine?")).toBeOnTheScreen();
  });

  it("moves on to the save offer after the lifter answers the last swap", async () => {
    swaps = [
      {
        _id: "swap_1",
        originalExercise: "Barbell Row",
        substitutedExercise: "Bench Press",
        reason: "discomfort",
      },
    ];
    // Answering a swap marks it shown, so the query no longer returns it.
    const markPromptShown = jest.fn(async ({ swapId }: { swapId: string }) => {
      swaps = swaps.filter((swap) => (swap as { _id: string })._id !== swapId);
    });
    const defaultMutation = mockUseMutation.getMockImplementation()!;
    mockUseMutation.mockImplementation((ref: unknown) =>
      getFunctionName(ref as never) === "ai/swapMutations:markPermanentSwapPromptShown"
        ? markPromptShown
        : defaultMutation(ref),
    );
    await renderScreen();
    await fireEvent.press(await screen.findByText("Finish"));
    await screen.findByText("About your exercise swaps");

    await fireEvent.press(screen.getByText("Keep original"));

    expect(await screen.findByText("Save as Routine?")).toBeOnTheScreen();
    expect(markPromptShown).toHaveBeenCalledWith({ swapId: "swap_1" });
  });

  it("moves on after two swaps are answered before the server replies", async () => {
    swaps = [
      {
        _id: "swap_1",
        originalExercise: "Barbell Row",
        substitutedExercise: "Bench Press",
        reason: "discomfort",
      },
      {
        _id: "swap_2",
        originalExercise: "Squat",
        substitutedExercise: "Leg Press",
        reason: "equipment_unavailable",
      },
    ];
    let reply!: () => void;
    const replied = new Promise<void>((resolve) => {
      reply = resolve;
    });
    const markPromptShown = jest.fn(async ({ swapId }: { swapId: string }) => {
      await replied;
      swaps = swaps.filter((swap) => (swap as { _id: string })._id !== swapId);
    });
    const defaultMutation = mockUseMutation.getMockImplementation()!;
    mockUseMutation.mockImplementation((ref: unknown) =>
      getFunctionName(ref as never) === "ai/swapMutations:markPermanentSwapPromptShown"
        ? markPromptShown
        : defaultMutation(ref),
    );
    await renderScreen();
    await fireEvent.press(await screen.findByText("Finish"));
    await screen.findByText("About your exercise swaps");

    // Both answers go out before either reply comes back.
    const first = fireEvent.press(screen.getByText("Keep original"));
    const second = fireEvent.press(screen.getByText("Not now"));
    await waitFor(() => expect(markPromptShown).toHaveBeenCalledTimes(2));
    reply();
    await Promise.all([first, second]);

    expect(await screen.findByText("Save as Routine?")).toBeOnTheScreen();
  });
});
