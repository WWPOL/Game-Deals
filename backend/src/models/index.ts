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
// export const API_URI_SCHEMA = "gamedeals";

/**
 * A type of resource stored in the database.
 */
export enum DBResource {
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
}

/**
 * A resource which is not stored in the database but is data that needs to be addressed (addressed as in a postal address) by the APIURI system.
 */
export enum MetaResource {
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
 * Resource types for the API URI.
 */
export type APIURIResource = DBResource | MetaResource;


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
 * Converts a path into the correct format.
 * @param value - To format.
 * @returns Path which starts with a slash and does not end with one.
 */
function normalizePath(value: string): string {
  if (value.length === 0) {
    return value;
  }
  
  let out = "";
  if (value[0] !== "/") {
    out += "/";
  }

  out += value;

  if (value.length > 1 && value[value.length - 1] === "/") {
    out = out.substring(0, value.length - 1);
  }

  return out;
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
   * Cannot be provided if resource is MetaResource.UntrustedUser.
   */
  path?: string;

  /**
   * Initializes an APIURI.
   * @throws {@link Error}
   * If resource = MetaResource.UntrustedUser and path is not undefined.
   * This is because an UntrustedUser is a meta API resource. It is the subject used in authorization requests if a request is unauthenticated. Thus a path specifier to indicate a specific untrusted user is not a concept that makes sense.
   */
  constructor(resource: APIURIResource, path?: string) {
    this.resource = resource;
    this.path = path;

    if (this.resource === MetaResource.UntrustedUser && this.path) {
      throw new Error("APIURI cannot be provided a path specifier if resource is MetaResource.UntrustedUser");
    }
  }

  /**
   * @returns String representation of URI.
   */
  toString(): string {
    let out = normalizePath(this.resource);

    if (this.path) {
      out += normalizePath(this.path);
    }
    
    return out;
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
