import {
  createConnection as createORMConnection,
  Connection,
} from "typeorm";

import * as url from "url";

import { Config } from "../config";
import { User } from "./user";
import { Game } from "./game";
import { Deal } from "./deal";

/**
 * Typing _tag field for the ConnectionConfig type.
 */
export const TAG_CONNECTION_CONFIG = "connection_config";

/**
 * Database configuration values needed to connect to a database with TypeORM.
 */
export type ConnectionConfig = {
  _tag: "connection_config";
  type: "postgres";
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

/**
 * Creates a Type ORM connection configuration object from the application configuration.
 * @param cfg - Application configuration from which to source connection details.
 * @returns Object which provides Type ORM which information required to connect to a database.
 */
export function connectionConfig(cfg: Config): ConnectionConfig {
  return {
    _tag: TAG_CONNECTION_CONFIG,
    type: "postgres",
    host: cfg.db.host,
    port: cfg.db.port,
    username: cfg.db.username,
    password: cfg.db.password,
    database: cfg.db.database,
  };
}

/**
 * Creates a connection to the database using TypeORM.
 * @param cfg - Application configuration.
 * @returns Database configuration.
 */
export async function createDBConnection(cfg: Config | ConnectionConfig): Promise<Connection> {
  const connConf = (function() {
    if (cfg?._tag === TAG_CONNECTION_CONFIG) {
      return cfg;
    } else {
      return {
        ...connectionConfig(cfg),
        synchronize: cfg.db.synchronize,
      };
    }
  })();
  return await createORMConnection({
    ...connConf,
    entities: [
      User,
      Game,
      Deal,
    ],
  });
}

/**
 * A type of database model types.
 */
export type ResourceModelType = User | Game | Deal;

/**
 * The URI schema used by APIURIs,
 */
export const API_URI_SCHEMA = "gamedeals";

/**
 * Resource types for the API URI.
 */
export enum APIURIResource {
  /**
   * A {@link User}.
   */
  User = "user",

  /**
   * A {@link Game}.
   */
  Game = "game",

  /**
   * A {@link Deal}.
   */
  Deal = "deal",

  /**
   * An authorization role.
   */
  Role = "role",

  /**
   * A user who is unauthenticated.
   * Requests without valid authentication use this as the subject.
   * Cannot be narrowed down with a path.
   */
  UntrustedUser = "untrusted_user",

  /**
   * API server metadata information.
   */
  APIMetadata = "api_metadata",
}

/**
 * Actions which can be taken on API metadata.
 */
export enum APIMetadataAction {
  /**
   * View the data.
   */
  Retrieve = "retrieve",
}

/**
 * Convert a ResourceModelType to an APIURIResource.
 * Cannot ever return APIURIResource.Role, as this is not a ResourceModelType.
 * @param modelType - The resource model type to convert.
 * @returns The corresponding APIURIResource enum value.
 */
export function apiURIResourceFromModelType(modelType: ResourceModelType): APIURIResource {
  if (modelType instanceof User) {
    return APIURIResource.User;
  } else if (modelType instanceof Game) {
    return APIURIResource.Game;
  } else {
    return APIURIResource.Deal;
  }
}

/**
 * A custom URI used by the API.
 */
export class APIURI {
  /**
   * Logical name of resource.
   */
  resource: APIURIResource;

  /**
   * ID or pattern of specific resource.
   * Cannot be provided if resource is APIURIResource.UntrustedUser.
   */
  path?: string;

  /**
   * Initializes an APIURI.
   * @throws {@link Error}
   * If resource = APIURIResource.UntrustedUser and path is not undefined.
   * This is because an UntrustedUser is a meta API resource. It is the subject used in authorization requests if a request is unauthenticated. Thus a path specifier to indicate a specific untrusted user is not a concept that makes sense.
   */
  constructor(resource: APIURIResource, path?: string) {
    this.resource = resource;
    this.path = path;

    if (this.resource === APIURIResource.UntrustedUser && this.path) {
      throw new Error("APIURI cannot be provided a path specifier if resource is APIURIResource.UntrustedUser");
    }
  }

  /**
   * @returns String representation of URI.
   */
  toString(): string {
    const u = new url.URL(`${API_URI_SCHEMA}://${this.resource}`);
    u.protocol = API_URI_SCHEMA;
    u.hostname = this.resource;
    if (this.path) {
      u.pathname = this.path;
    }
    
    return u.toString();
  }
}

/**
 * A resource which can be uniquely identified.
 */
export interface UniqueResource {
  /**
   * @returns A unique identifier for the resource.
   */
  uri(): APIURI;
}
