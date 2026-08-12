import { ReactNode, useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvex, useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import { displayWeight } from "@opentrainer/lib/units";
import {
  Calendar,
  Download,
  Dumbbell,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Ruler,
  Scale,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react-native";

import {
  DeleteAccountDialog,
  EditAvailabilityDialog,
  EditBodyweightDialog,
  EditEquipmentDialog,
  EditExperienceDialog,
  EditGoalsDialog,
  EditUnitsDialog,
} from "@/components/profile";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useTheme, type ThemePreference } from "@/theme/theme-provider";

// Port of apps/web/src/app/profile/page.tsx.
// Omitted: the Subscription section and its /pricing link — the alpha is free
// and mobile ships no billing UI.
// Omitted: BottomNav + StartWorkoutSheet — the tab bar and its center FAB own
// starting a workout on mobile.
const GOAL_LABELS: Record<string, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  endurance: "Endurance",
  weight_loss: "Weight Loss",
  general_fitness: "General Fitness",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const THEME_LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const THEME_ORDER: ThemePreference[] = ["light", "dark", "system"];

export default function ProfileScreen() {
  const { colors, preference, resolved, setPreference } = useTheme();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useAuth();
  const convex = useConvex();

  const user = useQuery(api.users.getCurrentUser);
  const workouts = useQuery(api.workouts.getWorkoutHistory, {
    limit: 1000,
    status: "all",
  });

  const [showGoalsDialog, setShowGoalsDialog] = useState(false);
  const [showExperienceDialog, setShowExperienceDialog] = useState(false);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showBodyweightDialog, setShowBodyweightDialog] = useState(false);
  const [showUnitsDialog, setShowUnitsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isLoaded || user === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="h-14 justify-center border-b border-border px-4">
          <Skeleton className="h-6 w-24" />
        </View>
        <View className="flex-1 items-center p-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="mt-4 h-6 w-32" />
        </View>
      </SafeAreaView>
    );
  }

  const completedWorkouts = workouts?.filter((w) => w.status === "completed") ?? [];
  const totalSets = completedWorkouts.reduce(
    (acc, w) => acc + (w.summary?.totalSets ?? 0),
    0,
  );
  const totalVolume = completedWorkouts.reduce(
    (acc, w) => acc + (w.summary?.totalVolume ?? 0),
    0,
  );

  const goalsDisplay =
    user?.goals?.map((g) => GOAL_LABELS[g] ?? g).join(", ") || "Not set";
  const experienceDisplay = user?.experienceLevel
    ? EXPERIENCE_LABELS[user.experienceLevel]
    : "Not set";
  const equipmentCount = user?.equipment?.length ?? 0;
  const equipmentDisplay = user?.equipmentDescription
    ? `"${user.equipmentDescription}"`
    : equipmentCount > 0
      ? `${equipmentCount} items selected`
      : "Not set";
  const availabilityDisplay =
    user?.weeklyAvailability && user?.sessionDuration
      ? `${user.weeklyAvailability} days/week · ${user.sessionDuration} min`
      : "Not set";
  const preferredUnit = (user?.preferredUnits ?? "lb") as "lb" | "kg";
  const storedBodyweightUnit = (user?.bodyweightUnit ?? "lb") as "lb" | "kg";
  const bodyweightDisplay = user?.bodyweight
    ? `${displayWeight(user.bodyweight, storedBodyweightUnit, preferredUnit)} ${preferredUnit}`
    : "Not set";

  const cycleTheme = () => {
    const next: ThemePreference =
      preference === "light" ? "dark" : preference === "dark" ? "system" : "light";
    setPreference(next);
  };

  // Web downloads a JSON blob; native hands the same payload to the share
  // sheet, matching the workout export dialog.
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await convex.query(api.users.exportAllData, {});
      const json = JSON.stringify(data, null, 2);
      const fileName = `opentrainer-export-${new Date().toISOString().split("T")[0]}.json`;
      await Share.share({ message: json, title: fileName });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const AppearanceIcon =
    preference === "system" ? Monitor : resolved === "dark" ? Moon : Sun;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center justify-between border-b border-border px-4">
        <Text className="text-lg font-semibold text-foreground">Profile</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 p-4 pb-24">
        <View className="items-center py-6">
          {/* Clerk's <UserButton /> is web-only; account actions live in the
              rows below. */}
          {clerkUser?.imageUrl ? (
            <Image
              source={{ uri: clerkUser.imageUrl }}
              className="h-24 w-24 rounded-full"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-muted">
              <User size={40} color={colors.mutedForeground} />
            </View>
          )}
          <Text className="mt-4 text-xl font-semibold text-foreground">
            {clerkUser?.fullName ?? user?.name ?? "Athlete"}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {clerkUser?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <StatCard label="Workouts" value={`${completedWorkouts.length}`} />
          <StatCard label="Total Sets" value={`${totalSets}`} />
          <StatCard
            label={`Volume (${preferredUnit})`}
            value={
              totalVolume > 1000
                ? `${(totalVolume / 1000).toFixed(0)}k`
                : `${totalVolume}`
            }
          />
        </View>

        <Section title="Training Profile">
          <SettingRow
            icon={Target}
            label="Goals"
            value={goalsDisplay}
            onPress={() => setShowGoalsDialog(true)}
          />
          <SettingRow
            icon={TrendingUp}
            label="Experience"
            value={experienceDisplay}
            onPress={() => setShowExperienceDialog(true)}
          />
          <SettingRow
            icon={Dumbbell}
            label="Equipment"
            value={equipmentDisplay}
            onPress={() => setShowEquipmentDialog(true)}
          />
          <SettingRow
            icon={Calendar}
            label="Availability"
            value={availabilityDisplay}
            onPress={() => setShowAvailabilityDialog(true)}
          />
        </Section>

        <Section title="Body">
          <SettingRow
            icon={Scale}
            label="Bodyweight"
            value={bodyweightDisplay}
            onPress={() => setShowBodyweightDialog(true)}
          />
        </Section>

        <Section title="Preferences">
          <SettingRow
            icon={AppearanceIcon}
            label="Appearance"
            value={THEME_LABELS[preference]}
            onPress={cycleTheme}
            accessory={<Dots options={THEME_ORDER} active={preference} />}
          />
          <SettingRow
            icon={Ruler}
            label="Units"
            value={user?.preferredUnits === "kg" ? "Metric (kg)" : "Imperial (lb)"}
            onPress={() => setShowUnitsDialog(true)}
            accessory={
              <Dots options={["lb", "kg"]} active={user?.preferredUnits ?? "lb"} />
            }
          />
        </Section>

        <Section title="Account">
          <SettingRow
            icon={Download}
            label="Export All Data"
            value={
              isExporting
                ? "Preparing export..."
                : "Download your workouts, routines & more"
            }
            onPress={handleExportData}
            disabled={isExporting}
            accessory={null}
          />
          {/* Mobile-only: web signs out through Clerk's <UserButton />, which
              has no native equivalent. */}
          <SettingRow
            icon={LogOut}
            label="Sign Out"
            onPress={() => signOut()}
            accessory={null}
          />
          <SettingRow
            icon={Trash2}
            label="Delete Account"
            onPress={() => setShowDeleteDialog(true)}
            destructive
            accessory={null}
          />
        </Section>
      </ScrollView>

      <EditGoalsDialog
        open={showGoalsDialog}
        onOpenChange={setShowGoalsDialog}
        currentGoals={user?.goals ?? []}
      />
      <EditExperienceDialog
        open={showExperienceDialog}
        onOpenChange={setShowExperienceDialog}
        currentLevel={user?.experienceLevel}
      />
      <EditEquipmentDialog
        open={showEquipmentDialog}
        onOpenChange={setShowEquipmentDialog}
        currentDescription={user?.equipmentDescription}
        currentEquipment={user?.equipment ?? []}
      />
      <EditAvailabilityDialog
        open={showAvailabilityDialog}
        onOpenChange={setShowAvailabilityDialog}
        currentDays={user?.weeklyAvailability}
        currentDuration={user?.sessionDuration}
      />
      <EditBodyweightDialog
        open={showBodyweightDialog}
        onOpenChange={setShowBodyweightDialog}
        currentWeight={user?.bodyweight}
        storedUnit={storedBodyweightUnit}
        preferredUnit={preferredUnit}
      />
      <EditUnitsDialog
        open={showUnitsDialog}
        onOpenChange={setShowUnitsDialog}
        currentUnit={user?.preferredUnits as "lb" | "kg" | undefined}
      />
      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text className="mb-3 px-1 font-mono text-sm uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 items-center p-4">
      <Text className="font-mono text-2xl font-bold text-card-foreground">
        {value}
      </Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </Card>
  );
}

