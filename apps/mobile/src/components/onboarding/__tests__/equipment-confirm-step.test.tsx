import { fireEvent, render, screen } from "@testing-library/react-native";
import { EQUIPMENT_CATEGORIES } from "@opentrainer/backend/convex/lib/equipment";

import { EquipmentConfirmStep } from "@/components/onboarding/equipment-confirm-step";
import { ThemeProvider } from "@/theme/theme-provider";

const CATEGORY_LABELS = [
  "Free Weights",
  "Racks And Benches",
  "Cable Machines",
  "Leg Machines",
  "Other Machines",
  "Bodyweight",
  "Accessories",
  "Cardio",
];

async function renderStep(
  props: Partial<React.ComponentProps<typeof EquipmentConfirmStep>> = {},
) {
  const onEquipmentChange = jest.fn();
  await render(
    <ThemeProvider>
      <EquipmentConfirmStep
        equipment={[]}
        onEquipmentChange={onEquipmentChange}
        note={null}
        isLoading={false}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onEquipmentChange };
}

describe("EquipmentConfirmStep", () => {
  it("renders every EQUIPMENT_CATEGORIES section and item", async () => {
    await renderStep();

    for (const label of CATEGORY_LABELS) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    // The backend list is the single source of truth for the tile count.
    const itemCount = Object.values(EQUIPMENT_CATEGORIES).flat().length;
    expect(screen.getAllByRole("button")).toHaveLength(itemCount);
    expect(screen.getByText("Barbell")).toBeOnTheScreen();
    expect(screen.getByText("Stairmaster")).toBeOnTheScreen();
  });

  it("adds an unselected item and removes a selected one", async () => {
    const { onEquipmentChange } = await renderStep({ equipment: ["barbell"] });

    expect(screen.getByRole("button", { name: "Barbell" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Rower" })).not.toBeSelected();

    await fireEvent.press(screen.getByText("Rower"));
    expect(onEquipmentChange).toHaveBeenCalledWith(["barbell", "rower"]);

    await fireEvent.press(screen.getByText("Barbell"));
    expect(onEquipmentChange).toHaveBeenCalledWith([]);
  });

  it("renders the parser note when one comes back", async () => {
    await renderStep({ note: "Planet Fitness has no barbells." });

    expect(
      screen.getByText("Planet Fitness has no barbells."),
    ).toBeOnTheScreen();
  });

  it("shows the analyzing state instead of the grid while loading", async () => {
    await renderStep({ isLoading: true });

    expect(screen.getByText("Analyzing your gym...")).toBeOnTheScreen();
    expect(screen.queryByText("Barbell")).not.toBeOnTheScreen();
  });
});
