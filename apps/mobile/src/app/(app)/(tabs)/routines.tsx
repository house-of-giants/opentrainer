import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";
import {
  Calendar,
  Download,
  Dumbbell,
  MoreVertical,
  Plus,
} from "lucide-react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportRoutineDialog } from "@/components/workout/import-routine-dialog";
import {
  RoutineDetailSheet,
  type RoutineForDetail,
} from "@/components/workout/routine-detail-sheet";
import { useTheme } from "@/theme/theme-provider";

// Port of apps/web/src/app/routines/page.tsx. Web renders its own BottomNav +
// StartWorkoutSheet pair here; on mobile the persistent tab bar's FAB (via
// StartWorkoutProvider in the tabs layout) already covers that, so this screen
// only owns the list, the detail sheet, and the import dialog.
type Routine = {
  _id: Id<"routines">;
  name: string;
  description?: string;
  source: "manual" | "ai_generated" | "imported";
  days: {
    name: string;
    exercises: {
      exerciseName: string;
      kind: "lifting" | "cardio";
      targetSets?: number;
      targetReps?: string;
      targetDuration?: number;
    }[];
  }[];
  isActive: boolean;
  createdAt: number;
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function SourceBadge({ source }: { source: Routine["source"] }) {
  switch (source) {
    case "ai_generated":
      return <Badge variant="secondary">AI</Badge>;
    case "imported":
      return <Badge variant="outline">Imported</Badge>;
    default:
      return null;
  }
}

function RoutineCard({
  routine,
  onPress,
}: {
  routine: Routine;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="p-4 active:bg-muted/50">
        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text numberOfLines={1} className="font-semibold text-foreground">
                {routine.name}
              </Text>
              <SourceBadge source={routine.source} />
            </View>
            {routine.description && (
              <Text
                numberOfLines={1}
                className="mt-1 text-sm text-muted-foreground"
              >
                {routine.description}
              </Text>
            )}
            <View className="mt-2 flex-row items-center gap-3">
              <Text className="font-mono text-xs text-muted-foreground">
                {routine.days.length} day{routine.days.length !== 1 ? "s" : ""}
              </Text>
              <View className="flex-row items-center gap-1">
                <Calendar size={12} color={colors.mutedForeground} />
                <Text className="text-xs text-muted-foreground">
                  {formatDate(routine.createdAt)}
                </Text>
              </View>
            </View>
          </View>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 shrink-0"
            onPress={onPress}
            accessibilityLabel={`Routine options for ${routine.name}`}
          >
            <MoreVertical size={16} color={colors.foreground} />
          </Button>
        </View>
      </Card>
    </Pressable>
  );
}

export default function RoutinesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const routines = useQuery(api.routines.getRoutines, {});

  const [selectedRoutine, setSelectedRoutine] =
    useState<RoutineForDetail | null>(null);
  const [showImport, setShowImport] = useState(false);

  if (routines === undefined) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="h-14 flex-row items-center gap-4 border-b border-border px-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
        </View>
        <View className="gap-3 p-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center gap-2 border-b border-border px-4">
        <Text className="flex-1 text-lg font-semibold text-foreground">
          My Routines
        </Text>
        <Button size="sm" onPress={() => router.push("/(app)/routines/new")}>
          <Plus size={16} color={colors.primaryForeground} />
          <Text className="text-sm font-medium text-primary-foreground">New</Text>
        </Button>
        <Button variant="outline" size="sm" onPress={() => setShowImport(true)}>
          <Download size={16} color={colors.foreground} />
          <Text className="text-sm font-medium text-foreground">Import</Text>
        </Button>
      </View>

      {routines.length === 0 ? (
        <View className="p-4">
          <Card className="items-center p-8">
            <Dumbbell size={48} color={colors.mutedForeground} />
            <Text className="mb-2 mt-4 font-semibold text-foreground">
              No routines yet
            </Text>
            <Text className="mb-4 text-center text-sm text-muted-foreground">
              Create a routine from scratch, or save one from a completed
              workout.
            </Text>
            <View className="w-full gap-2">
              <Button
                className="w-full"
                onPress={() => router.push("/(app)/routines/new")}
              >
                <Plus size={16} color={colors.primaryForeground} />
                <Text className="text-sm font-medium text-primary-foreground">
                  Create Routine
                </Text>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onPress={() => setShowImport(true)}
              >
                <Download size={16} color={colors.foreground} />
                <Text className="text-sm font-medium text-foreground">
                  Import
                </Text>
              </Button>
            </View>
          </Card>
        </View>
      ) : (
        <FlatList
          data={routines as Routine[]}
          keyExtractor={(routine) => routine._id}
          contentContainerClassName="gap-3 p-4 pb-24"
          renderItem={({ item }) => (
            <RoutineCard
              routine={item}
              onPress={() => setSelectedRoutine(item)}
            />
          )}
        />
      )}

      <RoutineDetailSheet
        routine={selectedRoutine}
        onOpenChange={(open) => !open && setSelectedRoutine(null)}
      />

      <ImportRoutineDialog open={showImport} onOpenChange={setShowImport} />
    </SafeAreaView>
  );
}
