import { Text, View } from "react-native";
import { TrendingUp, Trophy } from "lucide-react-native";

// Port of apps/web/src/components/training-lab/pr-badge.tsx. The web card's
// amber→yellow CSS gradient becomes a flat amber tint (same convention as
// training-lab-card.tsx).
const AMBER = "#f59e0b"; // amber-500
const GREEN = "#22c55e"; // green-500

interface PrBadgeProps {
  type?: "inline" | "card";
}

export function PrBadge({ type = "inline" }: PrBadgeProps) {
  if (type === "card") {
    return (
      <View className="flex-row items-center gap-1.5 self-start rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1">
        <Trophy size={14} color={AMBER} />
        <Text className="text-xs font-semibold text-amber-500">PR</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1 self-start rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5">
      <Trophy size={12} color={AMBER} />
      <Text className="text-xs font-medium text-amber-500">PR</Text>
    </View>
  );
}

interface RecentPrCardProps {
  prs: {
    exercise: string;
    weight: number;
    unit: "kg" | "lb";
    date: string;
  }[];
}

export function RecentPrCard({ prs }: RecentPrCardProps) {
  if (prs.length === 0) return null;

  return (
    <View className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <Trophy size={20} color={AMBER} />
        <Text className="font-semibold text-amber-500">Recent PRs</Text>
      </View>
      <View className="gap-2">
        {prs.map((pr, i) => (
          <View key={i} className="flex-row items-center justify-between">
            <Text numberOfLines={1} className="flex-1 text-sm text-foreground">
              {pr.exercise}
            </Text>
            <View className="shrink-0 flex-row items-center gap-2">
              <Text className="font-mono text-sm font-semibold text-foreground">
                {pr.weight} {pr.unit}
              </Text>
              <TrendingUp size={14} color={GREEN} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
