/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex query and mutation functions.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import {
  ActionBuilder,
  MutationBuilder,
  QueryBuilder,
  DatabaseReader,
  DatabaseWriter,
} from "convex/server";

/**
 * Define a query in this Convex app's public API.
 *
 * This function will be allowed to read your Convex database and will be accessible from the client.
 *
 * @param func - The query function. It receives a `DatabaseReader` as the first argument.
 * @returns The wrapped query. Include this as an `export` to add it to your app's API.
 */
export declare const query: QueryBuilder<DatabaseReader, "public">;

/**
 * Define a query that is only accessible from other Convex functions (but not from the client).
 *
 * This function will be allowed to read from your Convex database. It will not be accessible from the client.
 *
 * @param func - The query function. It receives a `DatabaseReader` as the first argument.
 * @returns The wrapped query. Include this as an `export` to add it to your app's API.
 */
export declare const internalQuery: QueryBuilder<DatabaseReader, "internal">;

/**
 * Define a mutation in this Convex app's public API.
 *
 * This function will be allowed to modify your Convex database and will be accessible from the client.
 *
 * @param func - The mutation function. It receives a `DatabaseWriter` as the first argument.
 * @returns The wrapped mutation. Include this as an `export` to add it to your app's API.
 */
export declare const mutation: MutationBuilder<DatabaseWriter, "public">;

/**
 * Define a mutation that is only accessible from other Convex functions (but not from the client).
 *
 * This function will be allowed to modify your Convex database. It will not be accessible from the client.
 *
 * @param func - The mutation function. It receives a `DatabaseWriter` as the first argument.
 * @returns The wrapped mutation. Include this as an `export` to add it to your app's API.
 */
export declare const internalMutation: MutationBuilder<
  DatabaseWriter,
  "internal"
>;

/**
 * Define an action in this Convex app's public API.
 *
 * An action is a function which can execute any JavaScript code, including non-deterministic
 * code and code with side-effects, like calling third-party services.
 * They can be run in Node.js environment and are not subject to the restrictions of query and mutation functions.
 * Actions can read from and write to the database by calling queries and mutations using the provided `ctx.runQuery` and `ctx.runMutation` functions.
 *
 * @param func - The action function.
 * @returns The wrapped action. Include this as an `export` to add it to your app's API.
 */
export declare const action: ActionBuilder<"public">;

/**
 * Define an action that is only accessible from other Convex functions (but not from the client).
 *
 * @param func - The action function.
 * @returns The wrapped action.
 */
export declare const internalAction: ActionBuilder<"internal">;