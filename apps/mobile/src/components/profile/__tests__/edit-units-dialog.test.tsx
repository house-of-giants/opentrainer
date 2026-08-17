import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useMutation } from "convex/react";

import { EditUnitsDialog } from "@/components/profile/edit-units-dialog";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useMutation: jest.fn(),
}));

const mockUseMutation = useMutation as jest.Mock;
const updatePreferences = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMutation.mockImplementation((ref: unknown) => {
    expect(getFunctionName(ref as never)).toBe("users:updatePreferences");
    return updatePreferences;
  });
});

async function renderDialog() {
  const onOpenChange = jest.fn();
  await render(
    <ThemeProvider>
      <EditUnitsDialog open onOpenChange={onOpenChange} currentUnit="lb" />
    </ThemeProvider>,
  );
  return { onOpenChange };
}

describe("EditUnitsDialog", () => {
  it("saves the selected unit with the web mutation args", async () => {
    const { onOpenChange } = await renderDialog();

    await fireEvent.press(screen.getByText("Metric (kg)"));
    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({ preferredUnits: "kg" }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("keeps the current unit when nothing is changed", async () => {
    await renderDialog();

    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({ preferredUnits: "lb" }),
    );
  });
});
