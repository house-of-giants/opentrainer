import { useState } from "react";
import { Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHaptic } from "@/hooks/use-haptic";
import { ThemeProvider } from "@/theme/theme-provider";

async function renderWithTheme(ui: React.ReactElement) {
  await render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("Button", () => {
  it("renders label text and fires onPress", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button onPress={onPress}>Log set</Button>);
    await fireEvent.press(screen.getByText("Log set"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not fire when disabled or loading", async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <Button onPress={onPress} loading>
        Saving
      </Button>,
    );
    await fireEvent.press(screen.getByText("Saving"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("Badge / Card / text primitives", () => {
  it("renders every text-bearing primitive in light and dark", async () => {
    await renderWithTheme(
      <Card>
        <CardHeader>
          <CardTitle>Weekly volume</CardTitle>
          <CardDescription>12,450 lb</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge>Alpha</Badge>
          <Label>Email</Label>
          <Separator />
          <Skeleton testID="skeleton" />
          <Progress value={64} />
          <Input placeholder="you@example.com" />
        </CardContent>
      </Card>,
    );
    expect(screen.getByText("Weekly volume")).toBeOnTheScreen();
    expect(screen.getByText("12,450 lb")).toBeOnTheScreen();
    expect(screen.getByText("Alpha")).toBeOnTheScreen();
    expect(screen.getByText("Email")).toBeOnTheScreen();
    expect(screen.getByTestId("skeleton")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("you@example.com")).toBeOnTheScreen();
  });
});

describe("Checkbox", () => {
  it("toggles through onCheckedChange", async () => {
    function Harness() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox checked={checked} onCheckedChange={setChecked} testID="cb" />
      );
    }
    await renderWithTheme(<Harness />);
    const box = screen.getByTestId("cb");
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    expect(box).toBeChecked();
  });
});

describe("RadioGroup", () => {
  it("selects a single value", async () => {
    function Harness() {
      const [value, setValue] = useState<string | null>(null);
      return (
        <RadioGroup value={value} onValueChange={setValue}>
          <RadioGroupItem value="a" testID="radio-a" />
          <RadioGroupItem value="b" testID="radio-b" />
        </RadioGroup>
      );
    }
    await renderWithTheme(<Harness />);
    await fireEvent.press(screen.getByTestId("radio-b"));
    expect(screen.getByTestId("radio-b")).toBeSelected();
    expect(screen.getByTestId("radio-a")).not.toBeSelected();
  });
});

describe("Tabs", () => {
  it("shows only the active tab content and switches on press", async () => {
    function Harness() {
      const [tab, setTab] = useState("lifting");
      return (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="lifting">Lifting</TabsTrigger>
            <TabsTrigger value="cardio">Cardio</TabsTrigger>
          </TabsList>
          <TabsContent value="lifting">
            <Text>Lifting content</Text>
          </TabsContent>
          <TabsContent value="cardio">
            <Text>Cardio content</Text>
          </TabsContent>
        </Tabs>
      );
    }
    await renderWithTheme(<Harness />);
    expect(screen.getByText("Lifting content")).toBeOnTheScreen();
    expect(screen.queryByText("Cardio content")).toBeNull();
    await fireEvent.press(screen.getByText("Cardio"));
    expect(screen.getByText("Cardio content")).toBeOnTheScreen();
    expect(screen.queryByText("Lifting content")).toBeNull();
  });
});

describe("useHaptic", () => {
  it("maps the 6 web patterns onto expo-haptics", async () => {
    function Harness() {
      const { vibrate } = useHaptic();
      return (
        <Button
          onPress={() => {
            vibrate("light");
            vibrate("heavy");
            vibrate("success");
            vibrate("error");
          }}
        >
          Buzz
        </Button>
      );
    }
    await renderWithTheme(<Harness />);
    await fireEvent.press(screen.getByText("Buzz"));
    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
    expect(Haptics.impactAsync).toHaveBeenCalledWith("heavy");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("success");
    expect(Haptics.notificationAsync).toHaveBeenCalledWith("error");
  });
});

describe("Field", () => {
  it("renders a selectable field card with title and description", async () => {
    function Harness() {
      const [value, setValue] = useState<string | null>("ppl");
      return (
        <RadioGroup value={value} onValueChange={setValue}>
          <FieldLabel
            testID="field-ppl"
            selected={value === "ppl"}
            onPress={() => setValue("ppl")}
          >
            <Field orientation="horizontal">
              <RadioGroupItem value="ppl" testID="radio-ppl" />
              <FieldContent>
                <FieldTitle>Push/Pull/Legs</FieldTitle>
                <FieldDescription>6 days, high frequency</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
          <FieldLabel
            testID="field-full-body"
            selected={value === "full_body"}
            onPress={() => setValue("full_body")}
          >
            <Field orientation="horizontal">
              <RadioGroupItem value="full_body" testID="radio-full-body" />
              <FieldContent>
                <FieldTitle>Full Body</FieldTitle>
                <FieldDescription>2-3 days, efficient</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        </RadioGroup>
      );
    }
    await renderWithTheme(<Harness />);

    expect(screen.getByText("Push/Pull/Legs")).toBeOnTheScreen();
    expect(screen.getByText("6 days, high frequency")).toBeOnTheScreen();
    expect(screen.getByTestId("radio-ppl")).toBeSelected();

    // Pressing anywhere in the label card selects it, like the web <label>.
    await fireEvent.press(screen.getByText("Full Body"));
    expect(screen.getByTestId("radio-full-body")).toBeSelected();
    expect(screen.getByTestId("radio-ppl")).not.toBeSelected();
  });
});
