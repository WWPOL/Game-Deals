import { Request, Response } from "express";
import {
  Connection as DBConnection,
} from "typeorm";
import { Config } from "~/config";
import {
  BodyParser,
  EndpointRequest,
} from "./request";
import {
  EndpointResponder,
  ErrorResponder,
} from "./response";
 
/**
 * Data required to setup an endpoint handler.
 */
export type EndpointCtx = {
  /**
   * Backend configuration.
   */
  cfg: Config;

  /**
   * @returns Database connection.
   */
  db: () => Promise<DBConnection>;
}

/**
 * The HTTP method which will be handled by the endpoint.
 */
export type HTTPMethod = "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

/**
 * Call an EndpointHandler handle method from a standard Express endpoint handler.
 * @typeParam I - Request body type.
 * @param handler - The Endpoint handler.
 * @returns Standard express event handler which will call the endpoint handler.
 */
export function wrapHandler<I>(handler: EndpointHandler<I>): (req: Request, resp: Response) => Promise<void> {
  return async (req: Request, resp: Response): Promise<void> => {
    // Build request
    const epReq = {
      req: req,
      body: (): I => {
        const bodyParser = handler.bodyParser();
        return bodyParser.parse(req);
      },
    };

    // Handle
    const epResp = await (async function(): Promise<EndpointResponder> {
      try {
        return await handler.handle(epReq);
      } catch (e) {
        return new ErrorResponder(e);
      }
    })();

    // Respond
    await epResp.respond(resp);
  };
}

export class BaseEndpoint {
  /**
   * Endpoint context
   */
  cfg: Config;

  /**
   * Initializes an endpoint handler.
   */
  constructor(ctx: EndpointCtx) {
    this.cfg = ctx.cfg;
  }
}

/**
 * Defines logic to run when an HTTP request is received.
 * @typeParam I - Request body data type.
 */
export interface EndpointHandler<I> {
  /**
   * Generate body parser.
   */
  bodyParser(): BodyParser<I>;
  
  /**
   * @returns HTTP method for which to handle HTTP requests.
   */
  method(): HTTPMethod;

  /**
   * @returns HTTP path of HTTP requests to handler.
   */
  path(): string;

  /**
   * Run request processing logic.
   * @param req - Request
   */
  handle(req: EndpointRequest<I>): Promise<EndpointResponder>;
}
