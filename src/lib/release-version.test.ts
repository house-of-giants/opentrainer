import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	getActiveDismissedReleaseId,
	getDismissedReleaseStorageKey,
	getReleaseStatus,
	parseStoredReleaseCheck,
	shouldCheckForRelease,
} from "./release-version";

describe("getDismissedReleaseStorageKey", () => {
	test("gives each release an independent dismissal slot", () => {
		assert.equal(
			getDismissedReleaseStorageKey("release-b"),
			"opentrainer:dismissed-release:release-b"
		);
		assert.equal(
			getDismissedReleaseStorageKey("release-c"),
			"opentrainer:dismissed-release:release-c"
		);
		assert.notEqual(
			getDismissedReleaseStorageKey("release-b"),
			getDismissedReleaseStorageKey("release-c")
		);
	});

	test("normalizes valid identifiers and rejects missing identifiers", () => {
		assert.equal(
			getDismissedReleaseStorageKey(" release/b "),
			"opentrainer:dismissed-release:release%2Fb"
		);
		assert.equal(getDismissedReleaseStorageKey(" "), null);
	});
});

describe("getReleaseStatus", () => {
	test("does not compare missing release identifiers", () => {
		assert.equal(
			getReleaseStatus({
				currentReleaseId: null,
				latestReleaseId: "release-b",
			}),
			"unavailable"
		);
		assert.equal(
			getReleaseStatus({
				currentReleaseId: "release-a",
				latestReleaseId: " ",
			}),
			"unavailable"
		);
	});

	test("recognizes the current release", () => {
		assert.equal(
			getReleaseStatus({
				currentReleaseId: "release-a",
				latestReleaseId: "release-a",
			}),
			"current"
		);
	});

	test("recognizes a different current production release", () => {
		assert.equal(
			getReleaseStatus({
				currentReleaseId: "release-a",
				latestReleaseId: "release-b",
			}),
			"available"
		);
	});

	test("scopes dismissal to one release", () => {
		assert.equal(
			getReleaseStatus({
				currentReleaseId: "release-a",
				latestReleaseId: "release-b",
				dismissedReleaseId: "release-b",
			}),
			"dismissed"
		);
		assert.equal(
			getReleaseStatus({
				currentReleaseId: "release-a",
				latestReleaseId: "release-c",
				dismissedReleaseId: "release-b",
			}),
			"available"
		);
	});
});

describe("shouldCheckForRelease", () => {
	const baseInput = {
		now: 120_000,
		lastCheckedAt: 60_000,
		minimumIntervalMs: 60_000,
		isOnline: true,
		isVisible: true,
	};

	test("checks at the scheduling boundary", () => {
		assert.equal(shouldCheckForRelease(baseInput), true);
		assert.equal(
			shouldCheckForRelease({ ...baseInput, lastCheckedAt: 60_001 }),
			false
		);
	});

	test("waits while offline or hidden", () => {
		assert.equal(
			shouldCheckForRelease({ ...baseInput, isOnline: false }),
			false
		);
		assert.equal(
			shouldCheckForRelease({ ...baseInput, isVisible: false }),
			false
		);
	});

	test("retries when no valid successful check exists", () => {
		assert.equal(
			shouldCheckForRelease({ ...baseInput, lastCheckedAt: null }),
			true
		);
		assert.equal(
			shouldCheckForRelease({ ...baseInput, lastCheckedAt: Number.NaN }),
			true
		);
		assert.equal(
			shouldCheckForRelease({ ...baseInput, lastCheckedAt: 180_000 }),
			true
		);
	});
});

describe("parseStoredReleaseCheck", () => {
	test("accepts valid shared check results", () => {
		assert.deepEqual(
			parseStoredReleaseCheck(
				JSON.stringify({ releaseId: "release-b", checkedAt: 123 })
			),
			{ releaseId: "release-b", checkedAt: 123 }
		);
	});

	test("rejects missing and malformed check results", () => {
		assert.equal(parseStoredReleaseCheck(null), null);
		assert.equal(parseStoredReleaseCheck("not json"), null);
		assert.equal(
			parseStoredReleaseCheck(JSON.stringify({ releaseId: "", checkedAt: 123 })),
			null
		);
	});
});

describe("getActiveDismissedReleaseId", () => {
	const dismissal = JSON.stringify({
		releaseId: "release-b",
		dismissedAt: 1_000,
	});

	test("returns a release while its reminder window is active", () => {
		assert.equal(
			getActiveDismissedReleaseId({
				value: dismissal,
				now: 1_999,
				maximumAgeMs: 1_000,
			}),
			"release-b"
		);
	});

	test("expires a dismissal at the reminder boundary", () => {
		assert.equal(
			getActiveDismissedReleaseId({
				value: dismissal,
				now: 2_000,
				maximumAgeMs: 1_000,
			}),
			null
		);
	});

	test("rejects malformed and future dismissals", () => {
		assert.equal(
			getActiveDismissedReleaseId({
				value: "not json",
				now: 1_500,
				maximumAgeMs: 1_000,
			}),
			null
		);
		assert.equal(
			getActiveDismissedReleaseId({
				value: dismissal,
				now: 999,
				maximumAgeMs: 1_000,
			}),
			null
		);
	});
});