interface SettingRowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Right-hand element; defaults to the web's edit pencil. */
  accessory?: ReactNode;
}

function SettingRow({
  icon: Icon,
  label,
  value,
  onPress,
  disabled,
  destructive,
  accessory,
}: SettingRowProps) {
  const { colors } = useTheme();
  const iconColor = destructive ? colors.destructive : colors.mutedForeground;
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        className="flex-row items-center justify-between p-4"
        onPress={onPress}
        disabled={disabled}
      >
        <View className="flex-1 flex-row items-center gap-3">
          <Icon size={20} color={iconColor} />
          <View className="flex-1">
            <Text
              className={
                destructive
                  ? "font-medium text-destructive"
                  : "font-medium text-foreground"
              }
            >
              {label}
            </Text>
            {value ? (
              <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                {value}
              </Text>
            ) : null}
          </View>
        </View>
        {accessory === undefined ? (
          <Pencil size={16} color={colors.mutedForeground} />
        ) : (
          accessory
        )}
      </Pressable>
    </Card>
  );
}

function Dots({ options, active }: { options: string[]; active: string }) {
  return (
    <View className="flex-row gap-1">
      {options.map((option) => (
        <View
          key={option}
          className={`h-2 w-2 rounded-full ${option === active ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </View>
  );
}
