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
  constructor({
    logicalName,
    description,
    sub,
    obj,
    act,
  }: {
    readonly logicalName: string,
    readonly description: string,
    readonly sub: RBACSubjectType,
    readonly obj: APIURI,
    readonly act: AuthorizationAction[],
  }) {
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
  subRule: string;

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
  constructor({
    logicalName,
    description,
    subRule,
    obj,
    act,
  }: {
    readonly logicalName: string,
    readonly description: string,
    readonly subRule: string,
    readonly obj: APIURIResource,
    readonly act: AuthorizationAction[],
  }) {
    this.logicalName = logicalName;
    this.descriptionTxt = description;
    this.subRule = subRule;
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
    return [this.subRule, new APIURI(this.obj).toString(), authorizationActionArrRegex(this.act)];
  }
}

/**
 * Authorization grouping policy. Creates associations between authorization resources.
 */
class GroupingPolicy {
  /**
   * The subject which will be receiving the association.
   */
  sub: APIURI;

  /**
   * The authorization objects who's permissions the subject will receive.
   */
  inherits: APIURI[];

  /**
   * Initialize a GroupingPolicy.
   */
  constructor({
    sub,
    inherits,
  }: {
    readonly sub: APIURI,
    readonly inherits: APIURI[],
  }) {
    this.sub = sub;
    this.inherits = inherits;
  }

  /**
   * @returns Tuples representing the grouping policy required to create the behavior defined by sub and inherits.
   */
  groupingTuples(): string[][] {
    return this.inherits.map((inherit) => [
      this.sub.toString(),
      inherit.toString(),
    ]);
  }
}

/**
 * The authorization policies to use to enforce access.
 */
const POLICIES = [
  {
    policyType: PolicyType.ABAC,
    policies: [
      new ABACPolicy({
        logicalName: "user/self/non_secure",
        description: "Users can view and edit non-secure details.",
        subRule: "r.sub = r.obj", // request user = request object
        obj: DBResource.User, // Only users
        act: [
          UserAction.RetrieveSecure,
          UserAction.UpdateNonSecure,
        ],
      }),
      new ABACPolicy({
        logicalName: "user/self/secure",
        description: "Users can view and change their secure details.",
        subRule: "r.sub = r.obj", // request user = request object
        obj: DBResource.User, // Only users
        act: [
          UserAction.RetrieveSecure,
          UserAction.UpdateSecure,
          UserAction.Authenticate,
        ],
      }),
    ],
  },
  {
    policyType: PolicyType.RBAC,
    policies: [
      new RBACPolicy({
        logicalName: "untrusted_user/health",
        description: "Allow untrusted users to view API health information.",
        sub: new APIURI(MetaResource.UntrustedUser),
        obj: new APIURI(MetaResource.APIMetadata, "/health"),
        act: [ APIMetadataAction.Retrieve ],
      }),
      new RBACPolicy({
        logicalName: "untrusted_user/auth/login",
        description: "Allow unstrusted users to authenticate as users.",
        sub: new APIURI(MetaResource.UntrustedUser),
        obj: new APIURI(DBResource.User, "/*"),
        act: [ UserAction.Authenticate ],
      }),
      new RBACPolicy({
        logicalName: "untrusted_user/deal",
        description: "Allow untrusted users to get deals.",
        sub: new APIURI(MetaResource.UntrustedUser),
        obj: new APIURI(DBResource.Deal, "/*"),
        act: [ DealAction.Retrieve ],
      }),
      new RBACPolicy({
        logicalName: "user/create",
        description: "Allow to create users.",
        sub: RBACSubjectRoleSelf,
        obj: new APIURI(DBResource.User),
        act: [ UserAction.Create ],
      }),
    ],
  },
];

/**
 * Authorization grouping policies used to associate permissions with URIs.
 */
const GROUPING_POLICIES = [
  new GroupingPolicy({
    sub: new APIURI(MetaResource.Role, "admin"),
    inherits: [
      new APIURI(MetaResource.UntrustedUser),
      new APIURI(MetaResource.Role, "user/create"),
    ],
  }),
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
   * @param log - Logger.
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
   * Initializes policies and groupings.
   */
  async init(): Promise<void> {
    const enforcer = await this.enforcer();

    await Promise.all(POLICIES.map(async (namedPolicies) => {
      const res = await enforcer.addNamedPolicies(
        namedPolicies.policyType,
        namedPolicies.policies.map((p) => p.policyTuple()),
      );

      if (res) {
        this.log.debug(`Updated policy type ${namedPolicies.policyType}`);
      }
    }));

    await Promise.all(GROUPING_POLICIES.map(async (grouping) => {
      const res = await enforcer.addGroupingPolicies(grouping.groupingTuples());

      if (res) {
        this.log.debug(`Updated policy grouping for subject ${grouping.sub}`);
      }
    }));
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

    const failedEnforce = enforced.map((result, i) => {
      if (result === false) {
        return reqs[i];
      }
    }).filter(v => v !== undefined);
    
      // filter(result => result === false);
    if (failedEnforce.length > 0) {
      this.log.info(`${who.toString()} was denied authorization to perform action(s): ${JSON.stringify(failedEnforce)}`);
    }
    
    return failedEnforce.length === 0;
  }

  /**
   * Give a user an authorization role.
   * @param userID - The ID of the user to which the role will be granted.
   * @param roleLogicalName - The logical name of the role to grant the user.
   * @throws {@link Error}
   * If the role has already been granted to the user.
   */
  async grantRole(userID: number, roleLogicalName: string): Promise<void> {
    const enforcer = await this.enforcer();

    const grouping = new GroupingPolicy({
      sub: new APIURI(DBResource.User, userID.toString()),
      inherits: [
        new APIURI(MetaResource.Role, roleLogicalName),
      ],
    });
    
    const res = await enforcer.addGroupingPolicies(grouping.groupingTuples());
    if (!res) {
      throw new Error(`User ${userID} has already been granted the role "${roleLogicalName}".`);
    }
  }
}
