import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";

import AIRoutineGeneratorScreen from "@/app/(app)/routines/new/ai";
import { toast } from "@/components/ui/toast";
import { generatedRoutine, swapAlternatives } from "@/__fixtures__/ai-routine";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseAction = useAction as jest.Mock;

// The real action spends OpenRouter credits and is rate limited to 10/day, so
// every test drives these mocks instead.
const generateRoutine = jest.fn().mockResolvedValue(generatedRoutine);
const getSwapAlternatives = jest
  .fn()
  .mockResolvedValue({ alternatives: swapAlternatives });
const createRoutine = jest.fn().mockResolvedValue("routine_1");

const proUser = {
  _id: "user_1",
  tier: "pro",
  weeklyAvailability: 4,
  equipment: ["barbell", "dumbbells"],
};

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "users:getCurrentUser": proUser,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
  generateRoutine.mockResolvedValue(generatedRoutine);
  getSwapAlternatives.mockResolvedValue({ alternatives: swapAlternatives });
  mockUseAction.mockImplementation((ref: unknown) =>
    getFunctionName(ref as never) === "ai/routineGenerator:generateRoutine"
      ? generateRoutine
      : getSwapAlternatives,
  );
  mockUseMutation.mockImplementation(() => createRoutine);
});

async function renderWizard() {
  await render(
    <ThemeProvider>
      <AIRoutineGeneratorScreen />
    </ThemeProvider>,
  );
}

// The press handler awaits the (mocked) action, so flush the microtask queue
// before asserting on the step that follows it.
async function flushAsyncHandler() {
  await act(async () => {});
}

async function generate() {
  await fireEvent.press(screen.getByText("Generate Routine"));
  await flushAsyncHandler();
}

