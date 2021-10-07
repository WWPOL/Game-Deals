import { Request } from "express";
import * as t from "io-ts";
import {
  isRight,
  isLeft,
} from "fp-ts/Either";
import dReporter from "io-ts-reporters";

import { Optional } from "../lib/optional";
import { MkEndpointError } from "./error";
import { User } from "../models/user";

/**
 * @typeParam I - Body type.
 */
export interface BodyParser<I> {
  /**
   * @param req - Express request.
   * @returns Parsed body.
   */
  parse(req: Request): I;
}

/**
 * BodyParser for a void body.
 */
export const VoidParser = {
  parse: (req: Request) => void {
  }
};

/**
 * BodyParser which validates the data using an io-ts decoder.
 */
export class DecoderParser<I> implements BodyParser<I> {
  /**
   * io-ts decoder.
   */
  decoder: t.Decoder<unknown, I>;

  /**
   * Initialize decoder parser.
   */
  constructor(decoder: t.Decoder<unknown, I>) {
    this.decoder = decoder;
  }

  /**
   * Attempt to parse request body using decoder.
   * @throws Error
   * If the decoded fails to parse the body.
   */
  parse(req: Request): I {
    const decoded = this.decoder.decode(req.body);
    if (isRight(decoded)) {
      return decoded.right;
    }

    throw MkEndpointError({
      error: `Failed to parse request body: ${dReporter.report(decoded).join(", ")}`,
      http_status: 400,
    });
  }
}

/**
 * Represents a request to an endpoint.
 * @typeParam I - Request body type.
 */
export interface EndpointRequest<I> {
  /**
   * The Express request.
   */
  req: Request;

  /**
   * Some with a User if the request included valid authentication information. None if no or invalid authentication information was provided.
   */
  user: Optional<User>;

  /**
   * Parsed request body.
   */
  body(): I;
}

/**
 * Parse request query parameters.
 * @typeParam T - Type of parsed query parameters.
 * @param req - Express request from which to parse query parameters.
 * @param decoder - Defines the shape of the expected query parameters. Be aware that all query parameter values are strings, so to get other types from strings one must use io-ts-types/lib/*FromString decoders (ex., to get an integer use io-ts-types/lib/IntFromString).
 * @param listKeys - An array of query parameter key names which are expected to be lists. This will tell the function to try and make them lists before decoding.
 * @returns Parsed query parameter values. The values of each query parameter list item cannot contain commas.
 * @throws {@link error#EndpointError}
 * If the query parameters do not match the required shape.
 */
export function decodeQueryParams<T>({
  req,
  decoder,
}: {
  readonly req: EndpointRequest<any>;
  readonly decoder: t.Decoder<unknown, T>;
}): T {
  // Try to parse query parameters to lists if need be
  const queryParams = decodeQueryParamsLists(req.req.query, decoder);

  // Decode
  const decoded = decoder.decode(queryParams);

  if (isRight(decoded)) {
    return decoded.right;
  }

  throw MkEndpointError({
    http_status: 400,
    error: `invalid query parameters: ${dReporter.report(decoded).join(", ")}`,
  });
}

/**
 * Using the type hints from the decoder this function tries to make appropriate query parameter keys into lists.
 */
function decodeQueryParamsLists(queryParams: { [key: string]: any }, decoder: any): { [key: string]: any } {
  // If the decoder is not for an interface (aka object) then there's nothing this function can do
  if (decoder._tag !== "InterfaceType") {
    return queryParams;
  }
  
  return Object.fromEntries(Object.keys(queryParams).map((key) => {
    // If there is no field in the decoder for this query param then ignore
    if (!Object.keys(decoder.props).includes(key)) {
      return [key, queryParams[key]];
    }

    // If not an array then ignore
    const propDecoder = decoder.props[key];

    if (propDecoder._tag !== "ArrayType") {
      return [key, queryParams[key]];
    }

    return [key, queryParams[key].split(",")];
  }));
}
