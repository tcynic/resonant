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
import type * as circuit_breaker_queries from "../circuit_breaker_queries.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as dataExport from "../dataExport.js";
import type * as error_monitoring from "../error_monitoring.js";
import type * as fallback_analytics from "../fallback/analytics.js";
import type * as fallback_comparison from "../fallback/comparison.js";
import type * as fallback_integration from "../fallback/integration.js";
import type * as fallback_pattern_matching from "../fallback/pattern_matching.js";
import type * as fallback_sentiment_analysis from "../fallback/sentiment_analysis.js";
import type * as healthScores from "../healthScores.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as journalEntries from "../journalEntries.js";
import type * as notifications from "../notifications.js";
import type * as recovery_orchestration from "../recovery_orchestration.js";
import type * as relationships from "../relationships.js";
import type * as scheduler_analysis_queue from "../scheduler/analysis_queue.js";
import type * as scheduler_queue_config from "../scheduler/queue_config.js";
import type * as scheduler_queue_maintenance from "../scheduler/queue_maintenance.js";
import type * as scheduler_queue_metrics from "../scheduler/queue_metrics.js";
import type * as scheduler_queue_overflow from "../scheduler/queue_overflow.js";
import type * as scheduler from "../scheduler.js";
import type * as search from "../search.js";
import type * as service_recovery from "../service_recovery.js";
import type * as test_testDataManager from "../test/testDataManager.js";
import type * as userPatterns from "../userPatterns.js";
import type * as users from "../users.js";
import type * as utils_ai_bridge from "../utils/ai_bridge.js";
import type * as utils_ai_config from "../utils/ai_config.js";
import type * as utils_ai_helpers from "../utils/ai_helpers.js";
import type * as utils_ai_validation from "../utils/ai_validation.js";
import type * as utils_circuit_breaker from "../utils/circuit_breaker.js";
import type * as utils_error_logger from "../utils/error_logger.js";
import type * as utils_export_helpers from "../utils/export_helpers.js";
import type * as utils_health_calculations from "../utils/health_calculations.js";
import type * as utils_notification_content from "../utils/notification_content.js";
import type * as utils_priority_assessment from "../utils/priority_assessment.js";
import type * as utils_queue_utils from "../utils/queue_utils.js";
import type * as utils_reminder_logic from "../utils/reminder_logic.js";
import type * as utils_retry_strategy from "../utils/retry_strategy.js";
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
  circuit_breaker_queries: typeof circuit_breaker_queries;
  constants: typeof constants;
  crons: typeof crons;
  dashboard: typeof dashboard;
  dataExport: typeof dataExport;
  error_monitoring: typeof error_monitoring;
  "fallback/analytics": typeof fallback_analytics;
  "fallback/comparison": typeof fallback_comparison;
  "fallback/integration": typeof fallback_integration;
  "fallback/pattern_matching": typeof fallback_pattern_matching;
  "fallback/sentiment_analysis": typeof fallback_sentiment_analysis;
  healthScores: typeof healthScores;
  http: typeof http;
  insights: typeof insights;
  journalEntries: typeof journalEntries;
  notifications: typeof notifications;
  recovery_orchestration: typeof recovery_orchestration;
  relationships: typeof relationships;
  "scheduler/analysis_queue": typeof scheduler_analysis_queue;
  "scheduler/queue_config": typeof scheduler_queue_config;
  "scheduler/queue_maintenance": typeof scheduler_queue_maintenance;
  "scheduler/queue_metrics": typeof scheduler_queue_metrics;
  "scheduler/queue_overflow": typeof scheduler_queue_overflow;
  scheduler: typeof scheduler;
  search: typeof search;
  service_recovery: typeof service_recovery;
  "test/testDataManager": typeof test_testDataManager;
  userPatterns: typeof userPatterns;
  users: typeof users;
  "utils/ai_bridge": typeof utils_ai_bridge;
  "utils/ai_config": typeof utils_ai_config;
  "utils/ai_helpers": typeof utils_ai_helpers;
  "utils/ai_validation": typeof utils_ai_validation;
  "utils/circuit_breaker": typeof utils_circuit_breaker;
  "utils/error_logger": typeof utils_error_logger;
  "utils/export_helpers": typeof utils_export_helpers;
  "utils/health_calculations": typeof utils_health_calculations;
  "utils/notification_content": typeof utils_notification_content;
  "utils/priority_assessment": typeof utils_priority_assessment;
  "utils/queue_utils": typeof utils_queue_utils;
  "utils/reminder_logic": typeof utils_reminder_logic;
  "utils/retry_strategy": typeof utils_retry_strategy;
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
