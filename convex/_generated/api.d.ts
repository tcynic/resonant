/**
 * Build-time stub for Convex API types
 * 
 * This provides minimal types for Vercel builds.
 * Gets replaced with actual generated content during development.
 */

import type { FunctionReference } from "convex/server";

// Generic function references for build compatibility
type GenericQueryRef = FunctionReference<"query", "public", any, any>;
type GenericMutationRef = FunctionReference<"mutation", "public", any, any>;

// Stub API that matches the structure used in the app
export declare const api: {
  aiAnalysis: { [key: string]: GenericQueryRef | GenericMutationRef };
  dashboard: { [key: string]: GenericQueryRef };
  healthScores: { [key: string]: GenericQueryRef | GenericMutationRef };
  journalEntries: { [key: string]: GenericQueryRef | GenericMutationRef };
  relationships: { [key: string]: GenericQueryRef | GenericMutationRef };
  users: { [key: string]: GenericQueryRef | GenericMutationRef };
  test: {
    testDataManager: { [key: string]: GenericQueryRef | GenericMutationRef };
  };
};