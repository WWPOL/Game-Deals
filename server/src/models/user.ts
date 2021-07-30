import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';

import { Deal } from "~/models/deal";

@Entity()
export class User {
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
}
