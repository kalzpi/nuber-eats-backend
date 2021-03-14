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

### 1.5 Validating ArgsTypes

특별할 것은 없다. class-validator를 사용하려면 main.ts에 app.useGlobalPipes를 활성화 하는것을 잊지말자.

## 2 DATABASE CONFIGURATION

### 2.5 Configuration ConfigService

Nestjs는 dotenv 위에서 작동하는 config 모듈을 제공한다.
여기에 cross-env를 사용하여 package.json에서 각 mode에 대해 process.env에서 접근 가능한 변수를 실행 명령에서 구분하여 줄 수 있는데, 이를 ConfigModule에서 읽어들여 각 mode마다 어떠한 env file을 사용할지 설정할 수 있다.

### 2.6 Validating ConfigService

```typescript
import * as Joi from 'joi'

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'dev' ? '.env.dev' : '.env.test',
      ignoreEnvFile: process.env.NODE_ENV === 'prod',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('dev', 'prod'),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),
      }),
    }),
```

우선, Joi는 javascript로 만들어진 package라 위와 같이 import하여야 한다. 위 코드를 통해 env 내의 문구 또한 validation이 가능해진다.
