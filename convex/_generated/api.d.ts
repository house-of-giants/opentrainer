/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_aggregators from "../ai/aggregators.js";
import type * as ai_equipmentParser from "../ai/equipmentParser.js";
import type * as ai_gemini from "../ai/gemini.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_smartSwap from "../ai/smartSwap.js";
import type * as ai_swapMutations from "../ai/swapMutations.js";
import type * as ai_trainingLab from "../ai/trainingLab.js";
import type * as ai_trainingLabMutations from "../ai/trainingLabMutations.js";
import type * as ai_trainingLabTypes from "../ai/trainingLabTypes.js";
import type * as auth from "../auth.js";
import type * as entries from "../entries.js";
import type * as exercises from "../exercises.js";
import type * as feedback from "../feedback.js";
import type * as http from "../http.js";
import type * as lib_equipment from "../lib/equipment.js";
import type * as routines from "../routines.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/aggregators": typeof ai_aggregators;
  "ai/equipmentParser": typeof ai_equipmentParser;
  "ai/gemini": typeof ai_gemini;
  "ai/prompts": typeof ai_prompts;
  "ai/smartSwap": typeof ai_smartSwap;
  "ai/swapMutations": typeof ai_swapMutations;
  "ai/trainingLab": typeof ai_trainingLab;
  "ai/trainingLabMutations": typeof ai_trainingLabMutations;
  "ai/trainingLabTypes": typeof ai_trainingLabTypes;
  auth: typeof auth;
  entries: typeof entries;
  exercises: typeof exercises;
  feedback: typeof feedback;
  http: typeof http;
  "lib/equipment": typeof lib_equipment;
  routines: typeof routines;
  users: typeof users;
  webhooks: typeof webhooks;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
