import {
  BaseEntity,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';

import {
  UniqueResource,
  APIURI,
  APIURIResource,
} from "./index";
import { Deal } from "./deal";

/**
 * A person who can administer content on the platform. Does not represent a person who is simply a viewing the website.
 */
@Entity()
export class User extends BaseEntity implements UniqueResource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password_hash: string;

  @Column()
  must_reset_password: boolean;

  @OneToMany(() => Deal, deal => deal.author)
  deals: Deal[];

  /**
   * @returns A unique identifier.
   */
  uri(): APIURI {
    return new APIURI(APIURIResource.User, this.id.toString());
  }
}

/**
 * Authorization actions for a user.
 */
export enum UserAction {
  /**
   * Make a new user.
   */
  Create = "create",

  /**
   * View non-secure details about a user.
   */
  RetrieveNonSecure = "retrieve_non_secure",

  /**
   * View secure details about a user.
   */
  RetrieveSecure = "retrieve_secure",

  /**
   * Update a user's details. This does not include password changes.
   */
  UpdateNonSecure = "update_non_secure",

  /**
   * Update a user's secure details like password and must reset password.
   */
  UpdateSecure = "update_secure",

  /**
   * Delete a user.
   */
  Delete = "delete",

  /**
   * Attempt to authenticate as a user.
   */
  Authenticate = "Authenticate"
}
