import {
  newEnforcer,
  Enforcer,
} from "casbin";
import { getConnection as getDBConnection } from "typeorm";
import TypeORMAdapter from "typeorm-adapter";

import * as path from "path";
import * as url from "url";

import { Config } from "../config";
import { Logger } from "../logger";
import {
  createDBConnection,
  connectionConfig,
  UniqueResource,
  APIURI,
  APIURIResource,
  MetaResource,
  DBResource,
  ResourceModelType,
  APIMetadataAction,
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
import { AuthorizationPolicy } from "../models/policy";

/**
 * An action which can be applied to a resource.
 */
export type AuthorizationAction = UserAction | GameAction | DealAction | APIMetadataAction;

/**
 * Create a regular expression which matches an array of authorization actions.
 * @param arr - Array of authorization actions to create regular expression to match
 * @param boundaryMatchers - If true then the start and end regex ("^...$") matchers will be included in the expression
 * @returns Regular expression which matches only the authorization actions in arr.
 */
function authorizationActionArrRegex(arr: AuthorizationAction[], boundaryMatchers?: boolean): string {
  const startMatcher = boundaryMatchers ? "^" : "";
  const endMatcher = boundaryMatchers ? "$" : "";
  return `${startMatcher}${arr.join("|")}${endMatcher}`;
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
    const subURI = (function() {
      if (this.sub === RBACSubjectRoleSelf) {
        return new APIURI(MetaResource.Role, this.logicalName);
      } else {
        return this.sub;
      }
    }).bind(this)();
    return [subURI.toString(), this.obj.toString(), authorizationActionArrRegex(this.act)];
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
    return [this.sub_rule, new APIURI(this.obj).toString(), authorizationActionArrRegex(this.act)];
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
        DBResource.User, // Only users
        [
          UserAction.RetrieveSecure,
          UserAction.UpdateNonSecure,
        ]
      ),
      new ABACPolicy(
        "user/self/secure",
        "Users can view and change their secure details.",
        "r.sub = r.obj", // request user = request object
        DBResource.User, // Only users
        [
          UserAction.RetrieveSecure,
          UserAction.UpdateSecure,
          UserAction.Authenticate,
        ]
      ),
    ],
  },
  {
    policyType: PolicyType.RBAC,
    policies: [
      new RBACPolicy(
        "untrusted_user/health",
        "Allow untrusted users to view API health information.",
        new APIURI(MetaResource.UntrustedUser),
        new APIURI(MetaResource.APIMetadata, "/health"),
        [ APIMetadataAction.Retrieve ],
      ),
      new RBACPolicy(
        "untrusted_user/auth/login",
        "Allow unstrusted users to authenticate as users.",
        new APIURI(MetaResource.UntrustedUser),
        new APIURI(DBResource.User, "/*"),
        [ UserAction.Authenticate ],
      ),
      new RBACPolicy(
        "game/retrieve",
        "Users can retrieve games.",
        RBACSubjectRoleSelf,
        new APIURI(DBResource.Game, "/*"),
        [ GameAction.Retrieve ],
      ),
      new RBACPolicy(
        "game/publish",
        "Users can create and update games.",
        RBACSubjectRoleSelf,
        new APIURI(DBResource.Game, "/*"),
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
   * Output debug messages.
   */
  log: Logger;
  
  /**
   * Casbin enforcer if it exists yet.
   */
  _enforcer: Enforcer | null;

  /**
   * Initializes an authorization client.
   * @param cfg - Application configuration.
   */
  constructor(cfg: Config, log: Logger) {
    this.cfg = cfg;
    this.log = log;
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

    // Create AuthorizationPolicy for each policies
    let newPolicies = 0;
    let updatedPolicies = 0;
    let deletedPolicies = 0;
    
    await Promise.all(POLICIES.map(async (namedPolicies) => {
      let foundPolicies = [];
      
      await Promise.all(namedPolicies.policies.map(async (p) => {
        // Create AuthorizationPolicy model
        const policyModel = new AuthorizationPolicy();
        policyModel.logical_name = p.name();
        policyModel.policy_type = namedPolicies.policyType;
        policyModel.policy = p.policyTuple();

        // Update or add policy if not present
        const foundPolicy = await AuthorizationPolicy.findOne({
          policy_type: policyModel.policy_type,
          logical_name: policyModel.logical_name,
        });

        if (!foundPolicy) {
          // No policy found, add policy
          await enforcer.addNamedPolicy(policyModel.policy_type, ...policyModel.policy);

          await policyModel.save();

          newPolicies += 1;
        } else {          
          if (JSON.stringify(foundPolicy.policy) !== JSON.stringify(policyModel.policy)) {
            // Policy must be updated
            await enforcer.removeNamedPolicy(foundPolicy.policy_type, ...foundPolicy.policy);
            await enforcer.addNamedPolicy(policyModel.policy_type, ...policyModel.policy);

            foundPolicy.policy = policyModel.policy;
            await foundPolicy.save();

            updatedPolicies += 1;
          }
        }
      }));

      // Delete removed policies
      const declaredPolicyNames = namedPolicies.policies.map((declaredPolicy) => {
        return declaredPolicy.name();
      });
      
      await Promise.all((await AuthorizationPolicy.find({
        policy_type: namedPolicies.policyType,
      })).map(async (foundPolicy) => {
        if (!declaredPolicyNames.includes(foundPolicy.logical_name)) {
          await foundPolicy.remove();

          deletedPolicies += 1;
        }
      }));
    }));

    if (newPolicies > 0 || updatedPolicies > 0 || deletedPolicies > 0) {
      this.log.debug(`Added ${newPolicies} new policies, updated ${updatedPolicies} policies, deleted ${deletedPolicies} policies`);
    }
  }

  /**
   * Check if an action is allowed.
   * @param who - The user who is trying to complete the action.
   * @param resource - To what the action is being applied.
   * @param action - What is supposed to be done.
   * @returns True if action is allowed, false otherwise.
   */
  async isAllowed(who: APIURI, reqs: AuthorizationRequest[]): Promise<boolean> {
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
      return enforcer.enforce(
        who.toString(),
        resURI,
        authorizationActionArrRegex(Array.from(resActions[resURI]), false),
      );
    }));

    const failedEnforce = enforced.filter(result => result === false);
    return failedEnforce.length === 0;
  }
}
