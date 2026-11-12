import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { getLocales } from "expo-localization";

import OnboardingScreen from "@/app/(app)/onboarding";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(() => jest.fn()),
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

async function finishOnboarding() {
  for (const label of ["Continue", "Continue", "Analyze Equipment", "Continue"]) {
    await fireEvent.press(screen.getByText(label));
  }
  await fireEvent.press(screen.getByText("Get Started"));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/(app)/(tabs)"));
}

describe("OnboardingScreen units", () => {
  it("preselects lb on the first step for a US device and saves lb", async () => {
    mockRegion("US");
    await renderScreen();

    expect(screen.getByText("What are you training for?")).toBeOnTheScreen();
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
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("radio", { name: "Kilograms (kg)" })).toBeChecked();
  });
});
