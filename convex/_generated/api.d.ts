/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_challenge from "../ai/challenge.js";
import type * as ai_correct from "../ai/correct.js";
import type * as ai_embeddings from "../ai/embeddings.js";
import type * as ai_extract from "../ai/extract.js";
import type * as auth from "../auth.js";
import type * as challengeHelpers from "../challengeHelpers.js";
import type * as concepts from "../concepts.js";
import type * as crons from "../crons.js";
import type * as embeddingsMutations from "../embeddingsMutations.js";
import type * as entries from "../entries.js";
import type * as http from "../http.js";
import type * as lib_prompts from "../lib/prompts.js";
import type * as lib_utils from "../lib/utils.js";
import type * as review from "../review.js";
import type * as search from "../search.js";
import type * as searchHelpers from "../searchHelpers.js";
import type * as stats from "../stats.js";
import type * as streakManager from "../streakManager.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/challenge": typeof ai_challenge;
  "ai/correct": typeof ai_correct;
  "ai/embeddings": typeof ai_embeddings;
  "ai/extract": typeof ai_extract;
  auth: typeof auth;
  challengeHelpers: typeof challengeHelpers;
  concepts: typeof concepts;
  crons: typeof crons;
  embeddingsMutations: typeof embeddingsMutations;
  entries: typeof entries;
  http: typeof http;
  "lib/prompts": typeof lib_prompts;
  "lib/utils": typeof lib_utils;
  review: typeof review;
  search: typeof search;
  searchHelpers: typeof searchHelpers;
  stats: typeof stats;
  streakManager: typeof streakManager;
  users: typeof users;
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
