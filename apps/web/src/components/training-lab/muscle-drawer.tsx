"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface MuscleDrawerProps {
  muscle: string | null;
  onClose: () => void;
}

export function MuscleDrawer({ muscle, onClose }: MuscleDrawerProps) {
  return (
    <Drawer open={muscle !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="capitalize">{muscle} Training</DrawerTitle>
          <DrawerDescription>
            Exercises targeting this muscle group
          </DrawerDescription>
        </DrawerHeader>
        {muscle && <MuscleDrawerContent muscle={muscle} />}
      </DrawerContent>
    </Drawer>
  );
}

function MuscleDrawerContent({ muscle }: { muscle: string }) {
  return (
    <div className="p-4 pb-8">
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Detailed exercise breakdown coming soon. This will show:
        </div>
        <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-4">
          <li>All exercises targeting {muscle}</li>
          <li>Sets performed per exercise</li>
          <li>Recent session details</li>
          <li>Volume trends for this muscle</li>
        </ul>
      </div>
    </div>
  );
}
