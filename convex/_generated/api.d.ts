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
import type * as llm_service from "../llm_service.js";
import type * as math_engine from "../math_engine.js";
import type * as migrations from "../migrations.js";
import type * as problems from "../problems.js";
import type * as validation from "../validation.js";
import type * as validation_engine from "../validation_engine.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  llm_service: typeof llm_service;
  math_engine: typeof math_engine;
  migrations: typeof migrations;
  problems: typeof problems;
  validation: typeof validation;
  validation_engine: typeof validation_engine;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
