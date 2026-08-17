import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useMutation } from "convex/react";
import { api } from "@opentrainer/backend";

import { FeedbackButton } from "@/components/feedback/feedback-button";
import { toast } from "@/components/ui/toast";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("convex/react", () => ({ useMutation: jest.fn() }));

jest.mock("expo-router", () => ({ usePathname: () => "/(app)/(tabs)/history" }));

jest.mock("@/components/ui/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), message: jest.fn() },
}));

const mockUseMutation = useMutation as jest.Mock;
const submitFeedback = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  submitFeedback.mockResolvedValue("feedback_1");
  mockUseMutation.mockReturnValue(submitFeedback);
});

async function renderButton() {
  await render(
    <ThemeProvider>
      <FeedbackButton />
    </ThemeProvider>,
  );
}

describe("FeedbackButton", () => {
  it("opens the feedback dialog from the floating trigger", async () => {
    await renderButton();

    expect(mockUseMutation).toHaveBeenCalledWith(api.feedback.submitFeedback);
    expect(screen.queryByText("Send Feedback")).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText("Send feedback"));

    expect(screen.getByText("Send Feedback")).toBeOnTheScreen();
    expect(
      screen.getByText("Help us improve OpenTrainer during early access."),
    ).toBeOnTheScreen();
    for (const label of ["Bug Report", "Feature Request", "AI Quality", "General"]) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
  });

  it("submits the selected type, trimmed message and current path", async () => {
    await renderButton();
    await fireEvent.press(screen.getByLabelText("Send feedback"));

    await fireEvent.press(screen.getByText("Bug Report"));
    expect(screen.getByRole("button", { name: /Bug Report/ })).toBeSelected();
    await fireEvent.changeText(
      screen.getByLabelText("Your feedback"),
      "  rest timer drifts  ",
    );
    await fireEvent.press(screen.getByText("Send"));

    await waitFor(() =>
      expect(submitFeedback).toHaveBeenCalledWith({
        type: "bug",
        message: "rest timer drifts",
        context: { page: "/(app)/(tabs)/history" },
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Thanks for your feedback!");
    // Success closes the dialog and clears the draft.
    await waitFor(() =>
      expect(screen.queryByText("Send Feedback")).not.toBeOnTheScreen(),
    );
  });

  it("requires a feedback type", async () => {
    await renderButton();
    await fireEvent.press(screen.getByLabelText("Send feedback"));

    await fireEvent.press(screen.getByText("Send"));

    expect(toast.error).toHaveBeenCalledWith("Please select a feedback type");
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it("requires a non-empty message", async () => {
    await renderButton();
    await fireEvent.press(screen.getByLabelText("Send feedback"));

    await fireEvent.press(screen.getByText("General"));
    await fireEvent.changeText(screen.getByLabelText("Your feedback"), "   ");
    await fireEvent.press(screen.getByText("Send"));

    expect(toast.error).toHaveBeenCalledWith("Please enter your feedback");
    expect(submitFeedback).not.toHaveBeenCalled();
  });

  it("keeps the draft and toasts when the mutation fails", async () => {
    submitFeedback.mockRejectedValueOnce(new Error("offline"));
    await renderButton();
    await fireEvent.press(screen.getByLabelText("Send feedback"));

    await fireEvent.press(screen.getByText("AI Quality"));
    await fireEvent.changeText(
      screen.getByLabelText("Your feedback"),
      "swaps are wrong",
    );
    await fireEvent.press(screen.getByText("Send"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to submit feedback"),
    );
    expect(screen.getByText("Send Feedback")).toBeOnTheScreen();
    expect(screen.getByLabelText("Your feedback").props.value).toBe(
      "swaps are wrong",
    );
  });
});
