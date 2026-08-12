import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useMutation } from "convex/react";

import { ImportRoutineDialog } from "@/components/workout/import-routine-dialog";
import { validRoutineImportJson } from "@/components/workout/__fixtures__/routine-fixtures";
import { toast } from "@/components/ui/toast";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock("@/components/ui/toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    message: jest.fn(),
  },
}));

const mockUseMutation = useMutation as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;

const importRoutine = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  importRoutine.mockResolvedValue(null);
  mockUseMutation.mockImplementation(() => importRoutine);
});

async function renderDialog() {
  const onOpenChange = jest.fn();
  const onSuccess = jest.fn();
  await render(
    <ThemeProvider>
      <ImportRoutineDialog open onOpenChange={onOpenChange} onSuccess={onSuccess} />
    </ThemeProvider>,
  );
  return { onOpenChange, onSuccess };
}

describe("ImportRoutineDialog", () => {
  it("sends valid v1 JSON to importRoutineFromJson and closes", async () => {
    const { onOpenChange, onSuccess } = await renderDialog();

    await fireEvent.changeText(
      screen.getByLabelText("Routine JSON"),
      `${validRoutineImportJson}\n`,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Import Routine" }));

    await waitFor(() =>
      // Like web, the raw (trimmed) JSON string goes to the mutation, which
      // owns parsing/validation.
      expect(importRoutine).toHaveBeenCalledWith({ json: validRoutineImportJson }),
    );
    expect(mockToast.success).toHaveBeenCalledWith("Routine imported successfully!");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it("surfaces the mutation's validation error for invalid JSON and stays open", async () => {
    importRoutine.mockRejectedValueOnce(
      new Error("Invalid JSON format. Please check your input."),
    );
    const { onOpenChange, onSuccess } = await renderDialog();

    await fireEvent.changeText(screen.getByLabelText("Routine JSON"), "not json {");
    await fireEvent.press(screen.getByRole("button", { name: "Import Routine" }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        "Invalid JSON format. Please check your input.",
      ),
    );
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not call the mutation while the input is empty", async () => {
    await renderDialog();

    await fireEvent.press(screen.getByRole("button", { name: "Import Routine" }));

    expect(importRoutine).not.toHaveBeenCalled();
  });

  it("fills the textarea from the example link", async () => {
    await renderDialog();

    await fireEvent.press(screen.getByText("Paste example"));

    const input = screen.getByLabelText("Routine JSON");
    expect(input.props.value).toContain('"version": 1');
    expect(input.props.value).toContain("Push Pull Legs");
  });
});
