import { Request } from "express";
import * as t from "io-ts";
import { isRight } from "fp-ts/Either";
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
