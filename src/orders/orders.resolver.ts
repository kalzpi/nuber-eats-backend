import { Args, Mutation, Resolver, Query, Subscription } from '@nestjs/graphql';
import { Order } from './entities/order.entity';
import { OrderService } from 'src/orders/orders.service';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/auth/role.decorator';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

@Resolver((of) => Order)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Mutation((returns) => CreateOrderOutput)
  @Role(['Client'])
  createOrder(
    @AuthUser() customer: User,
    @Args('input') createOrderInput: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    return this.orderService.createOrder(customer, createOrderInput);
  }

  @Query((returns) => GetOrdersOutput)
  @Role(['Any'])
  getOrders(
    @AuthUser() authUser: User,
    @Args('input') getOrdersInput: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    return this.orderService.getOrders(authUser, getOrdersInput);
  }

  @Query((returns) => GetOrderOutput)
  @Role(['Any'])
  getOrder(
    @AuthUser() authUser: User,
    @Args('input') getOrderInput: GetOrderInput,
  ): Promise<GetOrderOutput> {
    return this.orderService.getOrder(authUser, getOrderInput);
  }

  @Mutation((returns) => EditOrderOutput)
  @Role(['Any'])
  editOrder(
    @AuthUser() authUser: User,
    @Args('input') editOrderInput: EditOrderInput,
  ): Promise<EditOrderOutput> {
    return this.orderService.editOrder(authUser, editOrderInput);
  }

  @Mutation((returns) => Boolean)
  hotKimchiReady() {
    pubsub.publish('hotKimchi', { kimchi: 'Kimchi is the world best food!' });
    return true;
  }

  @Subscription((returns) => String)
  @Role(['Any'])
  kimchi(@AuthUser() user: User) {
    return pubsub.asyncIterator('hotKimchi');
  }
}
