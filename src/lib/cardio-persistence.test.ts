import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CardioSaveBlockedError,
  createCardioPersistenceGate,
} from "./cardio-persistence";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe("cardio persistence gate", () => {
  test("tracks concurrent saves until each one is acknowledged", async () => {
    const pendingCounts: number[] = [];
    const gate = createCardioPersistenceGate((count) => pendingCounts.push(count));
    const first = deferred<string>();
    const second = deferred<string>();

    const firstSave = gate.runSave(() => first.promise);
    const secondSave = gate.runSave(() => second.promise);

    assert.equal(gate.pendingCount, 2);
    assert.equal(gate.tryStartCompletion(), "cardio_save_pending");

    first.resolve("first");
    assert.equal(await firstSave, "first");
    assert.equal(gate.pendingCount, 1);
    assert.equal(gate.tryStartCompletion(), "cardio_save_pending");

    second.resolve("second");
    assert.equal(await secondSave, "second");
    assert.equal(gate.pendingCount, 0);
    assert.deepEqual(pendingCounts, [1, 2, 1, 0]);
  });

  test("releases a failed save so it can be retried", async () => {
    const gate = createCardioPersistenceGate();
    const failure = new Error("offline");

    await assert.rejects(gate.runSave(() => Promise.reject(failure)), failure);
    assert.equal(gate.pendingCount, 0);
    assert.equal(await gate.runSave(() => Promise.resolve("saved")), "saved");
  });

  test("prevents a new save once completion starts", async () => {
    const gate = createCardioPersistenceGate();

    assert.equal(gate.tryStartCompletion(), "started");
    assert.equal(gate.tryStartCompletion(), "already_completing");
    await assert.rejects(
      gate.runSave(() => Promise.resolve()),
      CardioSaveBlockedError
    );

    gate.finishCompletion();
    assert.equal(await gate.runSave(() => Promise.resolve("saved")), "saved");
  });
});
