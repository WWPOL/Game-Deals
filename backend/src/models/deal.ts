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
  DBResource,
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

  @ManyToOne(() => User, user => user.deals, { nullable: false })
  author: User;

  @ManyToOne(() => Game, game => game.deals, { nullable: false })
  game: Game;

  @Column()
  start_date: Date;

  @Column()
  end_date: Date;

  /**
   * @returns A unique identifier.
   */
  uri(): APIURI {
    return new APIURI(DBResource.Deal, this.id.toString());
  }
}

/**
 * Deal authorization actions.
 */
export enum DealAction {
  /**
   * Create a deal.
   */
  Create = "deal#create",

  /**
   * Retrieve a deal.
   */
  Retrieve = "deal#retrieve",

  /**
   * Update a deal.
   */
  Update = "deal#update",

  /**
   * Delete a deal.
   */
  Delete = "deal#delete",
}
