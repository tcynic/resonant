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
import type * as langextract_actions from "../langextract_actions.js";
import type * as langextract_mutations from "../langextract_mutations.js";
import type * as migrations_001_enhance_aianalysis_metadata from "../migrations/001_enhance_aianalysis_metadata.js";
import type * as migrations_002_gradual_schema_rollout from "../migrations/002_gradual_schema_rollout.js";
import type * as migrations_legacy_cleanup_v7 from "../migrations/legacy_cleanup_v7.js";
import type * as migrations_monitoring_schema_v6 from "../migrations/monitoring_schema_v6.js";
import type * as monitoring_alerting_system from "../monitoring/alerting_system.js";
import type * as monitoring_cost_monitoring from "../monitoring/cost_monitoring.js";
import type * as monitoring_dashboard_queries from "../monitoring/dashboard_queries.js";
import type * as monitoring_failure_detection from "../monitoring/failure_detection.js";
import type * as monitoring_health_checks from "../monitoring/health_checks.js";
import type * as monitoring_langextract_metrics from "../monitoring/langextract_metrics.js";
import type * as monitoring_success_rate_tracking from "../monitoring/success_rate_tracking.js";
import type * as notifications from "../notifications.js";
import type * as recovery_orchestration from "../recovery_orchestration.js";
import type * as relationships from "../relationships.js";
import type * as scheduler_analysis_queue from "../scheduler/analysis_queue.js";
import type * as scheduler_failure_detection_scheduler from "../scheduler/failure_detection_scheduler.js";
import type * as scheduler_queue_config from "../scheduler/queue_config.js";
import type * as scheduler_queue_maintenance from "../scheduler/queue_maintenance.js";
import type * as scheduler_queue_metrics from "../scheduler/queue_metrics.js";
import type * as scheduler_queue_overflow from "../scheduler/queue_overflow.js";
import type * as scheduler from "../scheduler.js";
import type * as schema_ai_analysis from "../schema/ai_analysis.js";
import type * as schema_langextract_types from "../schema/langextract_types.js";
import type * as schema_monitoring from "../schema/monitoring.js";
import type * as schema_user_preferences from "../schema/user_preferences.js";
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
import type * as utils_performance_monitor from "../utils/performance_monitor.js";
import type * as utils_priority_assessment from "../utils/priority_assessment.js";
import type * as utils_queue_utils from "../utils/queue_utils.js";
import type * as utils_reminder_logic from "../utils/reminder_logic.js";
import type * as utils_retry_strategy from "../utils/retry_strategy.js";
import type * as utils_schema_helpers from "../utils/schema_helpers.js";
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
  langextract_actions: typeof langextract_actions;
  langextract_mutations: typeof langextract_mutations;
  "migrations/001_enhance_aianalysis_metadata": typeof migrations_001_enhance_aianalysis_metadata;
  "migrations/002_gradual_schema_rollout": typeof migrations_002_gradual_schema_rollout;
  "migrations/legacy_cleanup_v7": typeof migrations_legacy_cleanup_v7;
  "migrations/monitoring_schema_v6": typeof migrations_monitoring_schema_v6;
  "monitoring/alerting_system": typeof monitoring_alerting_system;
  "monitoring/cost_monitoring": typeof monitoring_cost_monitoring;
  "monitoring/dashboard_queries": typeof monitoring_dashboard_queries;
  "monitoring/failure_detection": typeof monitoring_failure_detection;
  "monitoring/health_checks": typeof monitoring_health_checks;
  "monitoring/langextract_metrics": typeof monitoring_langextract_metrics;
  "monitoring/success_rate_tracking": typeof monitoring_success_rate_tracking;
  notifications: typeof notifications;
  recovery_orchestration: typeof recovery_orchestration;
  relationships: typeof relationships;
  "scheduler/analysis_queue": typeof scheduler_analysis_queue;
  "scheduler/failure_detection_scheduler": typeof scheduler_failure_detection_scheduler;
  "scheduler/queue_config": typeof scheduler_queue_config;
  "scheduler/queue_maintenance": typeof scheduler_queue_maintenance;
  "scheduler/queue_metrics": typeof scheduler_queue_metrics;
  "scheduler/queue_overflow": typeof scheduler_queue_overflow;
  scheduler: typeof scheduler;
  "schema/ai_analysis": typeof schema_ai_analysis;
  "schema/langextract_types": typeof schema_langextract_types;
  "schema/monitoring": typeof schema_monitoring;
  "schema/user_preferences": typeof schema_user_preferences;
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
  "utils/performance_monitor": typeof utils_performance_monitor;
  "utils/priority_assessment": typeof utils_priority_assessment;
  "utils/queue_utils": typeof utils_queue_utils;
  "utils/reminder_logic": typeof utils_reminder_logic;
  "utils/retry_strategy": typeof utils_retry_strategy;
  "utils/schema_helpers": typeof utils_schema_helpers;
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
