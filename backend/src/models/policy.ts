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
  DBResource,
} from "./index";

@Entity()
export class AuthorizationPolicy extends BaseEntity implements UniqueResource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  logical_name: string;

  
  @Column()
  policy_type: string;

  @Column("text", { array: true })
  policy: string[];

  /**
   * @returns A unique identifier.
   */
  uri(): APIURI {
    return new APIURI(DBResource.AuthorizationPolicy, this.logical_name);
  }
}
