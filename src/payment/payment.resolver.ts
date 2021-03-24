import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { Role } from 'src/auth/role.decorator';
import { User } from 'src/users/entities/user.entity';
import {
  CreatePaymentInput,
  CreatePaymentOutput,
} from './dtos/create-payment.dto';
import { GetPaymentsOutput } from './dtos/get-payments.dto';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';

@Resolver((of) => Payment)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation((returns) => CreatePaymentOutput)
  @Role(['Owner'])
  createPayment(
    @AuthUser() authUser: User,
    @Args('input') createPaymentInput: CreatePaymentInput,
  ): Promise<CreatePaymentOutput> {
    return this.paymentService.createPayment(authUser, createPaymentInput);
  }

  @Query((type) => GetPaymentsOutput)
  @Role(['Owner'])
  getPayments(@AuthUser() authUser: User): Promise<GetPaymentsOutput> {
    return this.paymentService.getPayments(authUser);
  }
}
