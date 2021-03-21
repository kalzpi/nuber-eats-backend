import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import { Category } from './entities/category.entity';
import { Restaurant } from './entities/restaurant.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async getOrCreateCategory(name: string): Promise<Category> {
    const trimmedName = name.trim().toLowerCase();
    const slug = trimmedName.replace(/ /g, '-');
    let category = await this.categories.findOne({ slug });
    if (!category) {
      category = await this.categories.save(
        this.categories.create({ slug, name }),
      );
    }
    return category;
  }

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      const category = await this.getOrCreateCategory(
        createRestaurantInput.name,
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

      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Could not edit restaurant' };
    }
  }
}
