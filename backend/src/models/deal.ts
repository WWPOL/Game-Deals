import {
  BaseEntity,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
} from "typeorm";

import {
  UniqueResource,
  APIURI,
  APIURIResource,
} from "./index";
import { User } from "./user";
import { Game } from "./game";

/**
 * An opportunity to obtain ownership of a game.
 */
@Entity()
export class Deal extends BaseEntity implements UniqueResource {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.deals)
  author: User;

  @ManyToOne(() => Game, game => game.deals)
  game: Game;

  @Column()
  start_date: Date;

  @Column()
  end_date: Date;

  /**
   * @returns A unique identifier.
   */
  uri(): APIURI {
    return new APIURI(APIURIResource.Deal, this.id.toString());
  }
}

/**
 * Deal authorization actions.
 */
export enum DealAction {
  /**
   * Create a deal.
   */
  Create = "create",

  /**
   * Retrieve a deal.
   */
  Retrieve = "retrieve",

  /**
   * Update a deal.
   */
  Update = "update",

  /**
   * Delete a deal.
   */
  Delete = "delete",
}
