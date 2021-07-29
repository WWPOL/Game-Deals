/**
 * Allows for a promise to be resolved or rejected from anywhere.
 * @property {Promise} prom Internal promise used in resolve(), reject(), and when().
 * @property {function(data)} promResolve Function which will resolve the internal promise.
 * @property {function(data)} promReject Function which will reject the internal promise.
 */
export class SharedProm {
  /**
   * Creates a new SharedProm;
   * @returns {SharedProm} New shared promise.
   */
  constructor() {
    this.reset();
  }

  /**
   * Reject the current promise (so that any hanging calls to this.when() exit. Then reset the internal this.prom Promise.
   */
  reset() {
    // End any existing calls to this.when();
    if (this.prom !== undefined) {
      this.promReject(new Error("The shared promise was reset"));
    }

    // Setup new internal Promise
    let self = this;
    this.prom = new Promise((resolve, reject) => {
      self.promResolve = resolve;
      self.promReject = reject;
    });
  }

  /**
   * Waits for shared promise to resolve or reject. Then resets the promise for future use.
   * @returns {Promise} Resolve or reject result.
   */
  async when() {
    const result = await this.prom;

    this.reset();

    return result;
  }

  /**
   * Resolves the shared promise.
   * @param {any} [data] Information to return when shared promise resolves.
   */
  resolve(data) {
    this.promResolve(data);
  }

  /**
   * Rejects the shared promise.
   * @param {any} [data] Information to return when shared promise rejects.
   */
  reject(data) {
    this.promReject(data);
  }
}
