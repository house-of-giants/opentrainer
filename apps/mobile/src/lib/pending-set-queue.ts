import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FunctionArgs } from "convex/server";
import type { api } from "@opentrainer/backend";

// Lifting sets the server has not confirmed yet. The Convex client queues
// mutations in memory only, so a set logged with no signal is lost if the app
// closes before it reconnects. This queue keeps each set on the device until
// addLiftingEntry confirms it. Replays reuse the original clientId, and the
// server ignores a clientId it already has, so a replay never duplicates a set.

export type PendingSetArgs = FunctionArgs<typeof api.entries.addLiftingEntry>;

export type PendingSet = {
  args: PendingSetArgs;
  /** "failed" means the server rejected the last attempt. */
  status: "pending" | "failed";
};

export type SyncResult =
  | { clientId: string; outcome: "synced" | "skipped" }
  | { clientId: string; outcome: "failed"; error: unknown };

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const PENDING_SETS_STORAGE_KEY = "opentrainer.pendingSets.v1";

function parseStored(raw: string | null): PendingSet[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingSet =>
        typeof item?.args?.clientId === "string" &&
        typeof item?.args?.workoutId === "string" &&
        (item.status === "pending" || item.status === "failed"),
    );
  } catch {
    return [];
  }
}

export function createPendingSetQueue(storage: Storage = AsyncStorage) {
  let items: readonly PendingSet[] = [];
  let loading: Promise<void> | null = null;
  let loaded = false;
  let writes: Promise<void> = Promise.resolve();
  const inFlight = new Set<string>();
  const listeners = new Set<() => void>();

  const commit = (next: readonly PendingSet[]) => {
    items = next;
    for (const listener of listeners) listener();
    // Until stored sets are read, a write would replace them; load writes the
    // merged list.
    if (!loaded) return;
    // Each write stores the full list as it is now; writes run in order, so
    // the last one always matches memory.
    const snapshot = JSON.stringify(next);
    writes = writes
      .then(() => storage.setItem(PENDING_SETS_STORAGE_KEY, snapshot))
      .catch((error) => console.error("Failed to store pending sets:", error));
  };

  const setStatus = (clientId: string, status: PendingSet["status"]) => {
    if (!items.some((item) => item.args.clientId === clientId)) return;
    commit(
      items.map((item) =>
        item.args.clientId === clientId ? { ...item, status } : item,
      ),
    );
  };

  const remove = (clientId: string) => {
    commit(items.filter((item) => item.args.clientId !== clientId));
  };

  const sync = async (
    clientId: string,
    send: (args: PendingSetArgs) => Promise<unknown>,
  ): Promise<SyncResult> => {
    const item = items.find((entry) => entry.args.clientId === clientId);
    if (!item || inFlight.has(clientId)) return { clientId, outcome: "skipped" };

    inFlight.add(clientId);
    if (item.status !== "pending") setStatus(clientId, "pending");
    try {
      await send(item.args);
      remove(clientId);
      return { clientId, outcome: "synced" };
    } catch (error) {
      setStatus(clientId, "failed");
      return { clientId, outcome: "failed", error };
    } finally {
      inFlight.delete(clientId);
    }
  };

  return {
    /** Reads stored sets once. Sets added before it finishes stay after them. */
    load(): Promise<void> {
      loading ??= storage
        .getItem(PENDING_SETS_STORAGE_KEY)
        .catch(() => null)
        .then((raw) => {
          const stored = parseStored(raw);
          const storedIds = new Set(stored.map((item) => item.args.clientId));
          loaded = true;
          commit([
            ...stored,
            ...items.filter((item) => !storedIds.has(item.args.clientId)),
          ]);
        });
      return loading;
    },
    add(args: PendingSetArgs) {
      if (items.some((item) => item.args.clientId === args.clientId)) return;
      commit([...items, { args, status: "pending" }]);
    },
    remove,
    sync,
    /**
     * Sends every set that is not already in flight, oldest first. The
     * Convex client runs one client's mutations in call order, so the server
     * receives them in this order too.
     */
    syncAll(send: (args: PendingSetArgs) => Promise<unknown>) {
      return Promise.all(items.map((item) => sync(item.args.clientId, send)));
    },
    getSnapshot: () => items,
    /** True once stored sets are in memory. */
    isLoaded: () => loaded,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Resolves after every storage write started so far has finished. */
    flushWrites: () => writes,
  };
}

export type PendingSetQueue = ReturnType<typeof createPendingSetQueue>;

/** One queue per app process, shared by every mount of the workout screen. */
export const pendingSetQueue = createPendingSetQueue();
// Read stored sets at app start, so the workout screen rarely waits for them.
void pendingSetQueue.load();
