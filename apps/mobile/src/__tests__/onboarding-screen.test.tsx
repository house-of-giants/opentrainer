import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";

import OnboardingScreen from "@/app/(app)/onboarding";
import { toast } from "@/components/ui/toast";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseAction = useAction as jest.Mock;

const completeOnboarding = jest.fn();
const parseEquipment = jest.fn();

// The screen owns exactly one mutation and one action; the refs themselves are
// asserted below (api proxies are not referentially stable across renders).
function mockUser(user: unknown) {
  mockUseQuery.mockReturnValue(user);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser({ _id: "user_1", clerkId: "clerk_1", onboardingCompletedAt: undefined });
  completeOnboarding.mockResolvedValue("user_1");
  parseEquipment.mockResolvedValue({
    equipment: ["barbell", "dumbbells"],
    note: "Full gym assumed",
  });
  mockUseMutation.mockImplementation(() => completeOnboarding);
  mockUseAction.mockImplementation(() => parseEquipment);
});

async function renderOnboarding() {
  await render(
    <ThemeProvider>
      <OnboardingScreen />
    </ThemeProvider>,
  );
}

describe("Onboarding wizard", () => {
  it("renders the goals step first and gates the CTA on a selection", async () => {
    await renderOnboarding();

    expect(screen.getByText("What are you training for?")).toBeOnTheScreen();
    expect(screen.getByText("Step 1 of 5")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();

    // Pressing a disabled CTA must not advance the machine.
    await fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByText("What are you training for?")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Strength"));
    expect(screen.getByRole("button", { name: /Strength/ })).toBeSelected();
    expect(screen.getByRole("button", { name: /Continue/ })).not.toBeDisabled();

    await fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByText("How long have you been lifting?")).toBeOnTheScreen();
    expect(screen.getByText("Step 2 of 5")).toBeOnTheScreen();
  });

  it("walks every step, parses equipment, and completes onboarding", async () => {
    await renderOnboarding();

    await fireEvent.press(screen.getByText("Strength"));
    await fireEvent.press(screen.getByText("Hypertrophy"));
    await fireEvent.press(screen.getByText("Continue"));

    // Experience: single-select, gated until chosen.
    expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();
    await fireEvent.press(screen.getByText("Intermediate"));
    await fireEvent.press(screen.getByText("Continue"));

    // Equipment: free-text description gates the CTA.
    expect(screen.getByText("Where do you work out?")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /Analyze Equipment/ })).toBeDisabled();
    await fireEvent.changeText(
      screen.getByLabelText("Gym description"),
      "LA Fitness",
    );
    await fireEvent.press(screen.getByText("Analyze Equipment"));

    expect(mockUseAction).toHaveBeenCalledWith(api.ai.equipmentParser.parseEquipment);
    expect(parseEquipment).toHaveBeenCalledWith({ description: "LA Fitness" });

    await waitFor(() =>
      expect(screen.getByText("We detected this equipment")).toBeOnTheScreen(),
    );
    expect(screen.getByText("Step 4 of 5")).toBeOnTheScreen();
    expect(screen.getByText("Full gym assumed")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Barbell" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Dumbbells" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Rower" })).not.toBeSelected();

    await fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByText("How often can you train?")).toBeOnTheScreen();
    expect(screen.getByText("Step 5 of 5")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Get Started"));

    expect(mockUseMutation).toHaveBeenCalledWith(api.users.completeOnboarding);
    expect(completeOnboarding).toHaveBeenCalledWith({
      goals: ["strength", "hypertrophy"],
      experienceLevel: "intermediate",
      equipmentDescription: "LA Fitness",
      equipment: ["barbell", "dumbbells"],
      weeklyAvailability: 4,
      sessionDuration: 60,
    });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)"),
    );
  });

  it("falls back to manual selection when the parser fails", async () => {
    parseEquipment.mockRejectedValueOnce(new Error("gemini down"));
    await renderOnboarding();

    await fireEvent.press(screen.getByText("Strength"));
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.press(screen.getByText("Beginner"));
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.changeText(
      screen.getByLabelText("Gym description"),
      "some gym",
    );
    await fireEvent.press(screen.getByText("Analyze Equipment"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to analyze equipment. Please select manually.",
      ),
    );
    expect(screen.getByText("We detected this equipment")).toBeOnTheScreen();
    // Nothing detected: the CTA stays gated until the user picks equipment.
    expect(screen.getByRole("button", { name: /Continue/ })).toBeDisabled();

    await fireEvent.press(screen.getByText("Power Rack"));
    expect(screen.getByRole("button", { name: /Continue/ })).not.toBeDisabled();
  });

  it("prefills from the existing user doc and skips re-parsing known equipment", async () => {
    mockUser({
      _id: "user_1",
      onboardingCompletedAt: undefined,
      goals: ["endurance"],
      experienceLevel: "advanced",
      equipmentDescription: "Home gym",
      equipment: ["kettlebells"],
      weeklyAvailability: 6,
      sessionDuration: 45,
    });
    await renderOnboarding();

    expect(screen.getByRole("button", { name: /Endurance/ })).toBeSelected();
    await fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByRole("button", { name: /Advanced/ })).toBeSelected();
    await fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByLabelText("Gym description").props.value).toBe("Home gym");

    await fireEvent.press(screen.getByText("Analyze Equipment"));
    // Web returns early when equipment is already known.
    expect(parseEquipment).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Kettlebells" })).toBeSelected();

    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.press(screen.getByText("Get Started"));

    expect(completeOnboarding).toHaveBeenCalledWith({
      goals: ["endurance"],
      experienceLevel: "advanced",
      equipmentDescription: "Home gym",
      equipment: ["kettlebells"],
      weeklyAvailability: 6,
      sessionDuration: 45,
    });
  });

  it("steps back to the previous step", async () => {
    await renderOnboarding();

    await fireEvent.press(screen.getByText("Strength"));
    await fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByText("How long have you been lifting?")).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText("Back"));
    expect(screen.getByText("What are you training for?")).toBeOnTheScreen();
    expect(screen.getByText("Step 1 of 5")).toBeOnTheScreen();
  });

  it("shows a save error without leaving the last step", async () => {
    completeOnboarding.mockRejectedValueOnce(new Error("offline"));
    await renderOnboarding();

    await fireEvent.press(screen.getByText("Strength"));
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.press(screen.getByText("Beginner"));
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.changeText(screen.getByLabelText("Gym description"), "gym");
    await fireEvent.press(screen.getByText("Analyze Equipment"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Barbell" })).toBeSelected(),
    );
    await fireEvent.press(screen.getByText("Continue"));
    await fireEvent.press(screen.getByText("Get Started"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to save. Please try again."),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText("How often can you train?")).toBeOnTheScreen();
  });

  it("redirects to the tabs once onboarding is complete", async () => {
    mockUser({ _id: "user_1", onboardingCompletedAt: 1_700_000_000_000 });
    await renderOnboarding();

    expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)");
  });

  it("renders a skeleton while the user query is pending", async () => {
    mockUser(undefined);
    await renderOnboarding();

    expect(screen.queryByText("What are you training for?")).not.toBeOnTheScreen();
  });
});
