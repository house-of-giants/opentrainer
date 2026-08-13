import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@opentrainer/backend";

import { StartWorkoutSheet } from "@/components/workout/start-workout-sheet";
import { toast } from "@/components/ui/toast";

// On web every page that needs the start-workout flow renders its own
// <BottomNav onStartWorkout /> + <StartWorkoutSheet> pair. On mobile the tab
// bar is a single persistent layout, so the sheet lives there once and screens
// open it through this context (dashboard CTA, history empty state, tab FAB).
interface StartWorkoutContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const StartWorkoutContext = createContext<StartWorkoutContextValue | null>(null);

export function StartWorkoutProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Web's dashboard passes activeWorkout into the sheet so it can offer
  // Continue / Cancel & Start New; querying it here gives every entry point
  // (including the tab FAB) that same branch.
  const activeWorkout = useQuery(api.workouts.getActiveWorkout);

  const open = useCallback(() => {
    console.log("[start-workout] open() pressed");
    toast.info("diag: start-workout press"); // TEMP DIAGNOSTIC
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <StartWorkoutContext.Provider value={value}>
      {children}
      <StartWorkoutSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        activeWorkout={activeWorkout}
      />
    </StartWorkoutContext.Provider>
  );
}

export function useStartWorkout() {
  const ctx = useContext(StartWorkoutContext);
  if (!ctx) {
    throw new Error("useStartWorkout must be used within StartWorkoutProvider");
  }
  return ctx;
}
