import { fireEvent, render, screen } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useQuery } from "convex/react";

import ProfileScreen from "@/app/(app)/(tabs)/profile";
import { profileUser, profileWorkouts } from "@/__fixtures__/profile-fixtures";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
  useAction: jest.fn(() => jest.fn()),
  useConvex: jest.fn(() => ({ query: jest.fn() })),
}));

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
});
