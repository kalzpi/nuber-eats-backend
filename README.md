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

## 3 TYPEORM AND NEST

### 3.1 Our First Entity

```typescript
import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity()
export class Restaurant {
  @Field((type) => Number)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => String)
  @Column()
  name: string;

  @Field((type) => Boolean, { nullable: true })
  @Column()
  isVegan?: boolean;

  @Field(() => String)
  @Column()
  address: string;

  @Field(() => String)
  @Column()
  ownerName: string;
}

```

기존의 @Field decorator나 @ObjectType decorator는 GraphQL schema를 자동 생성하기 위한 목적이었다면, TypeORM을 통해 database migration을 하기 위해서는 @Entity decorator가 필요하다. 이 두 가지의 decorator는 놀랍게도 같이 사용이 가능하며, 위와 같이 구성 하면 된다.
그러나 위 내용을 변경한다고 해서 곧바로 migration이 이루어지지 않는데, 왜냐하면 app.module.ts에서 typeormModule에 이 entity를 추가하지 않았기 때문이다.

```typescript
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: process.env.NODE_ENV !== 'prod',
      logging: true,
      entities: [Restaurant],
    }),
```

위와 같이 추가해주면, 자동으로 migration이 일어나서 db상에 Restaurant table이 추가된 것을 확인할 수 있다.
여기서 synchronize는 code 상에 database 구조 변경이 일어났을 시 동시에 DB 또한 변경 내용에 맞게 바꾸어주는 역할을 하는데, production 모드에서는 절대 원하지 않을 기능이기에 앞서 했던것과 마찬가지로 mode를 감지하여 none production에서만 true가 되도록 한다.

### 3.4 Create Restaurant

```typescript
@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
  ) {}
  getAll(): Promise<Restaurant[]> {
    return this.restaurants.find();
  }
  createRestaurant(
    createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {
    const newRestaurant = this.restaurants.create(createRestaurantDto);
    return this.restaurants.save(newRestaurant);
  }
}
```

RestaurantService에서 추가된 createRestaurant method를 보자. 여기서는 앞서 배운것 처럼 ArgsType을 이용한 CreateRestaurantDto를 argument로 받아, instance를 만든 뒤 Repository에 save해준다.
여기서 중요한 것은, 실제 DB를 구성하는 것은 restaurant.entity.ts에서 @Entity decorator를 사용해준 Restaurant class이지만 그 입력은 create-restaurant.dto.ts에서 정의한 CreateRestaurantDto를 통해 받고 있다. Argument의 모든 validation이나 type definition등은 dto에서 이루어지는데, 매번 entity를 update 할 때마다 관련된 dto들도 함께 이중 작성을 해 주어야 하는 불편함이 따른다. 이는 graphql-prisma를 사용할 때에도 느꼈던 불편함(Prisma datamodel과 graphql schema 이중 작성)이다.

### 3.5 Mapped Types

dto에 모든 type을 일일히 열거하기보다는 Mapped Types를 사용하는 것이 더 효율적인 코드를 구성하게 해준다. 다만 Mapped Types는 Parent type이 InputType이어야만 하는데, Restaurant type은 graphql schema 정의를 위해 ObjectType으로 이미 선언되어 있는 상태이다. 이 것에는 두 가지 방법이 있는데, 첫 번째로 아래와 같이 Mapped Type의 argument에 InputType을 작성하는 방법이다. 이러면 Parent type을 InputType으로 바꾸어 받는다.

```typescript
@InputType()
export class CreateRestaurantDto extends OmitType(
  Restaurant,
  ['id'],
  InputType,
) {}
```

혹은, 아래와 같이 entity에 abstract input type을 추가하는 방법도 있다.

```typescript
@InputType({isAbstract:true})
```

Mapped type을 사용하게 되며 validator들을 모두 잃었는데, validator는 entity에도 적용이 가능하다.


### 3.6 Optional Types and Columns

