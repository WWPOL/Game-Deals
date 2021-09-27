/**
 * Output messages about the behavior of the server.
 */
export interface Logger {
  error(...msgs: any[]);
  info(...msgs: any[]);
  debug(...msgs: any[]);
  child(prefix: string): Logger;
}

/**
 * Implements Logger using console.log and console.error.
 */
export class ConsoleLogger implements Logger {
  prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  child(prefix: string): ConsoleLogger {
    return new ConsoleLogger(`${this.prefix} ${prefix}`);
  }

  error(...msgs: any[]) {
    console.error(`ERR   ${this.prefix}`, ...msgs);
  }

  info(...msgs: any[]) {
    console.log(`INFO  ${this.prefix}`, ...msgs);
  }
  
  debug(...msgs: any[]) {
    console.log(`DEBUG ${this.prefix}`, ...msgs);
  }
}
