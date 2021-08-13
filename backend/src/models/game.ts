import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";

import { Deal } from "./deal";

@Entity()
export class Game {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  image_url: string;

  @OneToMany(() => Deal, (deal: Deal) => deal.game)
  deals: Deal[];
}
