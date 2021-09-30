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
} from "./index";
import { Deal } from "./deal";

/**
 * A piece of media which a user can obtain and play.
 */
@Entity()
export class Game extends BaseEntity implements UniqueResource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  image_url: string;

  @OneToMany(() => Deal, (deal: Deal) => deal.game)
  deals: Deal[];

  /**
   * @returns A unique identifier.
   */
  uri(): APIURI {
    return new APIURI(APIURIResource.Game, this.id.toString());
  }
}

/**
 * Game authorization actions.
 */
export enum GameAction {
  /**
   * Create a game.
   */
  Create = "create",

  /**
   * Retrieve a game's details.
   */
  Retrieve = "retrieve",

  /**
   * Update a game's details.
   */
  Update = "update",

  /**
   * Delete a game.
   */
  Delete = "delete",
}
