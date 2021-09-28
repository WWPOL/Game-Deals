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
