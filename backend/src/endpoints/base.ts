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
  abstract handle(req: Request, resp: Response): Promise<void>;
}

