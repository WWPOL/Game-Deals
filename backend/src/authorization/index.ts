import {
  newEnforcer,
  Enforcer,
} from "casbin";
import { getConnection as getDBConnection } from "typeorm";
import TypeORMAdapter from "typeorm-adapter";

import * as path from "path";
import url from "url";

import { Config } from "../config";
import {
  createDBConnection,
  connectionConfig,
  UniqueResource,
  APIURI,
  APIURIResource,
  ResourceModelType,
  apiURIResourceFromModelType,
} from "../models";
import {
  User,
  UserAction,
} from "../models/user";
import {
  Deal,
  DealAction,
} from "../models/deal";
import {
  Game,
  GameAction,
} from "../models/game";

/**
 * An action which can be applied to a resource.
 */
export type AuthorizationAction<R: ResourceModelType> = R extends User ? UserAction : (Game ? GameAction : DealAction);

/**
 * An extension of APIURI for authorization uses.
 * Can store information about an action.
 * @typeParam R - Resource type.
 */
export class AuthorizationURI<R: ResourceModelType> extends APIURI {
  /**
   * The authorization action.
   */
  action?: AuthorizationAction<R>;

  constructor(resource: APIURIResource, path?: string, action?: AuthorizationAction<R>) {
    super(resource, path);
    this.action = action;
  }

  /**
   * @return String representation of URI
   */
  toString() {
    const u = url.parse(super.toString());
    if (action) {
      u.hash = this.action;
    }

    return u.toString();
  }
}

/**
 * The authorization database base name.
 */
const AUTHORIZATION_DATABASE_BASE = "authorization";

/**
 * Holds policies for a certain policy matching model.
 * @typeParam T - The type of policy definitions for this policy model.
 */
type NamedPolicies<T: Policy> = {
  /**
   * The name of the policy model.
   */
  policyType: string;

  /**
   * The policies for this policy model.
   */
  policies: T[];
};

/**
 * A type of policy rule type.
 */
export interface Policy {
  /**
   * @returns Developer oriented description of the policy.
   */
  description(): string;
  
  /**
   * @returns String tuple representation of policy.
   */
  policyTuple(): string[];
}

/**
 * A role based access control policy.
 * @typeParam R - Resource type of object whos access is being controlled.
 */
class RBACPolicy<R: ResourceModelType> implements Policy {
  /**
   * Developer focused description of the policy.
   */
  descriptionTxt: string;
  
  /**
   * Subject who is being granted access.
   */
  sub: APIURI;

  /**
   * Object to which access is being controlled.
   */
  obj: APIURI;

  /**
   * The action which is being allowed to take place on the object.
   */
  act: AuthorizationAction<R>;

  /**
   * Initializes an RBAC policy.
   */
  constructor(description: string, sub: APIURI, obj: APIURI, act: AuthorizationAction<R>) {
    this.descriptionTxt = description;
    this.sub = sub;
    this.obj = obj;
    this.act = act;
  }

  description(): string {
    return this.descriptionTxt;
  }

  policyTuple(): string[] {
    return [this.sub.toString(), this.obj.toString(), this.act];
  }
];

/**
 * An attribute based access control policy.
 */
class ABACPolicy {
  /**
   * Developer focused description of the policy.
   */
  descriptionTxt: string;
  
  /**
   * Casbin rule which matches subjects who can utilize this policy.
   */
  sub_rule: string;

  /**
   * Object to which access is being controlled.
   */
  obj: string;

  /**
   * The action which is being allowed to take place on the object.
   */
  act: string;

  /**
   * Initializes ABAC policy.
   */
  constructor(description: string, sub_rule: string, obj: string, act: string) {
    this.descriptionTxt = description;
    this.sub_rule = sub_rule;
    this.obj = obj;
    this.act = act;
  }

  description(): string {
    return this.descriptionTxt;
  }

  policyTuple(): string[] {
    return [this.sub_rule, this.obj, this.act];
  }
];

/**
 * The authorization policies to use to enforce access.
 */
const POLICIES = [
  {
    policyType: "p",
    policies: [
    ],
  },
];

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
   * Initializes policies.
   */
  async init(): Promise<void> {
    const enforcer = await this.enforcer();

    POLICIES.forEach(async (namedPolicies: NamedPolicies): Promise<void> => {
      await enforcer.addNamedPolicies(namedPolicies.policyType, namedPolicies.policies);
    });
    // sub, obj, act
    // enforcer.addPolicies([
    //   ["gamedeals://role/admin", "gamedeals://user/*", "^CREATE|RETRIEVE|UPDATE|DELETE$"]
    // ]);
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
