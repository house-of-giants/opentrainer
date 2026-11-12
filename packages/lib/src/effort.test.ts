import assert from "node:assert/strict";
import { test } from "node:test";
import { effortForStorage } from "./effort";

test("RPE scale stores whole and half-step RPE without RIR", () => {
	assert.deepEqual(effortForStorage(7, "rpe"), { rpe: 7, rir: undefined });
	assert.deepEqual(effortForStorage(8.5, "rpe"), { rpe: 8.5, rir: undefined });
});

test("RIR scale stores the RIR the user picked and the matching RPE", () => {
	// The selector emits RPE; RIR 2 is RPE 8, RIR 0 is RPE 10, RIR 4 is RPE 6.
	assert.deepEqual(effortForStorage(8, "rir"), { rpe: 8, rir: 2 });
	assert.deepEqual(effortForStorage(10, "rir"), { rpe: 10, rir: 0 });
	assert.deepEqual(effortForStorage(6, "rir"), { rpe: 6, rir: 4 });
});

test("RIR scale does not invent RIR for a half-step RPE", () => {
	assert.deepEqual(effortForStorage(8.5, "rir"), { rpe: 8.5, rir: undefined });
});

test("no effort stores neither field", () => {
	assert.deepEqual(effortForStorage(null, "rir"), { rpe: undefined, rir: undefined });
	assert.deepEqual(effortForStorage(undefined, "rpe"), { rpe: undefined, rir: undefined });
});

test("an RPE-scale edit keeps the stored RIR when the effort is unchanged", () => {
	assert.deepEqual(effortForStorage(8, "rpe", { rpe: 8, rir: 2 }), { rpe: 8, rir: 2 });
});

test("an RPE-scale edit drops the stored RIR when the effort changes", () => {
	assert.deepEqual(effortForStorage(8.5, "rpe", { rpe: 8, rir: 2 }), {
		rpe: 8.5,
		rir: undefined,
	});
	assert.deepEqual(effortForStorage(null, "rpe", { rpe: 8, rir: 2 }), {
		rpe: undefined,
		rir: undefined,
	});
});
