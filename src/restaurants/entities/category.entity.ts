import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@InputType('CategoryInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Field(() => String)
  @Column({ unique: true })
  @IsString()
  name: string;

  @Field(() => String)
  @Column({ unique: true })
  @IsString()
  slug: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @Field((type) => [Restaurant])
  @OneToMany((type) => Restaurant, (restaurant) => restaurant.category)
  restaurants: Restaurant[];
}
