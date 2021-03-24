import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { User, UserRole } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    @Inject(PUB_SUB) private readonly pubsub: PubSub,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);

      if (!restaurant) return { ok: false, error: 'Restaurant Not Found' };

      let orderFinalPrice = 0;
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        const dish = await this.dishes.findOne(item.dishId);
        if (!dish) {
          return { ok: false, error: 'Wrong dishId' };
        }
        if (dish.restaurantId !== restaurant.id) {
          return { ok: false, error: 'Dish is not from that restaurant' };
        }
        let dishFinalPrice: number = dish.price;
        if (item.options) {
          for (const itemOption of item.options) {
            const dishOption = dish.options.find(
              (dishOption) => dishOption.name === itemOption.name,
            );
            if (dishOption) {
              if (dishOption.extraPrice) {
                dishFinalPrice += dishOption.extraPrice;
              } else {
                const dishOptionChoice = dishOption.choices.find(
                  (optionChoice) => optionChoice.name === itemOption.choice,
                );
                if (dishOptionChoice) {
                  if (dishOptionChoice.extraPrice) {
                    dishFinalPrice += dishOptionChoice.extraPrice;
                  }
                }
              }
            }
          }
        }
        orderFinalPrice += dishFinalPrice;
        const orderItem = await this.orderItems.save(
          this.orderItems.create({
            dish,
            options: item.options,
          }),
        );
        orderItems.push(orderItem);
      }
      const order = await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderFinalPrice,
          items: orderItems,
        }),
      );
      await this.pubsub.publish(NEW_PENDING_ORDER, {
        pendingOrders: { order, ownerId: restaurant.ownerId },
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Cannot create order' };
    }
  }

  async getOrders(
    authUser: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[];
      switch (authUser.role) {
        case UserRole.Client: {
          orders = await this.orders.find({
            customer: authUser,
            ...(status && { status }),
          });
          break;
        }
        case UserRole.Delivery: {
          orders = await this.orders.find({
            driver: authUser,
            ...(status && { status }),
          });
          break;
        }
        case UserRole.Owner: {
          const restaurants = await this.restaurants.find({
            where: {
              owner: authUser,
            },
            relations: ['orders'],
          });
          orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
          if (status) {
            orders = orders.filter((order) => order.status === status);
          }
          break;
        }
        default:
          return { ok: false, error: 'Permission denied.' };
      }
      return { ok: true, orders };
    } catch (error) {
      return { ok: false, error: 'Could not get orders.' };
    }
  }

  authChecker(order: Order, user: User): boolean {
    switch (user.role) {
      case UserRole.Client:
        if (order.customerId !== user.id) return false;
        break;
      case UserRole.Owner:
        if (order.restaurant.ownerId !== user.id) return false;
        break;
      case UserRole.Delivery:
        if (order.driverId !== user.id) return false;
        break;
      default:
        return false;
    }
    return true;
  }

  async getOrder(
    authUser: User,
    { id: orderId }: GetOrderInput,
  ): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId, {
        relations: ['restaurant'],
      });
      if (!order) return { ok: false, error: 'No order with that ID' };
      const authCheck = this.authChecker(order, authUser);
      if (!authCheck) return { ok: false, error: 'No authorization.' };
      return { ok: true, order };
    } catch (error) {
      return { ok: false, error: 'Could not load order' };
    }
  }

  async editOrder(
    authUser: User,
    { id: orderId, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId, {
        relations: ['restaurant'],
      });
      if (!order) return { ok: false, error: 'Order not found' };
      const authCheck = this.authChecker(order, authUser);
      if (!authCheck) return { ok: false, error: 'Permission denied.' };

      if (authUser.role === UserRole.Client)
        return { ok: false, error: 'You cannot edit it' };

      if (authUser.role === UserRole.Owner) {
        if (status !== OrderStatus.Cooking && status !== OrderStatus.Cooked) {
          return { ok: false, error: 'You cannot do it' };
        }
      }

      if (authUser.role === UserRole.Delivery) {
        if (
          status !== OrderStatus.PickedUp &&
          status !== OrderStatus.Delivered
        ) {
          return { ok: false, error: 'You cannot do it' };
        }
      }
      await this.orders.save({
        id: orderId,
        status,
      });
      const newOrder = { ...order, status };
      if (status === OrderStatus.Cooked) {
        await this.pubsub.publish(NEW_COOKED_ORDER, {
          cookedOrders: newOrder,
        });
      }
      await this.pubsub.publish(NEW_ORDER_UPDATE, { orderUpdates: newOrder });

      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'Cound not change status.' };
    }
  }
}
