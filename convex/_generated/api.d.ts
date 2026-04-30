/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as classes from "../classes.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as gyms from "../gyms.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as leads from "../leads.js";
import type * as memberships from "../memberships.js";
import type * as migrations from "../migrations.js";
import type * as notificationQueries from "../notificationQueries.js";
import type * as notifications from "../notifications.js";
import type * as personalRecords from "../personalRecords.js";
import type * as results from "../results.js";
import type * as seed from "../seed.js";
import type * as stripe from "../stripe.js";
import type * as testHelpers from "../testHelpers.js";
import type * as users from "../users.js";
import type * as wods from "../wods.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  appointments: typeof appointments;
  auth: typeof auth;
  bookings: typeof bookings;
  classes: typeof classes;
  crons: typeof crons;
  documents: typeof documents;
  email: typeof email;
  events: typeof events;
  gyms: typeof gyms;
  helpers: typeof helpers;
  http: typeof http;
  invites: typeof invites;
  leads: typeof leads;
  memberships: typeof memberships;
  migrations: typeof migrations;
  notificationQueries: typeof notificationQueries;
  notifications: typeof notifications;
  personalRecords: typeof personalRecords;
  results: typeof results;
  seed: typeof seed;
  stripe: typeof stripe;
  testHelpers: typeof testHelpers;
  users: typeof users;
  wods: typeof wods;
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
