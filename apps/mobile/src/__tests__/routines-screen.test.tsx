import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";

import RoutinesScreen from "@/app/(app)/(tabs)/routines";
import { routinesListFixture } from "@/components/workout/__fixtures__/routine-fixtures";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;

const createWorkout = jest.fn().mockResolvedValue("workout_1");
const deleteRoutine = jest.fn().mockResolvedValue(null);
const importRoutine = jest.fn().mockResolvedValue(null);

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "routines:getRoutines": routinesListFixture,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
  const mutations: Record<string, jest.Mock> = {
    "workouts:createWorkout": createWorkout,
    "routines:deleteRoutine": deleteRoutine,
    "routines:importRoutineFromJson": importRoutine,
  };
  mockUseMutation.mockImplementation(
    (ref: unknown) => mutations[getFunctionName(ref as never)] ?? jest.fn(),
  );
});

async function renderRoutines() {
  await render(
    <ThemeProvider>
      <RoutinesScreen />
    </ThemeProvider>,
  );
}

describe("Routines screen", () => {
  it("renders the routine list with day counts and source badges", async () => {
    await renderRoutines();

    expect(screen.getByText("My Routines")).toBeOnTheScreen();
    expect(screen.getByText("Push Pull Legs")).toBeOnTheScreen();
    expect(screen.getByText("Classic 3-day split")).toBeOnTheScreen();
    expect(screen.getByText("2 days")).toBeOnTheScreen();
    expect(screen.getByText("Imported Plan")).toBeOnTheScreen();
    expect(screen.getByText("1 day")).toBeOnTheScreen();
    expect(screen.getByText("Imported")).toBeOnTheScreen();
  });

  it("routes to the builder from the New button", async () => {
    await renderRoutines();

    await fireEvent.press(screen.getByText("New"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/routines/new");
  });

  it("opens the detail sheet and starts a workout for the picked day", async () => {
    await renderRoutines();

    // Detail sheet is closed until a routine is selected.
    expect(screen.queryByText("Select a day to start")).toBeNull();

    await fireEvent.press(
      screen.getByLabelText("Routine options for Push Pull Legs"),
    );
    expect(screen.getByText("Select a day to start")).toBeOnTheScreen();
    expect(screen.getByText("Push")).toBeOnTheScreen();
    expect(screen.getByText("Pull")).toBeOnTheScreen();

    await fireEvent.press(screen.getAllByText("Start")[0]);

    await waitFor(() =>
      expect(createWorkout).toHaveBeenCalledWith({
        title: "Push",
        routineId: "routine_1",
        routineDayIndex: 0,
      }),
    );
    expect(mockPush).toHaveBeenCalledWith("/(app)/workout/active");
  });

  it("routes to the editor from the detail sheet", async () => {
    await renderRoutines();

    await fireEvent.press(
      screen.getByLabelText("Routine options for Push Pull Legs"),
    );
    await fireEvent.press(screen.getByText("Edit"));

    expect(mockPush).toHaveBeenCalledWith("/(app)/routines/routine_1/edit");
  });

  it("shows the empty state with create and import CTAs", async () => {
    mockQueries({ "routines:getRoutines": [] });
    await renderRoutines();

    expect(screen.getByText("No routines yet")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Create Routine"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/routines/new");
  });

  it("shows skeletons while routines load", async () => {
    mockQueries({ "routines:getRoutines": undefined });
    await renderRoutines();

    expect(screen.queryByText("My Routines")).toBeNull();
  });
});
