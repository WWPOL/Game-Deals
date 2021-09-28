import {
  newEnforcer,
  Enforcer,
} from "casbin";
import { getConnection as getDBConnection } from "typeorm";
import TypeORMAdapter from "typeorm-adapter";

import * as path from "path";

import { Config } from "../config";
import {
  createDBConnection,
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
      const adapter = await TypeORMAdapter.newAdapter(connectionConfig(this.cfg));
      this._enforcer = await newEnforcer(path.join(__dirname, "./model.conf"), adapter);
      await this._enforcer.loadPolicy();
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
    return await (await this.enforcer()).enforce(who.uri().toString(), resource.uri().toString(), action);
  }
}
