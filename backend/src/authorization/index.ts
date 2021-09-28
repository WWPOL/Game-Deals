import {
  newEnforcer,
  Enforcer,
} from "casbin";
import TypeORMAdapter from "typeorm-adapter";

import { Config } from "../config";
import {
  connectionConfig,
  UniqueResource,
} from "../models";
import { User } from "../models/user";

/**
 * An action which can be applied to a resource.
 */
export enum AuthorizationAction {
}

/**
 * The authorization database base name.
 */
const AUTHORIZATION_DATABASE_BASE = "authorization";

/**
 * Client which enforces authorization decisions.
 */
export class AuthorizationClient {
  /**
   * Application configuration.
   */
  cfg: Config;
  
  /**
   * Casbin enforcer if it exists yet.
   */
  _enforcer: Enforcer | null;

  /**
   * Initializes an authorization client.
   * @param cfg - Application configuration.
   */
  constructor(cfg: Config) {
    this.cfg = cfg;
    this._enforcer = null;
  }

  /**
   * Retrieves the Casbin enforcer. Initializes it if does not exist.
   * @returns Casbin enforcer.
   */
  async enforcer(): Promise<Enforcer> {
    if (this._enforcer === null) {
      const adapter = TypeORMAdapter.newAdapter({
        ...connectionConfig(this.cfg),
        database: `${this.cfg.db.database}-${AUTHORIZATION_DATABASE_BASE}`,
      });
      this._enforcer = await newEnforcer("./model.conf", adapter);
    }

    return this._enforcer;
  }

  /**
   * Check if an action is allowed.
   * @param who - The user who is trying to complete the action.
   * @param resource - To what the action is being applied.
   * @param action - What is supposed to be done.
   * @returns True if action is allowed, false otherwise.
   */
  async isAllowed(who: User, resource: UniqueResource, action: AuthorizationAction): Promise<boolean> {
    return false; // TODO
  }
}
