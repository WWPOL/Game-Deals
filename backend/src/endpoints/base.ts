import { Request, Response } from "express";

import { Config } from "~/config";

/**
 * Data required to setup an endpoint handler.
 */
export type EndpointCtx = {
  cfg: Config;
}

/**
 * The HTTP method which will be handled by the endpoint.
 */
export type HTTPMethod = "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

/**
 * Call an EndpointHandler handle method from a standard Express endpoint handler.
 * @param handler - The Endpoint handler.
 * @returns Standard express event handler which will call the endpoint handler.
 */
export function wrapHandler(handler: EndpointHandler): (req: Request, resp: Response) => Promise<void> {
  return async (req: Request, resp: Response): Promise<void> => {
    const epResp = await handler.handle(req, resp);
    await epResp.respond(resp);
  };
}

/**
 * Sends a response to the client.
 */
export interface EndpointResponder {
  /**
   * Performs the action of responding to the request.
   */
  respond(resp: Response): Promise<void>;
}

/**
 * Responds with JSON.
 * @typeParam T - Type of JSON response.
 */
export class JSONResponder<T> implements EndpointResponder {
  /**
   * HTTP status code.
   */
  status: number;

  /**
   * JSON response data.
   */
  data: T;

  /**
   * Initialize a JSON responder.
   * @param status - Status code.
   * @param data - Response data.
   */
  constructor(status: number, data: T) {
    this.status = status;
    this.data = data;
  }

  /**
   * Set the response HTTP status code and send the JSON body.
   */
  async respond(resp: Response): Promise<void> {
    resp.status(this.status).json(this.data);
  }
}

/**
 * Defines logic to run when an HTTP request is received.
 */
export abstract class EndpointHandler {
  /**
   * Configuration for server.
   */
  cfg: Config;

  /**
   * Initializes an endpoint handler.
   */
  constructor(ctx: EndpointCtx) {
    this.cfg = ctx.cfg;
  }

  /**
   * @returns HTTP method for which to handle HTTP requests.
   */
  abstract method(): HTTPMethod;

  /**
   * @returns HTTP path of HTTP requests to handler.
   */
  abstract path(): string;

  /**
   * Run request processing logic.
   * @param req - Express HTTP request
   * @param resp - Express HTTP response
   */
  abstract handle(req: Request, resp: Response): Promise<EndpointResponder>;
}

