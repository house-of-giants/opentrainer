import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AsciiLogo } from "@/components/ui/ascii-logo";
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
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useHaptic } from "@/hooks/use-haptic";
import { useTheme } from "@/theme/theme-provider";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold uppercase text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}

// Dev-only design-system gallery: every primitive in light and dark.
// Not linked from product navigation; open via /gallery.
export default function GalleryScreen() {
  const { preference, setPreference, resolved } = useTheme();
  const { vibrate } = useHaptic();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState<string | null>("intermediate");
  const [sliderValue, setSliderValue] = useState(4);
  const [tab, setTab] = useState("lifting");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-8 pb-16">
        <View className="flex-row items-center justify-between pt-2">
          <AsciiLogo />
          <Button
            size="sm"
            variant="outline"
            onPress={() =>
              setPreference(resolved === "dark" ? "light" : "dark")
            }
          >
            {`Theme: ${preference} (${resolved})`}
          </Button>
        </View>

        <Section title="Buttons">
          <View className="flex-row flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </View>
        </Section>

        <Section title="Badges">
          <View className="flex-row flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </View>
        </Section>

        <Section title="Card">
          <Card>
            <CardHeader>
              <CardTitle>Weekly volume</CardTitle>
              <CardDescription>12,450 lb across 4 workouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={64} />
            </CardContent>
          </Card>
        </Section>

        <Section title="Form controls">
          <View className="gap-2">
            <Label>Email</Label>
            <Input placeholder="you@example.com" keyboardType="email-address" />
          </View>
          <View className="flex-row items-center gap-3">
            <Checkbox checked={checked} onCheckedChange={setChecked} />
            <Label>Warm-up set</Label>
          </View>
          <RadioGroup value={radio} onValueChange={setRadio}>
            {["beginner", "intermediate", "advanced"].map((level) => (
              <View key={level} className="flex-row items-center gap-3">
                <RadioGroupItem value={level} />
                <Label className="capitalize">{level}</Label>
              </View>
            ))}
          </RadioGroup>
          <View className="gap-2">
            <Label>{`Days per week: ${sliderValue}`}</Label>
            <Slider value={sliderValue} onValueChange={setSliderValue} min={1} max={7} />
          </View>
        </Section>

        <Section title="Field">
          <RadioGroup value={radio} onValueChange={setRadio}>
            {[
              { id: "beginner", description: "New to structured training" },
              { id: "intermediate", description: "6+ months of consistent lifting" },
            ].map((option) => (
              <FieldLabel
                key={option.id}
                selected={radio === option.id}
                onPress={() => setRadio(option.id)}
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value={option.id} />
                  <FieldContent>
                    <FieldTitle className="capitalize">{option.id}</FieldTitle>
                    <FieldDescription>{option.description}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </Section>

        <Section title="Tabs">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="lifting">Lifting</TabsTrigger>
              <TabsTrigger value="cardio">Cardio</TabsTrigger>
              <TabsTrigger value="mobility">Mobility</TabsTrigger>
            </TabsList>
            <TabsContent value="lifting">
              <Text className="text-foreground">Lifting content</Text>
            </TabsContent>
            <TabsContent value="cardio">
              <Text className="text-foreground">Cardio content</Text>
            </TabsContent>
            <TabsContent value="mobility">
              <Text className="text-foreground">Mobility content</Text>
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Skeleton / Separator">
          <Skeleton className="h-16 w-full" />
          <Separator />
          <View className="flex-row gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </View>
          </View>
        </Section>

        <Section title="Overlays & feedback">
          <View className="flex-row flex-wrap gap-2">
            <Button onPress={() => setDialogOpen(true)}>Open dialog</Button>
            <Button variant="secondary" onPress={() => setSheetOpen(true)}>
              Open sheet
            </Button>
            <Button variant="outline" onPress={() => toast.success("Set logged", "Bench Press · 135 lb × 8")}>
              Toast
            </Button>
            <Button
              variant="outline"
              onPress={() => {
                vibrate("success");
                toast.info("Haptic fired", "success pattern");
              }}
            >
              Haptic
            </Button>
          </View>
        </Section>
      </ScrollView>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>Delete workout?</DialogTitle>
          <DialogDescription>
            This permanently removes the workout and its entries.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onPress={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onPress={() => setDialogOpen(false)}>
            Delete
          </Button>
        </DialogFooter>
      </Dialog>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetHeader>
          <SheetTitle>Start workout</SheetTitle>
          <SheetDescription>
            Pick a routine or start an empty session.
          </SheetDescription>
        </SheetHeader>
        <View className="gap-2 pb-4">
          <Button onPress={() => setSheetOpen(false)}>Empty workout</Button>
          <Button variant="secondary" onPress={() => setSheetOpen(false)}>
            From routine
          </Button>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
