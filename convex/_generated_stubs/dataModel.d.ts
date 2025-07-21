// Stub data model types for build compatibility when Convex codegen is not available
export type Doc<T extends string> = any
export type Id<T extends string> = string
export interface DataModel {
  [key: string]: any
}
