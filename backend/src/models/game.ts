import {
  BaseEntity,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";

import {
  UniqueResource,
  APIURI,
  APIURIResource,
  DBResource,
} from "./index";
import { Deal } from "./deal";

/**
 * A piece of media which a user can obtain and play.
 */
@Entity()
export class Game extends BaseEntity implements UniqueResource {
  /**
   * Primary key of game.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * User friendly title of game.
   */
  @Column()
  name: string;

  /**
   * URL to an image cover for the game.
   */
  @Column()
  image_url: string;

  /**
   * The deals which grant access to the game.
   */
  @OneToMany(() => Deal, (deal: Deal) => deal.game)
  deals: Deal[];

  /**
   * @returns A unique identifier.
   */
  uri(): APIURI {
    return new APIURI(DBResource.Game, this.id.toString());
  }
}

/**
 * Game authorization actions.
 */
export enum GameAction {
  /**
   * Create a game.
   */
  Create = "game#create",

  /**
   * Retrieve a game's details.
   */
  Retrieve = "game#retrieve",

  /**
   * Update a game's details.
   */
  Update = "game#update",

  /**
   * Delete a game.
   */
  Delete = "game#delete",
}
