# Nuber eats backend

## GRAPHQL API

### 1.0 Apollo Server Setup

### 1.1 Our First Resolver

Code first approach will be done.

```Typescript
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
```

위에서 autoSchemaFile: true 로만 적어두면 스키마 파일을 실제로 생성하지 않고 메모리에서만 생성한다.

```typescript
@Resolver()
export class RestaurantResolver {
  @Query(() => Boolean)
  isWorking(): Boolean {
    return true;
  }
}
```

Return type definition in @Query decorator is for graphql schema.(Required)
Return type definition in isWorking() is for typescript.(Optional)

### 1.2 ObjectType

```typescript
// ./src/restaurants/entities/restaurant.entity.ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Restaurant {
  @Field(() => String)
  name: string;
  @Field((type) => Boolean, { nullable: true })
  isGood?: boolean;
}
```

ObjectType decorator를 사용하여 Typescript class를 GraphQL type으로도 정의할 수 있게 함.

### 1.3 Arguments

```typescript
@Resolver((of) => Restaurant)
export class RestaurantResolver {
  @Query((returns) => [Restaurant])
  restaurants(@Args('veganOnly') veganOnly: boolean): Restaurant[] {
    return [];
  }
}
```

Nestjs REST API때와 마찬가지로, argument 또한 decorator로 요청할 수 있다. 여기서 편리한 것은, argument의 type을 typescript 방식으로만 정의 해 두어도 graphql Playground에서 확인해 보면 argument의 type definition이 잘 이루어지고 있다는 점이다.


### 1.4 InputTypes and ArgTypes

Argument의 수가 많아지게 되면, resolver의 decorator 안에 너무 많은 argument를 정의하여야 하므로 가독성이 떨어지며, 재활용에도 문제가 있다. 따라서 InputType을 지정하여 조금 더 나은 코드를 작성할 수 있다.

```typescript
// src/restaurants/dtos/create-restaurant.dto.ts
@InputType()
export class CreateRestaurantDto {
  @Field((type) => String)
  name: string;
  @Field((type) => Boolean)
  isVegan: boolean;
  @Field((type) => String)
  address: string;
  @Field((type) => String)
  ownerName: string;
}

// src/restaurants/restaurants.resolver.ts
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
}
```

다만 이 경우 한가지 불편함이 존재하는데, 아래와 같이 graphql query를 날려야 한다는 점이다.

```graphql
mutation {
    createRestaurant(
        createRestaurantInput:{
            name: "Foo",
            isVegan: false,
            address: "Foo",
            ownerName: "John Doe"
        }
    ){

    }
}
```

ArgTypes를 사용하면 아래와 같이 바꿀 수 있다.

```typescript
// src/restaurants/dtos/create-restaurant.dto.ts
@ArgsType()
export class CreateRestaurantDto2 {
  @Field((type) => String)
  name: string;
  @Field((type) => Boolean)
  isVegan: boolean;
  @Field((type) => String)
  address: string;
  @Field((type) => String)
  ownerName: string;
}

// src/restaurants/restaurants.resolver.ts
@Resolver((of) => Restaurant)
export class RestaurantResolver {
  @Query((returns) => [Restaurant])
  restaurants(@Args('veganOnly') veganOnly: boolean): Restaurant[] {
    return [];
  }
  @Mutation((returns) => Boolean)
  createRestaurant2(
    @Args() createRestaurantDto: CreateRestaurantDto,
  ): boolean {
    return true;
  }
}
```

```graphql
mutation {
    createRestaurant(        
            name: "Foo",
            isVegan: false,
            address: "Foo",
            ownerName: "John Doe"
    ){

    }
}
```