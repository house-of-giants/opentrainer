import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { mock } from "bun:test";
import { getFunctionName } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";

type PaginatedState = {
  results: unknown[];
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
};

let paginated: PaginatedState;
const paginatedCalls: unknown[][] = [];

mock.module("convex/react", () => ({
  usePaginatedQuery: (...args: unknown[]) => {
    paginatedCalls.push(args);
    return { ...paginated, isLoading: paginated.status.startsWith("Loading"), loadMore: () => {} };
  },
  useQuery: () => undefined,
  useMutation: () => async () => undefined,
}));
mock.module("next/navigation", () => ({
  usePathname: () => "/history",
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
}));

const { default: HistoryPage } = await import("./page");

const pullDay = {
  _id: "workout_2",
  title: "Pull Day",
  status: "completed",
  startedAt: new Date("2026-08-10T17:00:00Z").getTime(),
  summary: { totalDurationMinutes: 75, totalSets: 21, exerciseCount: 6 },
};
// Sits on a second page, more than 100 workouts back in a long import.
const legDay = {
  _id: "workout_0",
  title: "Leg Day",
  status: "completed",
  startedAt: new Date("2025-06-02T17:00:00Z").getTime(),
  summary: { totalDurationMinutes: 60, totalSets: 18, exerciseCount: 5 },
};

function loadMoreButton(html: string) {
  return html.match(/<button[^>]*>(Load older workouts|Loading older workouts)<\/button>/);
}

beforeEach(() => {
  paginatedCalls.length = 0;
});

describe("History page pagination", () => {
  test("reads completed workouts through the paginated query, 50 at a time", () => {
    paginated = { results: [pullDay], status: "CanLoadMore" };
    renderToStaticMarkup(<HistoryPage />);

    const [ref, args, options] = paginatedCalls[0];
    assert.equal(getFunctionName(ref as never), "workouts:getWorkoutHistoryPage");
    assert.deepEqual(args, { status: "completed" });
    assert.deepEqual(options, { initialNumItems: 50 });
  });

  test("offers older workouts at the end of the list while more pages exist", () => {
    paginated = { results: [pullDay], status: "CanLoadMore" };
    const html = renderToStaticMarkup(<HistoryPage />);

    const button = loadMoreButton(html);
    assert.ok(button, "Load older workouts button missing");
    assert.equal(button[1], "Load older workouts");
    assert.doesNotMatch(button[0], / disabled=""/);
    assert.ok(html.indexOf("Pull Day") < html.indexOf("Load older workouts"));
  });

  test("disables the button while the next page loads", () => {
    paginated = { results: [pullDay], status: "LoadingMore" };
    const html = renderToStaticMarkup(<HistoryPage />);

    const button = loadMoreButton(html);
    assert.ok(button, "loading button missing");
    assert.equal(button[1], "Loading older workouts");
    assert.match(button[0], / disabled=""/);
  });

  test("groups workouts from every loaded page by month and drops the button at the end", () => {
    paginated = { results: [pullDay, legDay], status: "Exhausted" };
    const html = renderToStaticMarkup(<HistoryPage />);

    assert.equal(loadMoreButton(html), null);
    const months = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map(([, label]) => label);
    assert.deepEqual(months, ["August 2026", "June 2025"]);
    assert.ok(html.indexOf("Pull Day") < html.indexOf("Leg Day"));
  });

  test("shows the empty state only when there is nothing left to load", () => {
    paginated = { results: [], status: "Exhausted" };
    assert.match(renderToStaticMarkup(<HistoryPage />), /No workouts yet/);

    paginated = { results: [], status: "LoadingFirstPage" };
    assert.doesNotMatch(renderToStaticMarkup(<HistoryPage />), /No workouts yet/);
  });
});
