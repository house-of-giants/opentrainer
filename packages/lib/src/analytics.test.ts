import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createProgressionSuggestionTracker,
  internalAccountProperties,
} from "./analytics";

describe("internalAccountProperties", () => {
  test("marks addresses on the internal domain, in any case and with spaces", () => {
    assert.deepEqual(internalAccountProperties("tester@houseofgiants.com"), {
      is_internal: true,
    });
    assert.deepEqual(internalAccountProperties("  QA@HouseOfGiants.COM "), {
      is_internal: true,
    });
  });

  test("does not mark look-alike domains, subdomains, or other addresses", () => {
    for (const email of [
      "someone@gmail.com",
      "someone@nothouseofgiants.com",
      "someone@mail.houseofgiants.com",
      "someone@houseofgiants.com.evil.io",
      "houseofgiants.com",
      "@houseofgiants.com",
    ]) {
      assert.deepEqual(internalAccountProperties(email), { is_internal: false }, email);
    }
  });

  test("treats a missing email as external", () => {
    assert.deepEqual(internalAccountProperties(undefined), { is_internal: false });
    assert.deepEqual(internalAccountProperties(null), { is_internal: false });
  });
});

describe("createProgressionSuggestionTracker", () => {
  function setup() {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const tracker = createProgressionSuggestionTracker((event, properties) => {
      calls.push([event, properties]);
    });
    return { calls, tracker };
  }

  const suggestion = { type: "increase_weight" as const, targetWeight: 102.5, unit: "kg" as const };

  test("sends the shown event once, however often the suggestion renders", () => {
    const { calls, tracker } = setup();

    tracker.markShown(suggestion);
    tracker.markShown(suggestion);
    tracker.markShown({ ...suggestion, targetWeight: 105 });

    assert.deepEqual(calls, [
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
    ]);
  });

  test("sends accepted once, on the first set at the suggested weight", () => {
    const { calls, tracker } = setup();
    tracker.markShown(suggestion);

    tracker.markSetLogged({ weight: 60, unit: "kg" }); // warm-up
    tracker.markSetLogged({ weight: 102.5, unit: "kg" });
    tracker.markSetLogged({ weight: 102.5, unit: "kg" });

    assert.deepEqual(calls, [
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
      ["progression_suggestion_accepted", { suggestion_type: "increase_weight" }],
    ]);
  });

  test("does not accept a different weight, a different unit, or an unshown suggestion", () => {
    const unshown = setup();
    unshown.tracker.markSetLogged({ weight: 102.5, unit: "kg" });
    assert.deepEqual(unshown.calls, []);

    const { calls, tracker } = setup();
    tracker.markShown(suggestion);
    tracker.markSetLogged({ weight: 100, unit: "kg" });
    tracker.markSetLogged({ weight: 102.5, unit: "lb" });

    assert.deepEqual(calls, [
      ["progression_suggestion_shown", { suggestion_type: "increase_weight" }],
    ]);
  });

  test("compares against the suggestion that was shown, not a later one", () => {
    const { calls, tracker } = setup();
    tracker.markShown(suggestion);
    tracker.markShown({ type: "hold", targetWeight: 100, unit: "kg" });

    tracker.markSetLogged({ weight: 100, unit: "kg" });
    assert.equal(calls.length, 1);

    tracker.markSetLogged({ weight: 102.5, unit: "kg" });
    assert.deepEqual(calls[1], [
      "progression_suggestion_accepted",
      { suggestion_type: "increase_weight" },
    ]);
  });
});
