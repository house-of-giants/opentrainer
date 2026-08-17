import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useAction, useQuery } from "convex/react";
import Toast from "react-native-toast-message";

import TrainingLabScreen from "@/app/(app)/training-lab";
import { ThemeProvider } from "@/theme/theme-provider";

import {
  ctaStateFixture,
  dashboardStatsFixture,
  fullReportFixture,
} from "../__fixtures__/training-lab";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useAction: jest.fn(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
}));

// Chart internals render on the Skia canvas and the body highlighter needs
// native SVG; stub them out and assert on the surrounding screen content.
jest.mock("victory-native", () => ({
  CartesianChart: () => null,
  HorizontalBar: () => null,
  Area: () => null,
  Line: () => null,
}));

jest.mock("@shopify/react-native-skia", () => ({
  matchFont: () => {
    throw new Error("no font manager in jest");
  },
  LinearGradient: () => null,
  DashPathEffect: () => null,
  Line: () => null,
  vec: (x: number, y: number) => ({ x, y }),
}));

jest.mock("react-native-body-highlighter", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
  BaseToast: () => null,
}));

const mockUseQuery = useQuery as jest.Mock;
const mockUseAction = useAction as jest.Mock;
const mockToastShow = Toast.show as jest.Mock;
const mockGenerateReport = jest.fn();

const RATE_LIMIT_MESSAGE =
  "Rate limit exceeded. You've used all 10 Training Lab reports for today. Try again tomorrow.";

function mockQueries(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    "ai/trainingLabMutations:getCtaState": ctaStateFixture,
    "ai/trainingLabMutations:getLatestReport": fullReportFixture,
    "ai/trainingLabMutations:getDashboardStats": dashboardStatsFixture,
    ...overrides,
  };
  mockUseQuery.mockImplementation((ref: unknown) => values[getFunctionName(ref as never)]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueries();
  mockGenerateReport.mockResolvedValue(undefined);
  mockUseAction.mockImplementation((ref: unknown) => {
    expect(getFunctionName(ref as never)).toBe("ai/trainingLab:generateReport");
    return mockGenerateReport;
  });
});

async function renderTrainingLab() {
  await render(
    <ThemeProvider>
      <TrainingLabScreen />
    </ThemeProvider>,
  );
}

describe("Training Lab screen", () => {
  it("shows the loading skeleton while the CTA state resolves", async () => {
    mockQueries({ "ai/trainingLabMutations:getCtaState": undefined });
    await renderTrainingLab();

    expect(screen.queryByText("Training Lab")).toBeNull();
    expect(screen.queryByText("AI Report")).toBeNull();
  });

  it("renders the report with insights, alerts, stats and analytics cards", async () => {
    await renderTrainingLab();

    // Header + stat cards.
    expect(screen.getByText("Training Lab")).toBeOnTheScreen();
    expect(screen.getByText("Workouts")).toBeOnTheScreen();
    expect(screen.getByText("42")).toBeOnTheScreen();
    expect(screen.getByText("Week Streak")).toBeOnTheScreen();
    // Cards below the stats grid.
    expect(screen.getByText("Recent PRs")).toBeOnTheScreen();
    expect(screen.getByText("Training Load")).toBeOnTheScreen();
    expect(screen.getByText("Cardio This Week")).toBeOnTheScreen();
    expect(screen.getByText("Muscle Workload")).toBeOnTheScreen();
    expect(screen.getByText("18 completed working sets")).toBeOnTheScreen();
    // AI report section.
    expect(screen.getByText("AI Report")).toBeOnTheScreen();
    expect(screen.getByText(fullReportFixture.summary)).toBeOnTheScreen();
    expect(screen.getByText("Report-period muscle volume")).toBeOnTheScreen();
    expect(screen.getByText("RPE Trend")).toBeOnTheScreen();
    expect(screen.getByText("Exercise Trends")).toBeOnTheScreen();
    // Bench Press shows in both Recent PRs and Exercise Trends.
    expect(screen.getAllByText("Bench Press")).toHaveLength(2);
    expect(screen.getByText("Insights")).toBeOnTheScreen();
    expect(
      screen.getByText("Chest volume increased 20% over the period."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Alerts")).toBeOnTheScreen();
    expect(
      screen.getByText("Pulling volume lags pushing volume this period."),
    ).toBeOnTheScreen();
  });

  it("shows the alpha upsell when the user is not pro", async () => {
    mockQueries({
      "ai/trainingLabMutations:getCtaState": { ...ctaStateFixture, isPro: false },
    });
    await renderTrainingLab();

    expect(screen.getByText("Free During Alpha")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Go to Dashboard"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)");
  });

  it("generates a full 7-day report and toasts success", async () => {
    mockQueries({ "ai/trainingLabMutations:getLatestReport": null });
    await renderTrainingLab();

    expect(screen.getByText("Analysis Ready")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Generate Analysis"));

    await waitFor(() => {
      expect(mockGenerateReport).toHaveBeenCalledWith({
        reportType: "full",
        periodDays: 7,
      });
      expect(mockToastShow).toHaveBeenCalledWith({
        type: "success",
        text1: "Analysis generated!",
        text2: undefined,
      });
    });
  });

  it("surfaces the rate limit error message from the action", async () => {
    mockGenerateReport.mockRejectedValue(new Error(RATE_LIMIT_MESSAGE));
    await renderTrainingLab();

    await fireEvent.press(screen.getByText("Refresh Analysis"));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith({
        type: "error",
        text1: RATE_LIMIT_MESSAGE,
        text2: undefined,
      });
    });
  });
});
