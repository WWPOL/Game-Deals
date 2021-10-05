import { Request, Response } from "express";
import {
  Connection as DBConnection,
} from "typeorm";
import { Config } from "~/config";
import {
  Optional,
  None,
  isSome,
} from "../lib/optional";
import {
  BodyParser,
  EndpointRequest,
} from "./request";
import {
  EndpointResponder,
  ErrorResponder,
} from "./response";
import { MkEndpointError } from "./error";
import {
  Logger,
  ConsoleLogger,
} from "../logger";
import {
  AuthorizationClient,
  AuthorizationRequest,
} from "../authorization";
import { authenticateReq } from "../authentication";
import {
  APIURI,
  MetaResource,
} from "../models";
import { User } from "../models/user";
 
/**
 * Data required to setup an endpoint handler.
 */
export type EndpointCtx = {
  /**
   * Logger.
   */
  log: Logger;
  
  /**
   * Backend configuration.
   */
  cfg: Config;

  /**
   * Used to enforce authorization.
   */
  authorizationClient: AuthorizationClient;
}

/**
 * The HTTP method which will be handled by the endpoint.
 */
export type HTTPMethod = "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

/**
 * Call an EndpointHandler handle method from a standard Express endpoint handler.
 * Performs all middleware logic. Logs request details. Transforms the Express request into an Endpoint Request. Authenticates the user. Authorizes the user. 
 * Calls the EndpointHandler handle method and uses the returned EndpointResponder to respond to the Express request.
 * @typeParam I - Request body type.
 * @param handler - The Endpoint handler.
 * @returns Standard express event handler which will call the endpoint handler.
 */
export function wrapHandler<I>(ctx: EndpointCtx, handler: EndpointHandler<I>): (req: Request, resp: Response) => Promise<void> {
  return async (req: Request, resp: Response): Promise<void> => {
    const log = new ConsoleLogger(`${handler.method().toUpperCase()} ${handler.path()}`);
    
    log.info("");
    const startT = new Date().getTime();
   
    const epResp = await (async function(): Promise<EndpointResponder> {
      try {
        // Authenticate
        const who = await authenticateReq(ctx.cfg, req);
        
        // Build request
        const epReq = {
          req: req,
          body: (): I => {
            const bodyParser = handler.bodyParser();
            return bodyParser.parse(req);
          },
          user: who,
        };

        // Authorize
        const authSub = isSome(who) ? who.value.uri() : new APIURI(MetaResource.UntrustedUser);
        const authReqs = await handler.authorization(epReq);
        if (authReqs.length === 0) {
          // Endpoint does not define any authorization requirements so default to no access
          return new ErrorResponder(MkEndpointError({
            http_status: 403,
            error: "unauthorized."
          }));
        }
        // Endpoint does have authorization requirements
        const isAuthorized = await ctx.authorizationClient.isAllowed(authSub, authReqs);
        if (isAuthorized === false) {
          return new ErrorResponder(MkEndpointError({
            http_status: 403,
            error: "unauthorized."
          }));
        }
        
        
        // Handle
        return await handler.handle(epReq);
      } catch (e) {
        if (e._tag !== "endpoint_error") {
          log.error(e);
        }
        return new ErrorResponder(e);
      }
    })();

    // Respond
    await epResp.respond(resp);

    const endT = new Date().getTime();
    const dt = endT - startT;
    
    log.info(`=> ${epResp.status()} ${dt}ms`);
  };
}

/**
 * Specifies the network location of an endpoint for use by BaseEndpoint.
 * @typeParam I - Request body input type.
 */
export type BaseEndpointSpec<I> = {
  /**
   * The HTTP method to be handled.
   */
  method: HTTPMethod;

  /**
   * The URL path the endpoint will handle.
   */
  path: string;

  /**
   * Factory function which initializes a body parser.
   */
  bodyParserFactory: () => BodyParser<I>;
}

/**
 * Implements some helpful behavior for all endpoints to use.
 * @typeParam I - Request body input type.
 */
export class BaseEndpoint<I> {
  /**
   * Logger for endpoint.
   */
  log: Logger;

  /**
   * Endpoint context.
   */
  cfg: Config;

  /**
   * The specification of network location of the endpoint.
   */
  spec: BaseEndpointSpec<I>;
  
  /**
   * Used to enforce authorization.
   */
  authorizationClient: AuthorizationClient;

  /**
   * Initializes an endpoint handler.
   */
  constructor(ctx: EndpointCtx, spec: BaseEndpointSpec<I>) {
    this.cfg = ctx.cfg;
    this.spec = spec;
    this.log = ctx.log.child(`${this.spec.method} ${this.spec.path}`);
    this.authorizationClient = ctx.authorizationClient;
  }

  /**
   * @returns The body parser used to process request body.
   */
  bodyParser(): BodyParser<I> {
    return this.spec.bodyParserFactory();
  }

  /**
   * @returns HTTP method endpoint uses.
   */
  method(): HTTPMethod {
    return this.spec.method;
  }

  /**
   * @returns URL path location of endpoint.
   */
  path(): string {
    return this.spec.path;
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
   * @param req - Request
   * @returns A list of authorization requests which describe the actions required to utilize the endpoint.
   */
  authorization(req: EndpointRequest<I>): Promise<AuthorizationRequest[]>;

  /**
   * Run request processing logic.
   * @param req - Request
   */
  handle(req: EndpointRequest<I>): Promise<EndpointResponder>;
}
