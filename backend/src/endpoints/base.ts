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
    const log = (msg: string) => {
      console.log(`${handler.method()} ${handler.path()} ${msg}`);
    };
    
    log("");
    const startT = new Date().getTime();
    
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
        log(`=> error=${e}`);
        return new ErrorResponder(e);
      }
    })();

    // Respond
    await epResp.respond(resp);

    const endT = new Date().getTime();
    const dt = endT - startT;
    
    log(`=> ${epResp.status()} ${dt}ms`);
  };
}

export class BaseEndpoint {
  /**
   * Endpoint context
   */
  cfg: Config;

  /**
   * @returns Database connection.
   */
  _dbFn: () => Promise<DBConnection>;

  /**
   * Initializes an endpoint handler.
   */
  constructor(ctx: EndpointCtx) {
    this.cfg = ctx.cfg;
    this._dbFn = ctx.db;
  }

  /**
   * Provides access to the database.
   * @returns Database connection.
   */
  async db(): Promise<DBConnection> {
    return await this._dbFn();
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
