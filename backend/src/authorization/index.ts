import {
  newEnforcer,
  Enforcer,
} from "casbin";

/**
 * Create a new Casbin enforced.
 * @returns Casbin enforcer configured appropriately.
 */
export async function casbinEnforcer(): Promise<Enforcer> {
  return await newEnforcer("./model.conf", "./policy.csv");
}

/**
 * Client which enforces authorization decisions.
 */
export class AuthorizationClient {
  /**
   * Casbin enforcer if it exists yet.
   */
  _enforcer: Enforcer | null;

  /**
   * Initializes an authorization client.
   */
  constructor() {
    this._enforcer = null;
  }

  /**
   * Retrieves the Casbin enforcer.
   * @returns Casbin enforcer.
   */
  async enforcer(): Promise<Enforcer> {
    if (this._enforcer === null) {
      this._enforcer = await newEnforcer();
    }

    return this._enforcer;
  }
}
