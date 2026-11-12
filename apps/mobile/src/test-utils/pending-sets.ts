import AsyncStorage from "@react-native-async-storage/async-storage";

import { PENDING_SETS_STORAGE_KEY } from "@/lib/pending-set-queue";

// Test support for screens that log sets through usePendingSets.
//
//   jest.mock("convex/react", () => ({
//     ...,
//     useConvex: () => require("@/test-utils/pending-sets").mockConvexClient,
//   }));
//   jest.mock("@/lib/pending-set-queue", () =>
//     require("@/test-utils/pending-sets").pendingSetQueueModuleMock(),
//   );
//   beforeEach(() => resetPendingSets());
//
// The queue is one per app process, so without a reset a set left pending in
// one test would show in the next.

type ConnectionListener = (state: { isWebSocketConnected: boolean }) => void;

const connectionListeners = new Set<ConnectionListener>();
const connection = { isWebSocketConnected: true };

/** Stands in for the ConvexReactClient that useConvex returns. */
export const mockConvexClient = {
  connectionState: () => ({ ...connection }),
  subscribeToConnectionState: (listener: ConnectionListener) => {
    connectionListeners.add(listener);
    return () => {
      connectionListeners.delete(listener);
    };
  },
};

export function setConvexConnected(isWebSocketConnected: boolean) {
  connection.isWebSocketConnected = isWebSocketConnected;
  for (const listener of connectionListeners) listener({ ...connection });
}

/** The real queue module, with a queue a test can replace. */
export function pendingSetQueueModuleMock() {
  const actual = jest.requireActual("@/lib/pending-set-queue");
  let queue = actual.createPendingSetQueue();
  // Babel compiles object spread to a helper that copies getter values, so
  // define the live accessor after the spread.
  return Object.defineProperty(
    {
      ...actual,
      replaceQueueForTests: () => {
        queue = actual.createPendingSetQueue();
        return queue.load();
      },
    },
    "pendingSetQueue",
    { get: () => queue, enumerable: true },
  );
}

/** Replaces the queue and starts reading storage, as app start does. */
function replaceQueue(): Promise<void> {
  return (
    jest.requireMock("@/lib/pending-set-queue") as {
      replaceQueueForTests: () => Promise<void>;
    }
  ).replaceQueueForTests();
}

/** A closed app: memory is gone, device storage stays. */
export function simulateAppRestart() {
  void replaceQueue();
}

/** A fresh install: no queued sets in memory or storage, connection up. */
export async function resetPendingSets() {
  await AsyncStorage.removeItem(PENDING_SETS_STORAGE_KEY);
  await replaceQueue();
  connectionListeners.clear();
  connection.isWebSocketConnected = true;
}
