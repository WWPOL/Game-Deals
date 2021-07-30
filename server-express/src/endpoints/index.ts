import { Request, Response } from "express";

import { Config } from "~/config";
import { HealthEndpoint } from "~/endpoints/health";

export type EndpointCtx {
  cfg: Config;
}

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export type HTTPMethod = "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

export abstract class EndpointHandler<I, O> {
  cfg: Config;

  constructor(ctx: EndpointCtx) {
    this.cfg = ctx.cfg;
  }

  abstract method(): HTTPMethod;
  abstract path(): string;
  abstract handle(req: Request, resp: Response, input: I): O;
}

export function GenerateEndpoints(ctx: EndpointCtx): EndpointHandler[] {
  return [
    new HealthEndpoint(ctx),
  ];
}
