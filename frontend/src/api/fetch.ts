import * as E from "fp-ts/Either";
import * as D from "io-ts/Decoder";

import {
  EndpointError,
  UnauthorizedError,
} from "./errors";

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
 * @typeParam R - The type which the response will be decoded into.
 */
interface FetchOpts<R> {
  /**
   * HTTP method for request.
   */
  method: "POST" | "GET" | "PUT" | "DELETE",

  /**
   * API endpoint to call.
   */
  path: string,

  /**
   * An io-ts decoder used to parse the API response into a type.
   */
  respDecoder: D.Decoder<unknown, R>,

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
 * @typeParam R - The type which the response will be decoded into.
 * @returns Always resolves with an Either type where left is an error and right is the decoded response. A reject here indicates a fatal error the logic did not anticipate. The left error will either:
 * - Error: If an error occurs while making the API request.
 * - EndpointError: If the API returned an error response.
 */
 export async function apiFetch<R>(opts: FetchOpts<R>): Promise<E.Either<FetchError, R>> {
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

  // Make request
  let resp = undefined;
  try {
    resp = await fetch(opts.path, fetchOpts);

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
    (e: D.DecodeError) => E.left(new Error(`failed to decode response: ${e}`)),
    (r: R) => E.right(r),
  )(opts.respDecoder.decode(resp.json()));
}
