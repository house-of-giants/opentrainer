import { Share } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";

import { toast } from "@/components/ui/toast";
import { ExportWorkoutDialog } from "@/components/workout/export-workout-dialog";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({ useQuery: jest.fn() }));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

const workoutId = "workout_1" as Id<"workouts">;

// Byte-for-byte mirror of the payload api.workouts.exportWorkoutAsJson builds
// (packages/backend/convex/workouts.ts) and the web dialog copies verbatim.
const exportPayload = {
  version: 1,
  exportType: "workout",
  name: "Push Day - Jan 15, 2026",
  workout: {
    title: "Push Day",
    date: "2026-01-15T17:30:00.000Z",
    completedAt: "2026-01-15T18:35:00.000Z",
    durationMinutes: 65,
    totalVolume: 12450,
    totalSets: 3,
    notes: "Felt strong",
    exercises: [
      {
        name: "Bench Press",
        kind: "lifting",
        sets: [
          { setNumber: 1, unit: "lb", weight: 135, reps: 10, isWarmup: true },
          { setNumber: 2, unit: "lb", weight: 185, reps: 8, rpe: 8 },
          { setNumber: 3, unit: "lb", durationSeconds: 90 },
        ],
      },
      {
        name: "Treadmill",
        kind: "cardio",
        cardio: { mode: "steady", durationSeconds: 1530, intensity: 6 },
      },
    ],
  },
};

const expectedJson = JSON.stringify(exportPayload, null, 2);

const mockUseQuery = useQuery as jest.Mock;

async function renderDialog(open = true) {
  const onOpenChange = jest.fn();
  await render(
    <ThemeProvider>
      <ExportWorkoutDialog
        open={open}
        onOpenChange={onOpenChange}
        workoutId={workoutId}
      />
    </ThemeProvider>,
  );
  return { onOpenChange };
}

describe("ExportWorkoutDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      json: expectedJson,
      workoutTitle: "Push Day",
    });
  });

  it("skips the export query while closed", async () => {
    mockUseQuery.mockReturnValue(undefined);
    await renderDialog(false);
    expect(mockUseQuery).toHaveBeenCalledWith(
      api.workouts.exportWorkoutAsJson,
      "skip",
    );
  });

  it("queries by workout id and shows a loading placeholder until data arrives", async () => {
    mockUseQuery.mockReturnValue(undefined);
    await renderDialog();
    expect(mockUseQuery).toHaveBeenCalledWith(api.workouts.exportWorkoutAsJson, {
      workoutId,
    });
    expect(screen.getByText("Loading...")).toBeOnTheScreen();
  });

  it("renders the exported JSON and copies it verbatim via expo-clipboard", async () => {
    await renderDialog();

    expect(screen.getByLabelText("Workout JSON").props.children).toBe(
      expectedJson,
    );

    await fireEvent.press(screen.getByText("Copy"));

    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(expectedJson),
    );
    // Exact web format: 2-space indented JSON, version + exportType envelope.
    const copied = (Clipboard.setStringAsync as jest.Mock).mock.calls[0][0];
    expect(JSON.parse(copied)).toEqual(exportPayload);
    expect(copied).toBe(JSON.stringify(exportPayload, null, 2));
    expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
  });

  it("reports a clipboard failure the way the web dialog does", async () => {
    (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(
      new Error("nope"),
    );
    await renderDialog();

    await fireEvent.press(screen.getByText("Copy"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to copy"));
  });

  it("shares the JSON with the web download filename", async () => {
    const shareSpy = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction" } as never);
    await renderDialog();

    await fireEvent.press(screen.getByText("Share"));

    await waitFor(() =>
      expect(shareSpy).toHaveBeenCalledWith({
        message: expectedJson,
        title: "push-day.json",
      }),
    );
    shareSpy.mockRestore();
  });
});
