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
import type * as _generated_stubs_api from "../_generated_stubs/api.js";
import type * as _generated_stubs_server from "../_generated_stubs/server.js";
import type * as aiAnalysis from "../aiAnalysis.js";
import type * as ai_processing from "../ai_processing.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as dataExport from "../dataExport.js";
import type * as healthScores from "../healthScores.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as journalEntries from "../journalEntries.js";
import type * as notifications from "../notifications.js";
import type * as relationships from "../relationships.js";
import type * as scheduler_analysis_queue from "../scheduler/analysis-queue.js";
import type * as scheduler_queue_config from "../scheduler/queue-config.js";
import type * as scheduler_queue_metrics from "../scheduler/queue-metrics.js";
import type * as scheduler_queue_overflow from "../scheduler/queue-overflow.js";
import type * as search from "../search.js";
import type * as test_testDataManager from "../test/testDataManager.js";
import type * as userPatterns from "../userPatterns.js";
import type * as users from "../users.js";
import type * as utils_ai_bridge from "../utils/ai_bridge.js";
import type * as utils_ai_config from "../utils/ai_config.js";
import type * as utils_ai_helpers from "../utils/ai_helpers.js";
import type * as utils_ai_validation from "../utils/ai_validation.js";
import type * as utils_export_helpers from "../utils/export_helpers.js";
import type * as utils_health_calculations from "../utils/health_calculations.js";
import type * as utils_notification_content from "../utils/notification_content.js";
import type * as utils_priority_assessment from "../utils/priority-assessment.js";
import type * as utils_queue_utils from "../utils/queue-utils.js";
import type * as utils_reminder_logic from "../utils/reminder_logic.js";
import type * as utils_search_helpers from "../utils/search_helpers.js";
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
  "_generated_stubs/api": typeof _generated_stubs_api;
  "_generated_stubs/server": typeof _generated_stubs_server;
  aiAnalysis: typeof aiAnalysis;
  ai_processing: typeof ai_processing;
  constants: typeof constants;
  crons: typeof crons;
  dashboard: typeof dashboard;
  dataExport: typeof dataExport;
  healthScores: typeof healthScores;
  http: typeof http;
  insights: typeof insights;
  journalEntries: typeof journalEntries;
  notifications: typeof notifications;
  relationships: typeof relationships;
  "scheduler/analysis-queue": typeof scheduler_analysis_queue;
  "scheduler/queue-config": typeof scheduler_queue_config;
  "scheduler/queue-metrics": typeof scheduler_queue_metrics;
  "scheduler/queue-overflow": typeof scheduler_queue_overflow;
  search: typeof search;
  "test/testDataManager": typeof test_testDataManager;
  userPatterns: typeof userPatterns;
  users: typeof users;
  "utils/ai_bridge": typeof utils_ai_bridge;
  "utils/ai_config": typeof utils_ai_config;
  "utils/ai_helpers": typeof utils_ai_helpers;
  "utils/ai_validation": typeof utils_ai_validation;
  "utils/export_helpers": typeof utils_export_helpers;
  "utils/health_calculations": typeof utils_health_calculations;
  "utils/notification_content": typeof utils_notification_content;
  "utils/priority-assessment": typeof utils_priority_assessment;
  "utils/queue-utils": typeof utils_queue_utils;
  "utils/reminder_logic": typeof utils_reminder_logic;
  "utils/search_helpers": typeof utils_search_helpers;
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
