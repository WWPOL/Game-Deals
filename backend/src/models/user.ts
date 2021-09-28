import {
  BaseEntity,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';

import {
  UniqueResource,
  APIURI,
  APIURIResource,
} from "./index";
import { Deal } from "./deal";

@Entity()
export class User extends BaseEntity implements UniqueResource {
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

  /**
   * @returns A unique identifier.
   */
  uri(): APIURI {
    return new APIURI(APIURIResource.User, this.id.toString());
  }
}
