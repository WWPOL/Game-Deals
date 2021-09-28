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
