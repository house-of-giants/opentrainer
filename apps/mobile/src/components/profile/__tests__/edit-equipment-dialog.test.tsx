import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { getFunctionName } from "convex/server";
import { useAction, useMutation } from "convex/react";

import { EditEquipmentDialog } from "@/components/profile/edit-equipment-dialog";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useMutation: jest.fn(),
  useAction: jest.fn(),
}));

const mockUseMutation = useMutation as jest.Mock;
const mockUseAction = useAction as jest.Mock;
const updateOnboarding = jest.fn().mockResolvedValue(undefined);
// The real action calls the AI equipment parser; tests stub the response.
const parseEquipment = jest.fn().mockResolvedValue({
  equipment: ["barbell", "pull_up_bar"],
  note: "Assumed a standard commercial gym.",
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMutation.mockImplementation((ref: unknown) => {
    expect(getFunctionName(ref as never)).toBe("users:updateOnboarding");
    return updateOnboarding;
  });
  mockUseAction.mockImplementation((ref: unknown) => {
    expect(getFunctionName(ref as never)).toBe("ai/equipmentParser:parseEquipment");
    return parseEquipment;
  });
});

async function renderDialog() {
  const onOpenChange = jest.fn();
  await render(
    <ThemeProvider>
      <EditEquipmentDialog
        open
        onOpenChange={onOpenChange}
        currentDescription="Home gym"
        currentEquipment={["dumbbells"]}
      />
    </ThemeProvider>,
  );
  return { onOpenChange };
}

describe("EditEquipmentDialog", () => {
  it("saves the description and manual selection", async () => {
    const { onOpenChange } = await renderDialog();

    await fireEvent.press(screen.getByText("Barbell"));
    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(updateOnboarding).toHaveBeenCalledWith({
        equipmentDescription: "Home gym",
        equipment: ["dumbbells", "barbell"],
      }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("replaces the selection with the parser result and shows its note", async () => {
    await renderDialog();

    await fireEvent.press(screen.getByText("Analyze Equipment"));

    await waitFor(() =>
      expect(parseEquipment).toHaveBeenCalledWith({ description: "Home gym" }),
    );
    expect(
      screen.getByText("💡 Assumed a standard commercial gym."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Save"));
    await waitFor(() =>
      expect(updateOnboarding).toHaveBeenCalledWith({
        equipmentDescription: "Home gym",
        equipment: ["barbell", "pull_up_bar"],
      }),
    );
  });

  it("blocks analysis without a description", async () => {
    await render(
      <ThemeProvider>
        <EditEquipmentDialog
          open
          onOpenChange={jest.fn()}
          currentDescription={undefined}
          currentEquipment={[]}
        />
      </ThemeProvider>,
    );

    await fireEvent.press(screen.getByText("Analyze Equipment"));
    expect(parseEquipment).not.toHaveBeenCalled();
  });
});
