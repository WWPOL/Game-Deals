import {
  createConnection as createORMConnection,
  Connection,
} from "typeorm";
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
 * The URI schema used by APIURIs,
 */
export const API_URI_SCHEMA = "gamedeals";

/**
 * Resource types for the API URI.
 */
export enum APIURIResource {
  User = "user",
  Game = "game",
  Deal = "deal",
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
   * URI path.
   */
  path: string;

  constructor(resource: APIURIResource, path: string) {
    this.resource = resource;
    this.path = path;
  }

  /**
   * @returns String representation of URI.
   */
  toString(): string {
    return `${API_URI_SCHEMA}://${this.resource}/${this.path}`
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
