import { Response } from "express";
import {
  EndpointError,
  ErrorCode,
} from "./error";

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
 * The response sent when an error occurs during a handler.
 */
type ErrorResponse = {
  /**
   * Technical description of the error.
   */
  error: string;

  /**
   * Programmatic code indicating the type of error.
   * Usually only provided when the HTTP status code is not self describing and / or the API client is expecte to take application specific action when this error is received.
   */
  error_code?: ErrorCode;
};

export class ErrorResponder implements EndpointResponder {
  /**
   * The error which occurred.
   */
  error: EndpointError | any;

  /**
   * Initialize error responder.
   */
  constructor(error: EndpointError | any) {
    this.error = error;
  }

  /**
   * Send the error to the user via a JSONResponder.
   */
  async respond(resp: Response): Promise<void> {
    const err = (function(error): { errResp: ErrorResponse, httpStatus: number } {
      if (error._tag === "endpoint_error") {
        return {
          errResp: {
            error: error.error,
            error_code: error.error_code,
          },
          httpStatus: error.http_status,
        };
      }

      return {
        errResp: {
          error: "An unknown internal error occurred",
        },
        httpStatus: 500,
      };
    })(this.error);
    const jsonResponder = new JSONResponder(err.httpStatus, err.errResp);
    await jsonResponder.respond(resp);
  }
}
