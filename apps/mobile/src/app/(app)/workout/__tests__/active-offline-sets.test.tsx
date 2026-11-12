import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import ActiveWorkoutScreen from "@/app/(app)/workout/active";
import { toast } from "@/components/ui/toast";
import {
  resetPendingSets,
  setConvexConnected,
  simulateAppRestart,
} from "@/test-utils/pending-sets";
import { ThemeProvider } from "@/theme/theme-provider";

// Proof for offline-safe set logging: the Convex mutation is mocked to stay
// pending, to reject, or to succeed only after a remount that simulates a
// killed app. Everything else is the real active workout screen.

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  useConvex: () => require("@/test-utils/pending-sets").mockConvexClient,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), captureException: jest.fn() },
}));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

jest.mock("@/lib/pending-set-queue", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  require("@/test-utils/pending-sets").pendingSetQueueModuleMock(),
);

const STORAGE_KEY = "opentrainer.pendingSets.v1";

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const addLiftingEntry = jest.fn();

type ServerEntry = {
  _id: string;
  clientId: string;
  exerciseName: string;
  kind: "lifting";
  lifting: Record<string, unknown>;
};
let serverEntries: ServerEntry[] = [];

const workout = {
  _id: "workout_1",
  title: "Push",
  status: "in_progress",
  startedAt: Date.now(),
  routineId: "routine_1",
};

const routineExercises = [
  {
    exerciseName: "Bench Press",
    kind: "lifting",
    targetSets: 3,
    targetReps: "5",
    restSeconds: 120,
  },
  {
    exerciseName: "Plank",
    kind: "lifting",
    measurementType: "duration",
    targetSets: 2,
    targetHoldSeconds: 45,
    restSeconds: 60,
  },
];

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
  serverEntries = [];
  mockUseQuery.mockImplementation((ref: unknown) => {
    switch (getFunctionName(ref as never)) {
      case "workouts:getActiveWorkout":
        return workout;
      case "users:getCurrentUser":
        return { preferredUnits: "lb", effortScale: "rpe" };
      case "entries:getEntriesByWorkout":
        return serverEntries;
      case "workouts:getRoutineExercisesForWorkout":
        return routineExercises;
      case "ai/swapMutations:getSwapsForWorkout":
        return [];
      case "exercises:getWeightStep":
        return null;
      case "entries:getExerciseHistory":
      case "entries:getTimedExerciseHistory":
        return [];
      default:
        return undefined;
    }
  });
  mockUseMutation.mockImplementation((ref: unknown) =>
    getFunctionName(ref as never) === "entries:addLiftingEntry"
      ? addLiftingEntry
      : jest.fn(),
  );
});

async function renderScreen() {
  const view = await render(
    <ThemeProvider>
      <ActiveWorkoutScreen />
    </ThemeProvider>,
  );
  await screen.findByText(/^LOG SET \d\/3$/);
  return view;
}

async function storedClientIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as { args: { clientId: string } }[]).map(
    (item) => item.args.clientId,
  );
}

function sentClientIds() {
  return addLiftingEntry.mock.calls.map(([args]) => args.clientId as string);
}

const neverSettles = () => new Promise(() => {});

describe("active workout set logging without a server response", () => {
  it("shows a set and starts the rest timer at once while the save is still pending", async () => {
    addLiftingEntry.mockImplementation(neverSettles);
    await renderScreen();

    await fireEvent.press(screen.getByText("LOG SET 1/3"));

    // The set shows, marked as not yet saved, and the rest timer runs.
    expect(screen.getByText("45lb × 5")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { busy: true })).toHaveLength(1);
    expect(screen.getByText("REST")).toBeOnTheScreen();
    expect(screen.getByText(/^(2:00|1:59)$/)).toBeOnTheScreen();
    expect(screen.getByText("LOG SET 2/3")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("LOG SET 2/3"));

    expect(screen.getAllByText("45lb × 5")).toHaveLength(2);
    expect(addLiftingEntry).toHaveBeenCalledTimes(2);
    expect(addLiftingEntry.mock.calls.map(([args]) => args.lifting.setNumber)).toEqual([1, 2]);
    const [first, second] = sentClientIds();
    expect(first).not.toEqual(second);
    await waitFor(async () => expect(await storedClientIds()).toEqual([first, second]));
  });

  it("shows a timed set and starts its rest timer at once while the save is pending", async () => {
    addLiftingEntry.mockImplementation(neverSettles);
    await renderScreen();

    await fireEvent.press(screen.getByText("Plank"));
    await fireEvent.press(await screen.findByText("LOG SET 1/2"));

    expect(screen.getByText("45s")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { busy: true })).toHaveLength(1);
    expect(screen.getByText(/^(1:00|0:59)$/)).toBeOnTheScreen();
    expect(screen.queryByText("SAVING…")).toBeNull();
    expect(addLiftingEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseName: "Plank",
        lifting: expect.objectContaining({ setNumber: 1, durationSeconds: 45 }),
      }),
    );
    await waitFor(async () => expect(await storedClientIds()).toEqual(sentClientIds()));
  });
});