이제 우리는 Entity를 update할 때 세 가지를 동시에 신경써줘야 한다.
GraphQL schema, DB structure, validation

```typescript
  @Field((type) => Boolean, { defaultValue: false })
  @Column({ default: false })
  @IsOptional()
  @IsBoolean()
  isVegan?: boolean;
```

첫 번째 Field decorator의 defaultValue가 false이면, graphql mutation에서 isVegan을 보내지 않아도 dto는 isVegan:false를 갖게 된다. 두 번째 @Column에서 default: false는 DB의 restaurant table의 isVegan column 자체에 default값을 false로 지정해준다. 따라서 graphql이 아니라 manual로 sql query를 날려 row를 생성할 때에도 isVegan은 default false를 갖도록 해주는 것이다.
IsOptional은 validator에 이 값은 not required라는 것을 알려주는 역할을 한다.

### 3.7 Update Restaurant part One

update-restaurant.dto.ts 파일 추가.

```typescript
import { ArgsType, Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateRestaurantDto } from './create-restaurant.dto';

@InputType()
class UpdateRestaurantInputType extends PartialType(
  CreateRestaurantDto,
) {}

@ArgsType()
export class UpdateRestaurantDto {
  @Field((type) => Number)
  id: number;

  @Field((type) => UpdateRestaurantInputType)
  data: UpdateRestaurantInputType;
}

```

PartialType으로 Restaurant가 아니라 CreateRestaurantDto를 가져오는 이유는 id까지 optional로 하고싶지 않기 때문이다. 그런데 이렇게 하면 id를 받을 수 없는데, 해결 방식에는 두 가지가 있다.
첫 번째는 resolver의 updateRestaurant method에서 @Args 를 id와 dto 각각 지정해주는 방법이며, 두 번째는 위 코드와 같이 id과 UpdateRestaurantInputType을 같이 가지는 새로운 ArgsType을 생성해주는 방법이다.

## 4 USER CRUD

### 4.5 Create Account Mutation

```typescript
// enum for typeorm
enum UserRole {
  Client,
  Owner,
  Delivery,
}

// register enum for Graphql
registerEnumType(UserRole, { name: 'UserRole' });

@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class User extends CoreEntity {
  @Field((type) => String)
  @Column()
  email: string;

  @Field((type) => String)
  @Column()
  password: string;

  @Field((type) => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;
}
```

Typescript type definition과 typeorm decorator는 typescript enum type을 그대로 받아들일 수 있지만, graphql의 경우 다르다. registerEnumType을 통해 Enum을 따로 register 하여야 @Field decorator에서 이해할 수 있다.

## 5 USER AUTHENTICATION

### 5.1 Generating JWT

```typescript
// users.service.ts
import * as jwt from 'jsonwebtoken'
const token = jwt.sign({ id: user.id }, process.env.TOKEN_SECRET);
```

위와 같이 곧바로 process.env에 접근해서 필요한 값을 불러올 수도 있지만, Nestjs에서는 다른 방법을 권장한다.

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigService],
  providers: [UsersResolver, UsersService],
})
export class UsersModule {}
```

ConfigService를 users module에서 import하였는데, 이렇게 되면 Nestjs는 app.module에 import된 ConfigModule의 존재를 알아채고 users provider에서 config에 접근이 가능하도록 해준다.

```typescript
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}
```

우선은 UsersService class의 constructor에서 ConfigService type을 갖는 config를 선언해준다. 그러면 class 내부에서 config에 접근할 수 있게 되는데, 아래와 같이 env에 접근할 수 있다.

```typescript
const token = jwt.sign({ id: user.id }, this.config.get('TOKEN_SECRET'));
```

이것이 바로 Nestjs의 Dependency Injection이다.

### Dynamic Module and Static Module

```typescript
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
    UsersModule
```

.forRoot 안에서 Module의 configuration을 해주는 것이 Dynamic Module이고, UsersModule처럼 어떠한 configuration도 붙어있지 않은 것이 Static Module이다.
