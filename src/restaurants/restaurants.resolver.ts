import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  CreateRestaurantDto,
  CreateRestaurantDto2,
} from './dtos/create-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';

@Resolver((of) => Restaurant)
export class RestaurantResolver {
  @Query((returns) => [Restaurant])
  restaurants(@Args('veganOnly') veganOnly: boolean): Restaurant[] {
    return [];
  }
  @Mutation((returns) => Boolean)
  createRestaurant(
    @Args('createRestaurantInput') createRestaurantInput: CreateRestaurantDto,
  ): boolean {
    return true;
  }

  @Mutation((returns) => Boolean)
  createRestaurant2(
    @Args() createRestaurantInput: CreateRestaurantDto2,
  ): boolean {
    return true;
  }
}
