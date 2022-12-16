import * as E from "fp-ts/Either";
import * as T from "io-ts";

import {
  EndpointError,
  UnauthorizedError,
} from "./errors";
import { getStoredAuthToken } from "./auth";

/**
 * Options which can be used to configure API fetch requests.
 */
interface InternalFetchOpts extends RequestInit {
  bodySensitive?: boolean
}

/**
 * Types of errors which can be returned by the API fetch method.
 */
export type FetchError = Error | EndpointError;

/**
 * Options provided to the apiFetch method.
 * @typeParam A - Type by which underlying data will be represented
 * @typeParam O - Type in which data will be outputted
 * @typeParam I - Type which will be provided as input
 */
interface FetchOpts<A, O = A, I = unknown> {
  /**
   * HTTP method for request.
   */
  method: "POST" | "GET" | "PUT" | "DELETE",

  /**
   * API endpoint to call.
   */
  path: string,

  /**
   * Query parameters.
   */
  queryParams?: { [key: string]: any },

  /**
   * An io-ts type used to decode the API response into typescript R.
   * Type params for T.Type:
   * - 1st: Typescript type which will be stored in memory
   * - 2nd: Encoded type
   * - 3rd: Input type
   */
  respDecoder: T.Type<A, O, I>,

  /**
   * API request data to encode as JSON. Pass undefined to not encode a body.
   */
  body?: { [key: string]: any },

  /**
   * Additional fetch options. The `method` field will always be overridden by the `method` argument. The `Content-Type` header and request `body` will be overridden if the `body` argument is provided. The __body_sensitive field can be set to true which will cause any error messages not to include the body. The "Authorization" header is censored by default.
   */
  opts?: InternalFetchOpts,
}

/**
 * Make a HTTP API request.
 * @typeParam A - Type by which underlying data will be represented
 * @typeParam O - Type in which data will be outputted
 * @typeParam I - Type which will be provided as input
 * @returns Always resolves with an Either type where left is an error and right is the decoded response. A reject here indicates a fatal error the logic did not anticipate. The left error will either:
 * - Error: If an error occurs while making the API request.
 * - EndpointError: If the API returned an error response.
 */
 export async function apiFetch<A, O = A, I = unknown>(opts: FetchOpts<A, O, I>): Promise<E.Either<FetchError, A>> {
  let fetchOpts: RequestInit = opts.opts || {};

  // Set method
  fetchOpts.method = opts.method;
  
  // Encode body
  if (!fetchOpts.headers) {
    fetchOpts.headers = {};
  }

  if (opts.body !== undefined) {
    fetchOpts.headers["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(opts.body);
  }

  // Set auth if present
  const authToken = getStoredAuthToken();
  if (authToken) {
    fetchOpts.headers["Authorization"] = authToken;
  }

  // Make request
  let resp = undefined;
  try {
    // Query parameters
    let path = opts.path;
    if (opts.queryParams) {
      const filteredOpts = Object.entries(opts.queryParams).filter(entry => entry[1] !== undefined).reduce((acc, entry) => {
        acc[entry[0]] = entry[1];
        return acc;
      }, {});
      path += "?" + new URLSearchParams(filteredOpts);
    }

    // Make requests
    resp = await fetch(path, fetchOpts);

    // Censor body after request is made
    if (opts.opts?.bodySensitive === true) {
      fetchOpts.body = "***censored***";
    }

    if ("Authorization" in fetchOpts.headers && fetchOpts.headers.Authorization.length > 0) {
      fetchOpts.headers.Authorization = "***censored***";
    }
  } catch(e) {
    return E.left(new Error(`failed to make HTTP API request ${JSON.stringify(fetchOpts)}: ${e}`));
  }

  // Ensure success result
  if (resp.status === 401) {
    const respBody = await resp.json();
    
    return E.left(new UnauthorizedError(`options=${JSON.stringify(fetchOpts)}`, respBody.error_code));
  } else if (resp.status !== 200) {
    const respBody = await resp.json();
    
    return E.left(new EndpointError(respBody.error, respBody.error_code));
  }

  // Decode
  return E.match(
    (e: T.Errors) => {
      const fieldErrs = e.map(vErr => {
        const keys = vErr.context.map(ctx => `${ctx.key || "<unknown key>"} (was ${ctx.actual || "<unknown value>"})`).join(", ");
        return `for ${keys}: ${vErr.message}`;
      }).join(", ");
      return E.left(new Error(`failed to decode response: ${fieldErrs}`));
    },
    (r: A) => E.right(r),
  )(opts.respDecoder.decode(await resp.json()));
}
