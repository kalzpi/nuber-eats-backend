import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { RestaurantOutput, RestaurantsInput } from './dtos/restaurants.dto';
import { Category } from './entities/category.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    private readonly categories: CategoryRepository,
  ) {}

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.categories.getOrCreate(
        createRestaurantInput.categoryName,
      );
      newRestaurant.category = category;
      await this.restaurants.save(newRestaurant);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not create restaurant.' };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      const targetRestaurant = await this.restaurants.findOne(
        editRestaurantInput.restaurantId,
      );
      if (!targetRestaurant) {
        return { ok: false, error: 'Restaurant not found' };
      }
      if (owner.id !== targetRestaurant.ownerId) {
        return {
          ok: false,
          error: 'You cannot edit a restaurant not yours',
        };
      }
      let category: Category = null;
      if (editRestaurantInput.categoryName)
        category = await this.categories.getOrCreate(
          editRestaurantInput.categoryName,
        );
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          ...(category && { category }),
        },
      ]);

      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not edit restaurant' };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const targetRestaurant = await this.restaurants.findOne(restaurantId);
      if (!targetRestaurant)
        return { ok: false, error: 'Restaurant not found' };
      if (owner.id !== targetRestaurant.ownerId)
        return {
          ok: false,
          error: 'You cannot delete restaurant which is not yours',
        };
      await this.restaurants.delete({ id: restaurantId });
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      return {
        ok: true,
        categories,
      };
    } catch (error) {
      return { ok: false, error: 'Could not load categories' };
    }
  }

  countRestaurant(category: Category): Promise<number> {
    const count = this.restaurants.count({ category });
    return count;
  }

  async findCategoryBySlug({
    slug,
    page,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({ slug });
      if (!category) return { ok: false, error: 'No category with that name' };
      const [items, totalItems] = await this.restaurants.findAndCount({
        where: { category },
        take: 15,
        skip: (page - 1) * 15,
      });

      return {
        ok: true,
        category,
        totalPages: Math.ceil(totalItems / 15),
        items,
        totalItems,
      };
    } catch (error) {
      return { ok: false, error: 'Could not load category' };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantOutput> {
    try {
      const [items, totalItems] = await this.restaurants.findAndCount({
        take: 15,
        skip: (page - 1) * 15,
      });
      return {
        ok: true,
        items,
        totalItems,
        page,
        totalPages: Math.ceil(totalItems / 15),
      };
    } catch (error) {
      return { ok: false, error: 'Could not load restaurants' };
    }
  }
}
