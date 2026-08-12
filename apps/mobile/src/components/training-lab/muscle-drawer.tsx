import { Text, View } from "react-native";

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface MuscleDrawerProps {
  muscle: string | null;
  onClose: () => void;
}

// Port of apps/web/src/components/training-lab/muscle-drawer.tsx; vaul Drawer
// → the app's bottom Sheet.
export function MuscleDrawer({ muscle, onClose }: MuscleDrawerProps) {
  return (
    <Sheet open={muscle !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetHeader>
        <SheetTitle className="capitalize">{muscle} Training</SheetTitle>
        <SheetDescription>Exercises targeting this muscle group</SheetDescription>
      </SheetHeader>
      {muscle && <MuscleDrawerContent muscle={muscle} />}
    </Sheet>
  );
}

function MuscleDrawerContent({ muscle }: { muscle: string }) {
  const bullets = [
    `All exercises targeting ${muscle}`,
    "Sets performed per exercise",
    "Recent session details",
    "Volume trends for this muscle",
  ];

  return (
    <View className="gap-3 p-4 pb-8">
      <Text className="text-sm text-muted-foreground">
        Detailed exercise breakdown coming soon. This will show:
      </Text>
      <View className="gap-2 pl-1">
        {bullets.map((item) => (
          <Text key={item} className="text-sm text-muted-foreground">
            {"•"} {item}
          </Text>
        ))}
      </View>
    </View>
  );
}
