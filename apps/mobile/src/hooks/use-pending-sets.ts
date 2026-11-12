import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "@opentrainer/backend";
import type { Id } from "@opentrainer/backend";

import { toast } from "@/components/ui/toast";
import { analytics } from "@/lib/analytics";
import {
  pendingSetQueue,
  type PendingSet,
  type PendingSetArgs,
  type SyncResult,
} from "@/lib/pending-set-queue";

/**
 * Logs lifting sets through the device queue. A set shows at once; the queue
 * sends it now, again when the workout screen mounts, and again when the
 * Convex client reconnects, until the server confirms it.
 */
export function usePendingSets(workoutId: Id<"workouts"> | undefined) {
  const queue = pendingSetQueue;
  const addLiftingEntry = useMutation(api.entries.addLiftingEntry);
  const convex = useConvex();
  const items = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  const isLoaded = useSyncExternalStore(queue.subscribe, queue.isLoaded);

  useEffect(() => {
    void queue.load();
  }, [queue]);

  const workoutIdRef = useRef(workoutId);
  useEffect(() => {
    workoutIdRef.current = workoutId;
  }, [workoutId]);

  const handleResult = useCallback(
    (result: SyncResult, item: PendingSet | undefined) => {
      if (result.outcome !== "failed" || !item) return;
      analytics.captureException(result.error);
      if (item.args.workoutId !== workoutIdRef.current) {
        // The set belongs to a workout that is no longer active, so the
        // server cannot accept it now. Drop it rather than keep it forever.
        queue.remove(result.clientId);
        return;
      }
      toast.error("Set not saved", "Tap the set to try again.");
    },
    [queue],
  );

  const replay = useCallback(async () => {
    await queue.load();
    const snapshot = queue.getSnapshot();
    const results = await queue.syncAll(addLiftingEntry);
    for (const result of results) {
      handleResult(
        result,
        snapshot.find((item) => item.args.clientId === result.clientId),
      );
    }
  }, [queue, addLiftingEntry, handleResult]);

  // Replay on mount, once the active workout is known.
  const hasWorkout = workoutId !== undefined;
  useEffect(() => {
    if (hasWorkout) void replay();
  }, [hasWorkout, replay]);

  // Replay when the connection comes back. The Convex client resends its own
  // in-flight mutations; this also retries sets the server rejected.
  useEffect(() => {
    if (!hasWorkout) return;
    let wasConnected = convex.connectionState().isWebSocketConnected;
    return convex.subscribeToConnectionState((state) => {
      if (state.isWebSocketConnected && !wasConnected) void replay();
      wasConnected = state.isWebSocketConnected;
    });
  }, [convex, hasWorkout, replay]);

  const logSet = useCallback(
    (args: PendingSetArgs) => {
      queue.add(args);
      // Stored sets go first, so the server receives sets in logged order.
      void queue
        .load()
        .then(() => queue.sync(args.clientId, addLiftingEntry))
        .then((result) => handleResult(result, { args, status: "pending" }));
    },
    [queue, addLiftingEntry, handleResult],
  );

  const pendingSets = useMemo(
    () => items.filter((item) => item.args.workoutId === workoutId),
    [items, workoutId],
  );

  // Log only after stored sets are restored, so a new set's number counts them.
  return { isLoaded, pendingSets, logSet, retry: replay };
}
