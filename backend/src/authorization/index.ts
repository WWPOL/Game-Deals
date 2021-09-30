import {
  newEnforcer,
  Enforcer,
} from "casbin";
import { getConnection as getDBConnection } from "typeorm";
import TypeORMAdapter from "typeorm-adapter";

import * as path from "path";
import * as url from "url";

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
export type AuthorizationAction = UserAction | GameAction | DealAction;

/**
 * Create a regular expression which matches an array of authorization actions.
 * @returns Regular expression which matches only the authorization actions in arr.
 */
function authorizationActionArrRegex(arr: AuthorizationAction[]): string {
  return `^arr.join("|")$`;
}

/**
 * An extension of APIURI for authorization uses.
 * Can store information about an action.
 */
export class AuthorizationURI extends APIURI {
  /**
   * The authorization action.
   */
  action?: AuthorizationAction;

  constructor(resource: APIURIResource, path?: string, action?: AuthorizationAction) {
    super(resource, path);
    this.action = action;
  }

  /**
   * @return String representation of URI
   */
  toString() {
    const u = url.parse(super.toString());
    if (this.action) {
      u.hash = this.action;
    }

    return u.toString();
  }
}

export enum PolicyType {
  /**
   * Role based access controll.
   */
  RBAC = "p",

  /**
   * Attribute based access control.
   */
  ABAC = "p1",
}

/**
 * The authorization database base name.
 */
const AUTHORIZATION_DATABASE_BASE = "authorization";

/**
 * Holds policies for a certain policy matching model.
 * @typeParam T - The type of policy definitions for this policy model.
 */
type NamedPolicies<T extends Policy> = {
  /**
   * The name of the policy model.
   */
  policyType: PolicyType;

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
   * @returns Short logical name of policy, should not change.
   */
  name(): string;
  
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
 * Indicates that the subject of an RBAC policy should be the role which this subject is part of.
 * This is used to make policies which give permissions to a role using the APIURI system.
 */
type RBACSubjectRoleSelfType = "role/self";

/**
 * Only meaning / value of {@link RBACSubjectRoleSelfType} type.
 */
const RBACSubjectRoleSelf: RBACSubjectRoleSelfType = "role/self";

/**
 * Type which indicates the subject of a RBAC policy.
 */
type RBACSubjectType = APIURI | RBACSubjectRoleSelfType;

/**
 * A role based access control policy.
 */
class RBACPolicy implements Policy {
  /**
   * Logical name of policy.
   */
  logicalName: string;
  
  /**
   * Developer focused description of the policy.
   */
  descriptionTxt: string;
  
  /**
   * Subject who is being granted access.
   */
  sub: RBACSubjectType;

  /**
   * Object to which access is being controlled.
   */
  obj: APIURI;

  /**
   * The action which is being allowed to take place on the object.
   */
  act: AuthorizationAction[];

  /**
   * Initializes an RBAC policy.
   */
  constructor(logicalName: string, description: string, sub: RBACSubjectType, obj: APIURI, act: AuthorizationAction[]) {
    this.logicalName = logicalName;
    this.descriptionTxt = description;
    this.sub = sub;
    this.obj = obj;
    this.act = act;
  }

  name(): string {
    return this.logicalName;
  }

  description(): string {
    return this.descriptionTxt;
  }

  policyTuple(): string[] {
    return [this.sub.toString(), this.obj.toString(), authorizationActionArrRegex(this.act)];
  }
}

/**
 * An attribute based access control policy.
 */
class ABACPolicy {
  /**
   * Logical name of policy.
   */
  logicalName: string;
  
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
  obj: APIURIResource;

  /**
   * The action which is being allowed to take place on the object.
   */
  act: AuthorizationAction[];

  /**
   * Initializes ABAC policy.
   */
  constructor(logicalName: string, description: string, sub_rule: string, obj: APIURIResource, act: AuthorizationAction[]) {
    this.logicalName = logicalName;
    this.descriptionTxt = description;
    this.sub_rule = sub_rule;
    this.obj = obj;
    this.act = act;
  }

  name(): string {
    return this.logicalName;
  }

  description(): string {
    return this.descriptionTxt;
  }

  policyTuple(): string[] {
    return [this.sub_rule, this.obj, authorizationActionArrRegex(this.act)];
  }
}

/**
 * The authorization policies to use to enforce access.
 */
const POLICIES = [
  {
    policyType: PolicyType.ABAC,
    policies: [
      new ABACPolicy(
        "user/self/non_secure",
        "Users can view and edit non-secure details.",
        "r.sub = r.obj", // request user = request object
        APIURIResource.User, // Only users
        [
          UserAction.RetrieveSecure,
          UserAction.UpdateNonSecure,
        ]
      ),
      new ABACPolicy(
        "user/self/secure",
        "Users can view and change their secure details.",
        "r.sub = r.obj", // request user = request object
        APIURIResource.User, // Only users
        [
          UserAction.RetrieveSecure,
          UserAction.UpdateSecure,
        ]
      ),
    ],
  },
  {
    policyType: PolicyType.RBAC,
    policies: [
      new RBACPolicy(
        "game/retrieve",
        "Users can retrieve games.",
        RBACSubjectRoleSelf,
        new APIURI(APIURIResource.Game, "/*"),
        [ GameAction.Retrieve ],
      ),
      new RBACPolicy(
        "game/publish",
        "Users can create and update games.",
        RBACSubjectRoleSelf,
        new APIURI(APIURIResource.Game, "/*"),
        [
          GameAction.Create,
          GameAction.Update,
        ],
      ),
    ],
  },
];

/**
 * A request to perform actions on a resource.
 */
export type AuthorizationRequest = {
  /**
   * The resource on which to perform actions.
   */
  resourceURI: APIURI;

  /**
   * Actions requesting to be performed.
   */
  actions: AuthorizationAction[];
};

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

    POLICIES.forEach(async (namedPolicies: NamedPolicies<any>): Promise<void> => {
      await enforcer.addNamedPolicies(namedPolicies.policyType, namedPolicies.policies.map(p => p.policyTuple()));
    });
  }

  /**
   * Check if an action is allowed.
   * @param who - The user who is trying to complete the action.
   * @param resource - To what the action is being applied.
   * @param action - What is supposed to be done.
   * @returns True if action is allowed, false otherwise.
   */
  async isAllowed(who: User, reqs: AuthorizationRequest[]): Promise<boolean> {
    const enforcer = await this.enforcer();

    // Aggregate all actions for each resource
    let resActions: { [key: string]: Set<AuthorizationAction> } = {};

    for (let req of reqs) {
      const resURI = req.resourceURI.toString();
      
      if (!(resURI in resActions)) {
        resActions[resURI] = new Set();
      }

      // Union req actions
      resActions[resURI] = new Set([
        ...Array.from(resActions[resURI]),
        ...req.actions,
      ]);
    }

    // Enforce actions for each resource
    const enforced = await Promise.all(Object.keys(resActions).map(async (resURI: string): Promise<boolean> => {
      return enforcer.enforce([
        who.uri().toString(),
        resURI,
        authorizationActionArrRegex(Array.from(resActions[resURI])),
      ]);
    }));

    const failedEnforce = enforced.filter(result => result === false);
    return failedEnforce.length === 0;
  }
}
