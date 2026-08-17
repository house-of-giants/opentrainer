import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useMutation } from "convex/react";

import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({
  useMutation: jest.fn(),
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
}));

const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockClerkUserDelete = jest.fn().mockResolvedValue(undefined);
jest.mock("@clerk/clerk-expo", () => ({
  useClerk: () => ({ signOut: mockSignOut }),
  useUser: () => ({
    isLoaded: true,
    user: { id: "user_clerk", delete: mockClerkUserDelete },
  }),
}));

const mockUseMutation = useMutation as jest.Mock;
const deleteAccount = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMutation.mockImplementation(() => deleteAccount);
});

async function renderDialog() {
  const onOpenChange = jest.fn();
  await render(
    <ThemeProvider>
      <DeleteAccountDialog open onOpenChange={onOpenChange} />
    </ThemeProvider>,
  );
  return { onOpenChange };
}

// "Delete Account" is both the dialog title and the confirm button label.
function confirmButton() {
  const matches = screen.getAllByText("Delete Account");
  return matches[matches.length - 1];
}

describe("DeleteAccountDialog", () => {
  it("ignores the confirm button until DELETE is typed", async () => {
    await renderDialog();

    await fireEvent.press(confirmButton());
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes the account, then the Clerk user, then signs out", async () => {
    const { onOpenChange } = await renderDialog();

    await fireEvent.changeText(
      screen.getByLabelText("Delete confirmation"),
      "DELETE",
    );
    await fireEvent.press(confirmButton());

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledWith({}));
    await waitFor(() => expect(mockClerkUserDelete).toHaveBeenCalled());
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(auth)/sign-in"));
  });
});
