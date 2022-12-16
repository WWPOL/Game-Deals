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
  /**
   * The primary key of the deal.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The user who submitted the deal.
   */
  @ManyToOne(() => User, user => user.deals, { nullable: false })
  author: User;

  /**
   * The game for which the deal pertains.
   */
  @ManyToOne(() => Game, game => game.deals, { nullable: false })
  game: Game;

  /**
   * Overrides the game's image for the deal. If null then the game's image will be used.
   */
  @Column({ nullable: true })
  image_url: string;

  /**
   * The URL where the deal is located.
   */
  @Column()
  link: string;

  /**
   * The price of the game when the deal is used.
   */
  @Column()
  price: number;

  /**
   * Date on which the deal begins.
   */
  @Column()
  start_date: Date;

  /**
   * Date on which the deal ends.
   */
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
