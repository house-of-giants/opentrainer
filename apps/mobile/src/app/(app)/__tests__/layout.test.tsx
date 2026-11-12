import { render, screen } from "@testing-library/react-native";

import AppLayout from "@/app/(app)/_layout";
import { ThemeProvider } from "@/theme/theme-provider";

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

jest.mock("expo-router", () => ({
  Stack: () => null,
  Redirect: () => null,
  usePathname: () => "/",
}));

jest.mock("convex/react", () => ({ useMutation: () => jest.fn() }));

const ORIGINAL_FLAG = process.env.EXPO_PUBLIC_SCREENSHOT_MODE;

function setFlag(value: string | undefined) {
  if (value === undefined) delete process.env.EXPO_PUBLIC_SCREENSHOT_MODE;
  else process.env.EXPO_PUBLIC_SCREENSHOT_MODE = value;
}

afterEach(() => setFlag(ORIGINAL_FLAG));

async function renderLayout() {
  await render(
    <ThemeProvider>
      <AppLayout />
    </ThemeProvider>,
  );
}

describe("(app) layout feedback button", () => {
  it("shows the feedback button by default", async () => {
    setFlag(undefined);
    await renderLayout();
    expect(screen.getByLabelText("Send feedback")).toBeOnTheScreen();
  });

  it("hides the feedback button when EXPO_PUBLIC_SCREENSHOT_MODE=1", async () => {
    setFlag("1");
    await renderLayout();
    expect(screen.queryByLabelText("Send feedback")).not.toBeOnTheScreen();
  });

  it("keeps the feedback button for any other flag value", async () => {
    setFlag("0");
    await renderLayout();
    expect(screen.getByLabelText("Send feedback")).toBeOnTheScreen();
  });
});
