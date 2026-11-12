import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { getLocales } from "expo-localization";

import OnboardingScreen from "@/app/(app)/onboarding";
import { toast } from "@/components/ui/toast";
import { analytics } from "@/lib/analytics";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(() => jest.fn()),
}));

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), identify: jest.fn(), captureException: jest.fn() },
}));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock(
  "react-native-safe-area-context",
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  () => require("react-native-safe-area-context/jest/mock").default,
);

// A new account mid-onboarding: the backend still gives it "lb", and the saved
// answers let the test walk every step without the equipment parser.
const newUser = {
  _id: "user1",
  clerkId: "clerk_1",
  preferredUnits: "lb",
  goals: ["strength"],
  experienceLevel: "intermediate",
  equipmentDescription: "Home gym with a barbell",
  equipment: ["barbell"],
  weeklyAvailability: 3,
  sessionDuration: 45,
};

const calls: string[] = [];
const updatePreferences = jest.fn(async () => {
  calls.push("updatePreferences");
});
const completeOnboarding = jest.fn(async () => {
  calls.push("completeOnboarding");
});

function mockRegion(regionCode: string | null) {
  (getLocales as jest.Mock).mockReturnValue([{ languageTag: "en", regionCode }]);
}

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  (useQuery as jest.Mock).mockImplementation((ref) => {
    const name = getFunctionName(ref);
    if (name !== "users:getCurrentUser") throw new Error(`Unmocked query: ${name}`);
    return newUser;
  });
  (useMutation as jest.Mock).mockImplementation((ref) => {
    const name = getFunctionName(ref);
    if (name === "users:updatePreferences") return updatePreferences;
    if (name === "users:completeOnboarding") return completeOnboarding;
    throw new Error(`Unmocked mutation: ${name}`);
  });
});

async function renderScreen() {
  await render(
    <ThemeProvider>
      <OnboardingScreen />
    </ThemeProvider>,
  );
}

// The generate path: path choice, goals, experience, equipment, confirm, days.
async function finishOnboarding() {
  await fireEvent.press(screen.getByRole("radio", { name: /Generate one/ }));
  for (const label of ["Continue", "Continue", "Continue", "Analyze Equipment", "Continue"]) {
    await fireEvent.press(screen.getByText(label));
  }
  await fireEvent.press(screen.getByText("Get Started"));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)"));
}

describe("OnboardingScreen units", () => {
  it("preselects lb on the first step for a US device and saves lb", async () => {
    mockRegion("US");
    await renderScreen();

    expect(screen.getByText("How do you want to start?")).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Pounds (lb)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Kilograms (kg)" })).not.toBeChecked();

    await finishOnboarding();

    expect(updatePreferences).toHaveBeenCalledTimes(1);
    expect(updatePreferences).toHaveBeenCalledWith({ preferredUnits: "lb" });
  });

  it("preselects kg for a metric region even though the backend default is lb", async () => {
    mockRegion("DE");
    await renderScreen();

    expect(screen.getByRole("radio", { name: "Kilograms (kg)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pounds (lb)" })).not.toBeChecked();
    // Opening onboarding alone writes nothing.
    expect(updatePreferences).not.toHaveBeenCalled();

    await finishOnboarding();

    expect(updatePreferences).toHaveBeenCalledWith({ preferredUnits: "kg" });
    expect(calls).toEqual(["updatePreferences", "completeOnboarding"]);
  });

  it("falls back to kg when the device has no region", async () => {
    mockRegion(null);
    await renderScreen();

    expect(screen.getByRole("radio", { name: "Kilograms (kg)" })).toBeChecked();
  });

  it("saves the unit the user picks with one tap", async () => {
    mockRegion("US");
    await renderScreen();

    await fireEvent.press(screen.getByRole("radio", { name: "Kilograms (kg)" }));

    expect(screen.getByRole("radio", { name: "Kilograms (kg)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pounds (lb)" })).not.toBeChecked();
    expect(updatePreferences).not.toHaveBeenCalled();

    await finishOnboarding();

    expect(updatePreferences).toHaveBeenCalledTimes(1);
    expect(updatePreferences).toHaveBeenCalledWith({ preferredUnits: "kg" });
    expect(completeOnboarding).toHaveBeenCalledTimes(1);
  });

  it("keeps the choice after going forward and back", async () => {
    mockRegion("US");
    await renderScreen();

    await fireEvent.press(screen.getByRole("radio", { name: "Kilograms (kg)" }));
    await fireEvent.press(screen.getByRole("radio", { name: /Generate one/ }));
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("radio", { name: "Kilograms (kg)" })).toBeChecked();
  });
});

