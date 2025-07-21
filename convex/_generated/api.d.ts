/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiAnalysis from "../aiAnalysis.js";
import type * as constants from "../constants.js";
import type * as dashboard from "../dashboard.js";
import type * as healthScores from "../healthScores.js";
import type * as http from "../http.js";
import type * as journalEntries from "../journalEntries.js";
import type * as relationships from "../relationships.js";
import type * as test_testDataManager from "../test/testDataManager.js";
import type * as users from "../users.js";
import type * as utils_ai_helpers from "../utils/ai-helpers.js";
import type * as utils_validation from "../utils/validation.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiAnalysis: typeof aiAnalysis;
  constants: typeof constants;
  dashboard: typeof dashboard;
  healthScores: typeof healthScores;
  http: typeof http;
  journalEntries: typeof journalEntries;
  relationships: typeof relationships;
  "test/testDataManager": typeof test_testDataManager;
  users: typeof users;
  "utils/ai-helpers": typeof utils_ai_helpers;
  "utils/validation": typeof utils_validation;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
