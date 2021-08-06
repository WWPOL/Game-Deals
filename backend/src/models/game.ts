import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from "typeorm";

import { Deal } from "~/models/Deal";

@Entity()
export class Game {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  image_url: string;

  @OneToMany(() => Deal,  deal => deal.game)
  deals: Deal[];
}