// Questions that only the "Generate one" path may ask.
const GENERATE_ONLY_HEADINGS = [
  "What are you training for?",
  "How long have you been lifting?",
  "Where do you work out?",
  "We detected this equipment",
  "How often can you train?",
];

describe("OnboardingScreen paths", () => {
  beforeEach(() => mockRegion("US"));

  it("keeps Continue disabled until a path is chosen", async () => {
    await renderScreen();

    expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
    await fireEvent.press(screen.getByText("Continue"));
    expect(completeOnboarding).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("radio", { name: /Bring my program/ }));
    expect(screen.getByRole("radio", { name: /Bring my program/ })).toBeChecked();
    expect(screen.getByRole("button", { name: /Continue/ })).not.toBeDisabled();
  });

  it.each([
    ["Bring my program", "bring_program"],
    ["Start from scratch", "from_scratch"],
  ])(
    "%s finishes onboarding with no profile questions and opens the routine builder",
    async (label, path) => {
      let completed = false;
      completeOnboarding.mockImplementation(async () => {
        calls.push("completeOnboarding");
        completed = true;
      });
      (useQuery as jest.Mock).mockImplementation(() =>
        completed ? { ...newUser, onboardingCompletedAt: 1 } : newUser,
      );
      await renderScreen();

      await fireEvent.press(screen.getByRole("radio", { name: /Kilograms/ }));
      await fireEvent.press(screen.getByRole("radio", { name: new RegExp(label) }));
      await fireEvent.press(screen.getByText("Continue"));

      await waitFor(() =>
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: "/(app)/routines/new",
          params: { onboarding: path },
        }),
      );
      expect(calls).toEqual(["updatePreferences", "completeOnboarding"]);
      expect(updatePreferences).toHaveBeenCalledWith({ preferredUnits: "kg" });
      // No goals, experience, equipment, or schedule are sent or invented.
      expect(completeOnboarding).toHaveBeenCalledWith({});
      expect(analytics.capture).toHaveBeenCalledTimes(1);
      expect(analytics.capture).toHaveBeenCalledWith("onboarding_completed", {
        path,
        preferred_units: "kg",
      });
      for (const heading of GENERATE_ONLY_HEADINGS) {
        expect(screen.queryByText(heading)).not.toBeOnTheScreen();
      }

      // The finished user doc arrives; the screen must not bounce to home
      // over the builder it just opened.
      await screen.rerender(
        <ThemeProvider>
          <OnboardingScreen />
        </ThemeProvider>,
      );
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    },
  );

  it("Generate one still asks every question and sends every answer", async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole("radio", { name: /Generate one/ }));
    expect(screen.getByText("Step 1 of 6")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByText("What are you training for?")).toBeOnTheScreen();
    expect(screen.getByText("Step 2 of 6")).toBeOnTheScreen();

    for (const label of ["Continue", "Continue", "Analyze Equipment", "Continue"]) {
      await fireEvent.press(screen.getByText(label));
    }
    expect(screen.getByText("How often can you train?")).toBeOnTheScreen();
    expect(screen.getByText("Step 6 of 6")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Get Started"));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)"));
    expect(completeOnboarding).toHaveBeenCalledWith({
      goals: ["strength"],
      experienceLevel: "intermediate",
      equipmentDescription: "Home gym with a barbell",
      equipment: ["barbell"],
      weeklyAvailability: 3,
      sessionDuration: 45,
    });
    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith("onboarding_completed", {
      path: "generate",
      goals: ["strength"],
      experience_level: "intermediate",
      equipment_count: 1,
      weekly_availability: 3,
      session_duration: 45,
      preferred_units: "lb",
    });
  });

  it("keeps the path step when saving fails", async () => {
    completeOnboarding.mockRejectedValueOnce(new Error("offline"));
    await renderScreen();

    await fireEvent.press(screen.getByRole("radio", { name: /Bring my program/ }));
    await fireEvent.press(screen.getByText("Continue"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to save. Please try again."),
    );
    expect(screen.getByRole("button", { name: /Continue/ })).not.toBeDisabled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(analytics.capture).not.toHaveBeenCalled();
    expect(screen.getByText("How do you want to start?")).toBeOnTheScreen();
  });
});