describe("AI routine wizard", () => {
  it("renders the form step with the web defaults", async () => {
    await renderWizard();

    expect(screen.getByText("AI Routine Generator")).toBeOnTheScreen();
    expect(screen.getByText("Build Your Routine")).toBeOnTheScreen();
    expect(screen.getByText("Let AI Decide")).toBeOnTheScreen();
    expect(screen.getByText("Push/Pull/Legs")).toBeOnTheScreen();
    expect(screen.getByText("Hypertrophy")).toBeOnTheScreen();
    expect(screen.getByText("0/200")).toBeOnTheScreen();
    // Equipment summary from the profile.
    expect(screen.getByText("barbell")).toBeOnTheScreen();
    expect(screen.getByText("Generate Routine")).toBeOnTheScreen();
  });

  it("shows the loading skeletons until Convex resolves the user", async () => {
    mockQueries({ "users:getCurrentUser": undefined });
    await renderWizard();

    expect(screen.queryByText("Build Your Routine")).toBeNull();
    expect(screen.queryByText("Generate Routine")).toBeNull();
  });

  it("gates non-pro users behind the alpha upsell instead of the wizard", async () => {
    mockQueries({ "users:getCurrentUser": { ...proUser, tier: "free" } });
    await renderWizard();

    expect(screen.getByText("Free During Alpha")).toBeOnTheScreen();
    expect(screen.getByText("Get Started Free")).toBeOnTheScreen();
    expect(screen.queryByText("Generate Routine")).toBeNull();
    expect(generateRoutine).not.toHaveBeenCalled();
  });

  it("fires the generate action with the picked wizard state", async () => {
    await renderWizard();

    await fireEvent.press(screen.getByText("Push/Pull/Legs"));
    await fireEvent.press(screen.getByText("Strength"));
    await fireEvent.press(screen.getByText("6"));
    await fireEvent.changeText(
      screen.getByPlaceholderText(
        "e.g., bad shoulder, want extra back work, prefer dumbbells...",
      ),
      "  bad shoulder  ",
    );

    await generate();

    expect(generateRoutine).toHaveBeenCalledTimes(1);
    expect(generateRoutine).toHaveBeenCalledWith({
      splitType: "ppl",
      primaryGoal: "strength",
      daysPerWeek: 6,
      additionalNotes: "bad shoulder",
    });
  });

  it("omits empty notes and moves through generating into the preview step", async () => {
    await renderWizard();
    await generate();

    expect(generateRoutine).toHaveBeenCalledWith({
      splitType: "ai_decide",
      primaryGoal: "both",
      daysPerWeek: 4,
      additionalNotes: undefined,
    });
    expect(screen.getByText("Review Routine")).toBeOnTheScreen();
  });

  it("renders the generated days and exercises, then saves them as ai_generated", async () => {
    await renderWizard();
    await generate();

    expect(screen.getByText("Upper A")).toBeOnTheScreen();
    expect(screen.getByText("Chest, back, shoulders")).toBeOnTheScreen();
    expect(screen.getByText("3 exercises")).toBeOnTheScreen();
    expect(screen.getByText("Bench Press")).toBeOnTheScreen();
    expect(screen.getByText("4 × 6-8")).toBeOnTheScreen();
    // Duration exercises show the hold seconds instead of reps.
    expect(screen.getByText("3 × 45s")).toBeOnTheScreen();
    expect(
      screen.getByText("Four sessions fit your availability and hit each muscle twice a week."),
    ).toBeOnTheScreen();
    // The second day is collapsed until it is tapped.
    expect(screen.getByText("Lower A")).toBeOnTheScreen();
    expect(screen.queryByText("Back Squat")).toBeNull();

    await fireEvent.press(screen.getByText("Lower A"));
    expect(screen.getByText("Back Squat")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Save Routine"));
    await flushAsyncHandler();

    expect(createRoutine).toHaveBeenCalledWith({
      name: "Upper/Lower Power",
      description: "A four-day upper/lower split built around your equipment.",
      source: "ai_generated",
      days: [
        {
          name: "Upper A",
          exercises: [
            {
              exerciseName: "Bench Press",
              kind: "lifting",
              targetSets: 4,
              targetReps: "6-8",
              measurementType: "reps",
              targetHoldSeconds: undefined,
            },
            {
              exerciseName: "Barbell Row",
              kind: "lifting",
              targetSets: 4,
              targetReps: "8-10",
              measurementType: undefined,
              targetHoldSeconds: undefined,
            },
            {
              exerciseName: "Plank",
              kind: "mobility",
              targetSets: 3,
              targetReps: undefined,
              measurementType: "duration",
              targetHoldSeconds: 45,
            },
          ],
        },
        {
          name: "Lower A",
          exercises: [
            {
              exerciseName: "Back Squat",
              kind: "lifting",
              targetSets: 5,
              targetReps: "5",
              measurementType: undefined,
              targetHoldSeconds: undefined,
            },
          ],
        },
      ],
    });
    expect(toast.success).toHaveBeenCalledWith("Routine saved!");
    expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)/routines");
  });

  it("swaps an exercise through the alternatives sheet", async () => {
    await renderWizard();
    await generate();

    await fireEvent.press(screen.getByText("Bench Press"));

    await fireEvent.press(screen.getByText("Causes discomfort"));
    await flushAsyncHandler();

    expect(getSwapAlternatives).toHaveBeenCalledWith({
      exerciseName: "Bench Press",
      reason: "discomfort",
      dayContext: ["Bench Press", "Barbell Row", "Plank"],
      userNotes: undefined,
    });
    expect(screen.getByText("Incline Dumbbell Press")).toBeOnTheScreen();
    expect(screen.getByText("Recommended")).toBeOnTheScreen();

    // One "Use" button per alternative; the first is the recommended one.
    await fireEvent.press(screen.getAllByText("Use")[0]);

    expect(toast.success).toHaveBeenCalledWith("Swapped to Incline Dumbbell Press");
    // The day row now shows the replacement (the bottom-sheet mock keeps the
    // dismissed sheet's alternatives mounted, hence getAllByText).
    expect(screen.getAllByText("Incline Dumbbell Press").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bench Press")).toBeNull();
  });

  it("surfaces the rate-limit error and returns to the form", async () => {
    const message =
      "Rate limit exceeded. You've used all 10 routine generation requests for today. Try again tomorrow.";
    generateRoutine.mockRejectedValueOnce(new Error(message));

    await renderWizard();
    await generate();

    expect(toast.error).toHaveBeenCalledWith(message);
    expect(screen.getByText("Generate Routine")).toBeOnTheScreen();
    expect(screen.queryByText("Review Routine")).toBeNull();
    expect(createRoutine).not.toHaveBeenCalled();
  });
});
