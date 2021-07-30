import { EndpointHandler } from "~/endpoints";

export type HealthResp {
  ok: bool;
}

export class HealthEndpoint<void, HealthResp> extends EndpointHandler {
  method() {
    return "get";
  }
  
  path() {
    return "/api/v0/path";
  }

  handle(req, res, data) {
    return {
      ok: true,
    };
  }
}
