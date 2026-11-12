import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useMutation } from "convex/react";
import type { Id } from "@opentrainer/backend";

import { toast } from "@/components/ui/toast";
import { ImportDayDialog } from "@/components/workout/import-day-dialog";
import { analytics } from "@/lib/analytics";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({ useMutation: jest.fn() }));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

jest.mock("@/lib/analytics", () => ({
  analytics: { capture: jest.fn(), identify: jest.fn(), captureException: jest.fn() },
}));

const mockCapture = analytics.capture as jest.Mock;
const importDay = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useMutation as jest.Mock).mockImplementation(() => importDay);
});

async function importJson(json: string) {
  const onSuccess = jest.fn();
  await render(
    <ThemeProvider>
      <ImportDayDialog
        routineId={"routine_1" as Id<"routines">}
        open
        onOpenChange={jest.fn()}
        onSuccess={onSuccess}
      />
    </ThemeProvider>,
  );
  await fireEvent.changeText(screen.getByLabelText("Day JSON"), json);
  await fireEvent.press(screen.getByRole("button", { name: "Import Day" }));
  return { onSuccess };
}

describe("ImportDayDialog analytics", () => {
  it("sends routine_imported once with the day scope after a successful import", async () => {
    importDay.mockResolvedValue({ dayIndex: 2 });

    const { onSuccess } = await importJson('{"name":"Push","exercises":[]}');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(2));
    expect(mockCapture.mock.calls).toEqual([["routine_imported", { scope: "day" }]]);
  });

  it("sends nothing when the import fails", async () => {
    importDay.mockRejectedValue(new Error("Invalid JSON format."));

    await importJson("not json");

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid JSON format."));
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
