/**
 * An error which can be shown to the user. All other errors will be hidden behind a console.error call and a "internal error" message for the user.
 */
 export class FriendlyError extends Error {
  /**
   * Creates a new FriendlyError.
   * @param msg User friendly error message. Should not contain any jargon. This message will be transformed so that it always starts with a capital letter and ends with a period (or other punctuation if already present).
   */
  constructor(msg: string) {
    // Capitalize first letter
    msg = msg[0].toUpperCase() + msg.slice(1);

    // Ensure ends with punctuation
    const endI = msg.length - 1;
    if ([".", "?", "!"].indexOf(msg[endI]) === -1) {
      msg += ".";
    }
    
    super(msg);
    Object.setPrototypeOf(this, FriendlyError.prototype); // TODO: Instead of this hack maybe consider non Error classes and instead objects with _tag keys
    this.name = "FriendlyError";
  }
}

/**
 * Indicates an API endpoint request returned an error response.
 */
export class EndpointError extends Error {
  /**
   * Contains a user friendly message.
   */
  error: string;

  /**
   * Machine code for a specific condition which API clients are supposed to have knowledge of, it can be undefined if the server did not return one.
   */
  error_code: string;

  /**
   * Create an EndpointError.
   * @param {string} error See error property.
   * @param {string} error_code See error_code property.
   * @returns {EndpointError} New error.
   */
  constructor(error, error_code) {
    super(`The API returned an error response: error=${error}, error_code=${error_code}`);
    Object.setPrototypeOf(this, EndpointError.prototype);
    this.name = "EndpointError";

    this.error = error;
    this.error_code = error_code;
  }
}

/**
 * Indicates the API client does not have permission to perform the specified action.
 */
export class UnauthorizedError extends EndpointError {
  /**
   * Creates a new UnauthorizedError.
   * @param {string} msg A short technical message about what was not authorized. 
   * @returns {UnauthorizedError} New error.
   */
  constructor(error, errorCode) {
    super(error, errorCode);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);

    this.name = "UnauthorizedError";
  }

  /**
   * Constructs a FriendlyError to show to the user.
   * @param {string} action A user friendly description of the action which was taking place.
   * @returns {FriendlyError} Describing what happened and how the user is unauthorized.
   */
  asFriendlyError(action) {
    return new FriendlyError(`you do not have permission to ${action}`);
  }
}

export const ERROR_CODE_MUST_RESET_PASSWORD = "must_reset_password";
export const ERROR_CODE_RESET_PASSWORD_OLD_NOT_ALLOWED = "old_password_not_allowed";
export const ERROR_CODE_PASSWORD_TO_PWNED = "not_meet_password_requirements";
