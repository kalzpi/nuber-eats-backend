import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Like, Repository } from 'typeorm';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { DeleteDishInput, DeleteDishOutput } from './dtos/delete-dish.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { RestaurantsOutput, RestaurantsInput } from './dtos/restaurants.dto';
import { RestaurantInput, RestaurantOutput } from './dtos/retaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { Category } from './entities/category.entity';
import { Dish } from './entities/dish.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    private readonly categories: CategoryRepository,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
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
        order: {
          isPromoted: 'DESC',
        },
      });

      return {
        ok: true,
        category,
        totalPages: Math.ceil(totalItems / 15),
        restaurants: items,
        totalItems,
      };
    } catch (error) {
      return { ok: false, error: 'Could not load category' };
    }
  }

  async allRestaurants({ page }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [items, totalItems] = await this.restaurants.findAndCount({
        take: 15,
        skip: (page - 1) * 15,
        order: {
          isPromoted: 'DESC',
        },
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

  async findById({ restaurantId }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId, {
        relations: ['menu'],
      });
      if (!restaurant) return { ok: false, error: 'Could not find restaurant' };
      return { ok: true, restaurant };
    } catch (error) {
      return { ok: false, error: 'Could not find restaurant' };
    }
  }

  async searchRestaurant(
    searchRestaurantInput: SearchRestaurantInput,
  ): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalItems] = await this.restaurants.findAndCount({
        take: 15,
        skip: (searchRestaurantInput.page - 1) * 15,
        where: { name: Like(`%${searchRestaurantInput.query}%`) },
      });
      return {
        ok: true,
        restaurants,
        totalItems,
        totalPages: Math.ceil(totalItems / 15),
        page: searchRestaurantInput.page,
      };
    } catch (error) {
      return { ok: false, error: 'Could not find restaurant' };
    }
  }

  async createDish(
    authUser: User,
    createDishInput: CreateDishInput,
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findOne(
        createDishInput.restaurantId,
      );
      if (!restaurant) return { ok: false, error: 'Restaurant not found' };
      if (authUser.id !== restaurant.ownerId)
        return {
          ok: false,
          error: 'You can only add a menu to your restaurant.',
        };
      const dish = await this.dishes.save(
        this.dishes.create({ ...createDishInput, restaurant }),
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not create dish' };
    }
  }

  async editDish(
    authUser: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne(editDishInput.dishId, {
        relations: ['restaurant'],
      });
      if (!dish) return { ok: false, error: 'Dish not found' };
      if (authUser.id !== dish.restaurant.ownerId)
        return { ok: false, error: 'You cannot delete this dish.' };
      await this.dishes.save([
        {
          id: editDishInput.dishId,
          ...editDishInput,
        },
      ]);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Dish edit error' };
    }
  }

  async deleteDish(
    authUser: User,
    { dishId }: DeleteDishInput,
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findOne(dishId, {
        relations: ['restaurant'],
      });
      if (!dish) return { ok: false, error: 'Dish not found' };
      if (authUser.id !== dish.restaurant.ownerId)
        return { ok: false, error: 'You cannot delete this dish.' };
      await this.dishes.delete(dishId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Error' };
    }
  }
}
