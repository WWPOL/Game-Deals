import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
} from "typeorm";

import { User } from "~/models/User";
import { Game } from "~/models/Game";

@Entity()
export class Deal {
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
}
