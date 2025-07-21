/**
 * Build-time stub for Convex DataModel
 * 
 * This provides minimal types for Vercel builds.
 * Gets replaced with actual generated content during development.
 */

import type { GenericId } from "convex/values";

// Generic document type for build compatibility
type GenericDoc = {
  _id: GenericId<string>;
  _creationTime: number;
  [key: string]: any;
};

// Stub DataModel with basic tables
export type DataModel = {
  users: GenericDoc;
  relationships: GenericDoc;
  journalEntries: GenericDoc;
  healthScores: GenericDoc;
  aiAnalysis: GenericDoc;
};

// Re-export common types for compatibility
export type Doc<TableName extends keyof DataModel> = DataModel[TableName];
export type Id<TableName extends keyof DataModel> = GenericId<TableName>;