import type { Id } from "@opentrainer/backend";

import {
  createPendingSetQueue,
  PENDING_SETS_STORAGE_KEY,
  type PendingSetArgs,
} from "@/lib/pending-set-queue";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: jest.fn(async (key: string) => data.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  };
}

function storedClientIds(storage: ReturnType<typeof createMemoryStorage>) {
  const raw = storage.data.get(PENDING_SETS_STORAGE_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as { args: PendingSetArgs }[]).map(
    (item) => item.args.clientId,
  );
}

function setArgs(clientId: string, setNumber: number): PendingSetArgs {
  return {
    workoutId: "workout_1" as Id<"workouts">,
    clientId,
    exerciseName: "Bench Press",
    lifting: { setNumber, reps: 5, weight: 185, unit: "lb" },
  };
}

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("pending set queue", () => {
  it("persists added sets so a new queue on the same storage restores them in order", async () => {
    const storage = createMemoryStorage();
    const queue = createPendingSetQueue(storage);
    await queue.load();

    queue.add(setArgs("c1", 1));
    queue.add(setArgs("c2", 2));
    await queue.flushWrites();

    // A killed app starts with a fresh queue over the same device storage.
    const restarted = createPendingSetQueue(storage);
    await restarted.load();

    expect(restarted.getSnapshot().map((item) => item.args)).toEqual([
      setArgs("c1", 1),
      setArgs("c2", 2),
    ]);
  });

  it("sends every set in order with its original arguments and removes each only after the server confirms", async () => {
    const storage = createMemoryStorage();
    const queue = createPendingSetQueue(storage);
    await queue.load();
    queue.add(setArgs("c1", 1));
    queue.add(setArgs("c2", 2));

    const confirmations = [deferred(), deferred()];
    let calls = 0;
    const send = jest.fn(
      (_args: PendingSetArgs): Promise<unknown> => confirmations[calls++].promise,
    );

    const results = queue.syncAll(send);

    expect(send.mock.calls.map(([args]) => args)).toEqual([
      setArgs("c1", 1),
      setArgs("c2", 2),
    ]);
    await queue.flushWrites();
    expect(storedClientIds(storage)).toEqual(["c1", "c2"]);

    confirmations[0].resolve("entry_1");
    await confirmations[0].promise;
    await queue.flushWrites();
    expect(storedClientIds(storage)).toEqual(["c2"]);

    confirmations[1].resolve("entry_2");
    expect(await results).toEqual([
      { clientId: "c1", outcome: "synced" },
      { clientId: "c2", outcome: "synced" },
    ]);
    await queue.flushWrites();
    expect(storedClientIds(storage)).toEqual([]);
    expect(queue.getSnapshot()).toEqual([]);
  });

  it("keeps a rejected set as failed and retries it with the same clientId", async () => {
    const storage = createMemoryStorage();
    const queue = createPendingSetQueue(storage);
    await queue.load();
    queue.add(setArgs("c1", 1));

    const error = new Error("User not found");
    const send = jest
      .fn<Promise<unknown>, [PendingSetArgs]>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("entry_1");

    expect(await queue.sync("c1", send)).toEqual({
      clientId: "c1",
      outcome: "failed",
      error,
    });
    await queue.flushWrites();
    expect(queue.getSnapshot()).toEqual([
      { args: setArgs("c1", 1), status: "failed" },
    ]);
    expect(storedClientIds(storage)).toEqual(["c1"]);

    expect(await queue.sync("c1", send)).toEqual({
      clientId: "c1",
      outcome: "synced",
    });
    expect(send.mock.calls.map(([args]) => args.clientId)).toEqual([
      "c1",
      "c1",
    ]);
    await queue.flushWrites();
    expect(storedClientIds(storage)).toEqual([]);
  });

  it("does not send a set a second time while it is still in flight", async () => {
    const queue = createPendingSetQueue(createMemoryStorage());
    await queue.load();
    queue.add(setArgs("c1", 1));
    const confirmation = deferred();
    const send = jest.fn(() => confirmation.promise);

    const first = queue.sync("c1", send);
    const second = await queue.sync("c1", send);

    expect(second).toEqual({ clientId: "c1", outcome: "skipped" });
    expect(send).toHaveBeenCalledTimes(1);
    confirmation.resolve("entry_1");
    expect(await first).toEqual({ clientId: "c1", outcome: "synced" });
  });

  it("keeps a set added before storage finished loading after the stored sets", async () => {
    const storage = createMemoryStorage({
      [PENDING_SETS_STORAGE_KEY]: JSON.stringify([
        { args: setArgs("old", 1), status: "pending" },
      ]),
    });
    const queue = createPendingSetQueue(storage);

    const loading = queue.load();
    queue.add(setArgs("new", 2));
    await loading;
    await queue.flushWrites();

    expect(queue.getSnapshot().map((item) => item.args.clientId)).toEqual([
      "old",
      "new",
    ]);
    expect(storedClientIds(storage)).toEqual(["old", "new"]);
  });

  it("does not overwrite stored sets with a set added before they finish loading", async () => {
    const storage = createMemoryStorage({
      [PENDING_SETS_STORAGE_KEY]: JSON.stringify([
        { args: setArgs("old", 1), status: "pending" },
      ]),
    });
    const read = deferred();
    storage.getItem.mockImplementationOnce(async (key: string) => {
      await read.promise;
      return storage.data.get(key) ?? null;
    });
    const queue = createPendingSetQueue(storage);

    const loading = queue.load();
    queue.add(setArgs("new", 2));
    await queue.flushWrites();

    // A kill now must still find the stored set on the device.
    expect(storedClientIds(storage)).toEqual(["old"]);

    read.resolve(undefined);
    await loading;
    await queue.flushWrites();
    expect(storedClientIds(storage)).toEqual(["old", "new"]);
  });

  it("starts empty when stored data is unreadable", async () => {
    const queue = createPendingSetQueue(
      createMemoryStorage({ [PENDING_SETS_STORAGE_KEY]: "{not json" }),
    );

    await queue.load();

    expect(queue.getSnapshot()).toEqual([]);
  });
});