describe("active workout set logging when the server rejects the save", () => {
  it("keeps the set, shows a clear error, and saves it once on retry with the same clientId", async () => {
    addLiftingEntry.mockRejectedValueOnce(new Error("User not found"));
    await renderScreen();

    await fireEvent.press(screen.getByText("LOG SET 1/3"));

    expect(await screen.findByText("Not saved · Retry")).toBeOnTheScreen();
    expect(toast.error).toHaveBeenCalledWith("Set not saved", "Tap the set to try again.");
    expect(screen.getByText("REST")).toBeOnTheScreen();
    const [clientId] = sentClientIds();
    await waitFor(async () => expect(await storedClientIds()).toEqual([clientId]));

    addLiftingEntry.mockImplementation(serverAcceptsSet);
    await fireEvent.press(screen.getByText("Not saved · Retry"));

    await waitFor(() => expect(screen.queryByText("Not saved · Retry")).toBeNull());
    expect(sentClientIds()).toEqual([clientId, clientId]);
    expect(serverEntries).toHaveLength(1);
    expect(screen.getAllByText("45lb × 5")).toHaveLength(1);
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0);
    await waitFor(async () => expect(await storedClientIds()).toEqual([]));
  });

  it("replays a rejected set when the connection comes back", async () => {
    addLiftingEntry.mockRejectedValueOnce(new Error("User not found"));
    await renderScreen();

    await fireEvent.press(screen.getByText("LOG SET 1/3"));
    await screen.findByText("Not saved · Retry");

    addLiftingEntry.mockImplementation(serverAcceptsSet);
    await act(async () => {
      setConvexConnected(false);
      setConvexConnected(true);
    });

    await waitFor(() => expect(serverEntries).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText("Not saved · Retry")).toBeNull());
    const [clientId] = sentClientIds();
    expect(sentClientIds()).toEqual([clientId, clientId]);
    expect(screen.getAllByText("45lb × 5")).toHaveLength(1);
    await waitFor(async () => expect(await storedClientIds()).toEqual([]));
  });
});

describe("active workout set logging after the app is killed", () => {
  it("does not offer logging until stored sets are restored, so set numbers do not collide", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          args: {
            workoutId: "workout_1",
            clientId: "stored-1",
            exerciseName: "Bench Press",
            lifting: { setNumber: 1, reps: 5, weight: 45, unit: "lb" },
          },
          status: "pending",
        },
      ]),
    );
    addLiftingEntry.mockImplementation(neverSettles);
    let finishRead!: () => void;
    const readHeld = new Promise<void>((resolve) => {
      finishRead = resolve;
    });
    const getItem = AsyncStorage.getItem as jest.Mock;
    const realGetItem = getItem.getMockImplementation()!;
    getItem.mockImplementationOnce(async (key: string) => {
      await readHeld;
      return realGetItem(key);
    });
    simulateAppRestart();

    await render(
      <ThemeProvider>
        <ActiveWorkoutScreen />
      </ThemeProvider>,
    );
    await act(async () => {});
    expect(screen.queryByText(/^LOG SET/)).toBeNull();

    await act(async () => finishRead());
    await fireEvent.press(await screen.findByText("LOG SET 2/3"));

    expect(addLiftingEntry.mock.calls.map(([args]) => args.lifting.setNumber)).toEqual([1, 2]);
  });

  it("replays stored sets in order with their clientIds and loses or duplicates none", async () => {
    addLiftingEntry.mockImplementation(neverSettles);
    const firstRun = await renderScreen();

    await fireEvent.press(screen.getByText("LOG SET 1/3"));
    await fireEvent.press(screen.getByText("LOG SET 2/3"));
    const loggedOffline = sentClientIds();
    await waitFor(async () => expect(await storedClientIds()).toEqual(loggedOffline));

    // The app closes: the screen unmounts and memory is gone. Storage stays.
    await firstRun.unmount();
    simulateAppRestart();
    addLiftingEntry.mockReset();
    // Convex updates queries before it resolves the mutation promise. Hold
    // the promise to check the screen in that window.
    let confirm!: () => void;
    const confirmed = new Promise<void>((resolve) => {
      confirm = resolve;
    });
    addLiftingEntry.mockImplementation(async (args) => {
      const id = await serverAcceptsSet(args);
      await confirmed;
      return id;
    });

    const secondRun = await renderScreen();

    await waitFor(() => expect(serverEntries).toHaveLength(2));
    await secondRun.rerender(
      <ThemeProvider>
        <ActiveWorkoutScreen />
      </ThemeProvider>,
    );
    expect(screen.getAllByText("45lb × 5")).toHaveLength(2);
    expect(await storedClientIds()).toEqual(loggedOffline);

    await act(async () => confirm());
    expect(sentClientIds()).toEqual(loggedOffline);
    expect(addLiftingEntry.mock.calls.map(([args]) => args.lifting.setNumber)).toEqual([1, 2]);
    await waitFor(async () => expect(await storedClientIds()).toEqual([]));
    expect(screen.getAllByText("45lb × 5")).toHaveLength(2);
    expect(screen.queryAllByRole("button", { busy: true })).toHaveLength(0);
    expect(screen.getByText("LOG SET 3/3")).toBeOnTheScreen();
  });
});
