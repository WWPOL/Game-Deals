import { isRight } from "fp-ts/Either";
import * as T from "io-ts";

/**
 * Output messages about the behavior of the server.
 */
export interface Logger {
  /**
   * Log an error message.
   * @param msgs - The values to log.
   */
  error(...msgs: any[]);

  /**
   * Log an information message.
   * @param msgs - The values to log.
   */
  info(...msgs: any[]);

  /**
   * Log an debug message.
   * @param msgs - The values to log.
   */
  debug(...msgs: any[]);

  /**
   * @param prefix - The child logger's prefix.
   * @returns A child logger.
   * @throws {@link Error}
   * Allowed to throw an error if the prefix is invalid.
   */
  child(prefix: string): Logger;
}

/**
 * The maximum length of level prefixes used in ConsoleLogger.
 */
const CONSOLE_LOGGER_MAX_LEVEL_PREFIX_LEN = 5;

/**
 * Implements Logger using console.log and console.error.
 */
export class ConsoleLogger implements Logger {
  prefix: string;

  constructor(prefix: string) {
    if (prefix.includes(" ")) {
      throw new Error(`Prefix cannot contain spaces, was: "${prefix}"`)
    }
    
    this.prefix = prefix;
  }

  /**
   * Tries to create the clearest serialization of values.
   * @param value - The value to serialize
   * @returns Value serialized to a string.
   */
  pretty(value: any): string {
    if (isRight(T.object.decode(value))) {
      return JSON.stringify(value, null, 2);
    }

    return value.toString();
  }

  /**
   * Output to standard out.
   * @param msgs - Array of values to output.
   */
  stdout(...msgs: any[]) {
    console.log(...msgs.map(v => this.pretty(v)));
  }

  /**
   * Output to standard error.
   * @param msgs - Array of strings to output.
   */
  stderr(...msgs: string[]) {
    console.error(...msgs.map(v => this.pretty(v)));
  }

  /**
   * Adds padding to value until it is as long as targetLen. If the value is already this length nothing is done.
   * @param value - To pad. 
   * @param targetLen - The target length of the value.
   * @param padding - The single character used to make a value longer.
   * @returns The value padded to targetLen if it was too short.
   * @throws {@link Error}
   * If value is not one character.
   */
  minPad(value: string, targetLen: number, padding: string = " "): string {
    if (padding.length !== 1) {
      throw new Error(`Padding must be 1 character was "${padding}" (length: ${padding.length})`);
    }

    let out = value;
    while (out.length < targetLen) {
      out += padding;
    }

    return out;
  }

  /**
   * @param level - The logging level to indicate in the prefix. Cannot be longer than CONSOLE_LOGGER_MAX_LEVEL_PREFIX_LEN.
   * @returns A string which includes a level in the prefix.
   * @throws {@link Error}
   * If level is too long.
   */
  levelPrefix(level: string): string {
    if (level.length > CONSOLE_LOGGER_MAX_LEVEL_PREFIX_LEN) {
      throw new Error(`Prefix "${level}" is longer than the maximum length of ${CONSOLE_LOGGER_MAX_LEVEL_PREFIX_LEN}`);
    }

    return `${this.minPad(level, CONSOLE_LOGGER_MAX_LEVEL_PREFIX_LEN)} (${this.prefix})`;
  }

  child(prefix: string): ConsoleLogger {
    return new ConsoleLogger(`${this.prefix}.${prefix}`);
  }

  error(...msgs: any[]) {
    this.stderr(this.levelPrefix("ERR"), ...msgs);
  }

  info(...msgs: any[]) {
    this.stdout(this.levelPrefix("INFO"), ...msgs);
  }
  
  debug(...msgs: any[]) {
    this.stdout(this.levelPrefix("DEBUG"), ...msgs);
  }
}
