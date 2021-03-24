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
  createRestaurant2(@Args() createRestaurantDto: CreateRestaurantDto): boolean {
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
class UpdateRestaurantInputType extends PartialType(CreateRestaurantDto) {}

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
import * as jwt from 'jsonwebtoken';
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
  UsersModule;
```

.forRoot 안에서 Module의 configuration을 해주는 것이 Dynamic Module이고, UsersModule처럼 어떠한 configuration도 붙어있지 않은 것이 Static Module이다.

### 5.4 JWT Module part Two

JwtModule 내부에 forRoot method를 정의해준다.

```typescript
@Module({})
@Global()
export class JwtModule {
  static forRoot(options: JwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      providers: [JwtService, { provide: CONFIG_OPTIONS, useValue: options }],
      exports: [JwtService],
    };
  }
}
```

이 method는 아래 JwtModuleOptions interface 형태로 인자를 제공받아, DynamicModule을 return하는 method이다.

```typescript
export interface JwtModuleOptions {
  privateKey: string;
}
```

DynamicModule에서 providers에 JwtService를 입력하는 것은 일종의 short cut으로, 제대로 풀어서 쓰면 아래와 동일하다.

```typescript
{provide: JwtService, useClass: JwtService}
```

providers array 안에는 아래와 같이 직접 값을 전달할 수도 있다.

```typescript
{ provide: CONFIG_OPTIONS, useValue: options }
```

여기서 CONFIG_OPTIONS는 별도의 constant.ts file에 정의해준 string이다. useClass 대신 useValue를 사용하여 JwtModule.forRoot()의 인자인 options를 provider를 통해 전달한다. 이것은 service에서 아래와 같이 불러와 사용 가능하다.

```typescript
@Injectable()
export class JwtService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: JwtModuleOptions,
  ) {
    console.log(options);
  }
  hello() {}
}
```

여기서 options를 console.log 해보면 app.module에서 forRoot 안에 넣어주었던 {primaryKey: "some env key"} 를 출력하는 것을 알 수 있다.

### 5.5 JWT Module part Three

이제 앞서 usersService에서 직접 jwt를 import하고 global module인 ConfigModule을 import해서 token을 생성하던 내용들을 모두 지운다.

대신 아래와 같이 JwtService의 sign method를 통해 token을 받게 수정한다.

```typescript
// jwt.service.ts
import * as jwt from 'jsonwebtoken';
import { Inject, Injectable } from '@nestjs/common';
import { JwtModuleOptions } from './jwt.interfaces';
import { CONFIG_OPTIONS } from './jwt.constants';

@Injectable()
export class JwtService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: JwtModuleOptions,
  ) {}
  sign(payload: object): string {
    return jwt.sign(payload, this.options.privateKey);
  }
}

// user.service.ts
const token = this.jwtService.sign({ id: user.id });
```

여기서 주목할점은 sign method가 payload라는 object를 인자로 받는다는 점이다. 따라서 이 JwtModule은 어느 프로젝트에서든 import해서 사용할 수 있는 Module이다. 단순히 제공받은 payload를 env의 secret을 이용하여 token화 해주는 method이기 때문이다. 만약 이것을 원하지 않고 오로지 이 프로젝트만을 위해, 그리고 token안에 들어가는 information을 userId에만 국한하려면 payload 대신 userId 인자를 사용하고 sign에서도 userId만을 전달해주면 된다. 나는 재사용 가능한 현재의 컨셉이 마음에 들어 유지할 생각이다.

또한 5장에서 정의한 JwtModule의 forRoot method는 사실 더 간단한 해결방안이 있었다. JwtService에서 global module인 ConfigModule을 import하고 거기에서 env에 접근해도 동일하게 작동하기 때문이다. 그러나 실제로 DynamicModule을 어떻게 정의하고 활용하는지 알아보기 위해 굳이 조금 더 어려운 길을 선택하여 구현한 것이다.

### 5.6 Middlewares in NestJS

아래와 같이 jwt middleware를 생성해준다.

```typescript
// jwt.middleware.ts
import { NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export class JwtMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(req.headers);
    next();
  }
}
```

이 Middleware를 적용하고싶은 App의 module에 사용하면 된다. 여기서는 jwt middleware를 모든 곳에서 사용하고 싶기 때문에 아래와 같이 app module에 적용한다.

```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/graphql',
      method: RequestMethod.POST,
    });
  }
}
```

Middleware를 만들 때 반드시 NestMiddleware interface를 implements 해야하는 것은 아니다. 이것은 단지 미리 정의된 NestMiddleware와 동일하게 행동해라는 뜻으로, custom function을 middleware로서 사용하는 것도 가능하다.

```typescript
// jwt.middleware.ts
import { NextFunction, Request, Response } from 'express';

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log(req.headers);
  next();
}

// app.modules.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(jwtMiddleware).forRoutes({
      path: '/graphql',
      method: RequestMethod.POST,
    });
  }
}
```

혹은 아래와 같이 main.ts에서 사용하는 것도 가능하다.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(jwtMiddleware);
  await app.listen(3000);
}
bootstrap();
```

이 경우 app의 모든 영역에서 이 middleware가 작동하게 된다.

다만 이 프로젝트에서 JwtMiddleware는 user repository에 접근할 것이기 때문에 class middleware를 사용한다.
repository 혹은 dependency injection 등을 사용해야 하면 class middleware를 써야 하고, 이 경우 main.ts에서 사용 할 수는 없다.

### 5.8 GraphQL Context

```typescript
@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    if ('x-jwt' in req.headers) {
      const token = req.headers['x-jwt'];
      const decoded = this.jwtService.verify(token.toString());
      if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
        try {
          const user = await this.userService.findById(decoded['id']);
          req['user'] = user;
        } catch (error) {}
      }
    }
    next();
  }
}
```

이제 middleware 내용을 채우자. 우선 jwtMiddleware는 req를 중간에 가로채서 그 안의 token을 읽어들여야 하고, token 안에 있는 user id 정보를 통해 user를 찾아 req['user']에 그 정보를 주고 next() 를 실행하여 본래의 route로 req를 보낸다.
따라서 dependency injection이 필요하다. 먼저 @Injectable decorator를 붙여주고 constructor 안에서 jwtService와 userService를 불러온다. 여기서 UsersService는 에러가 날 것인데, usersModule에서 export를 해 주어야 한다.

jwtService에는 token을 비교하는 verify method를 추가해주고 JwtMiddleware에서 req의 x-jwt에 할당된 string을 inject된 jwtservice의 verify method로 전달하여 decoded된 {id:"some user id"}를 받는다.

userService에 findById: id로 user를 찾아 return하는 method를 추가하고 위에서 찾은 id로 user를 찾아낸다.

middleware는 이 user를 req['user']에 할당하여 전달해준다.

그렇다면 이 req.user에는 어떻게 접근하여야 할까? 정답은 context 사용이다. Apollo server에서 사용하는 context 개념은 GraphQLModule의 config에서도 사용 가능하다.

```typescript
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req }) => ({ user: req['user'] }),
    }),
```

이 context는 이제 어디에서든 접근 가능해지며, 아래와 같이 me method에서 user를 return하도록 하는 것으로 마무리된다.

```typescript
  @Query((returns) => User)
  me(@Context() context) {
    if (!context.user) {
      return;
    } else {
      return context.user;
    }
  }
```

@Context decorator가 사용되었음에 주의하라.

그런데 사실 이 방법은 좋지 않다. 모든 Resolver에서 같은 내용을 계속하여 적어주어야 하기 때문이다. context안에 user가 있는지 없는지를 매번 모든 resolver에 작성하는 것은 바람직하지 않기 때문에 Guard를 사용해야 한다.

### 5.14 updateProfile part Two

edit-profile-dto에서 우리는 아래와 같이 EditProfileInput을 이중 mapped type으로 정의했다.

```typescript
@InputType()
export class EditProfileInput extends PartialType(
  PickType(User, ['email', 'password']),
) {}
```

User type에서 email과 password field만 가져오는 PickType의 partial type을 mapped type으로 선언하고 있다. 이말인즉슨 EditProfileInput은 email, password를 field로 가지지만 필수로 요구하지는 않는 type인 것이다.

그런데 GraphQL playground에서 위 type을 input으로 사용하는 editProfile mutation을 불러오고 email만 전달하면 에러가 발생한다.

이것은 object destructuring의 문제인데, 아래와 같이 usersService에서 EditProfileInput의 인자 email, password를 object destructuring 하고 있기 때문이다.

```typescript
  async editProfile(userId: number, { email, password }: EditProfileInput) {
    return this.users.update(userId, { email, password });
  }
```

GraphQL에서 password에 아무 값도 주지 않으니 위와 같이 선언하면 password는 undefined가 될 수 밖에 없는 것이다. 아래와 같이 선언하면 올바르게 작동한다.

```typescript
  async editProfile(userId: number, editProfileInput: EditProfileInput) {
    return this.users.update(userId, { ...editProfileInput });
  }
```

하지만 이 update method에는 큰 특징이 있는데, 이것은 매우 빠른 update method이지만 entity가 실제로 있는지는 체크하지 않는다는 것이다. 즉, 이 method는 users entity를 update하고 있지 않으며 곧바로 DB에 쿼리를 날리고 있다.

이것이 왜 문제가 되냐면, password의 경우에는 현재 entity에서 BeforeInsert, BeforeUpdate 등의 decorator로 entity가 저장되기 전에 hashing해 주는 method가 작동 중인데 이렇게 update를 사용할때는 위 decorator들이 불러지지 않는 것이다.

entity.save() 존재하지 않는 entity는 save하고, 존재하는 entity는 update한다.

따라서 아래와 같이 수정한다.

```typescript
  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<User> {
    const user = await this.users.findOne(userId);
    if (email) user.email = email;
    if (password) user.password = password;
    return this.users.save(user);
  }
```

다만 BeforeUpdate decorator에는 문제가 있는데, password가 아닌 다른 값을 update 할 때에도 이 decorator가 작동해서 현재 hashing된 password를 다시 한번 hashing해린다.
이 부분은 나중에 수정 예정.

### 6.2 Verifying User part One

Relation 관계가 정의된 entity를 불러올 때 유의해야 할 것이 있다. 지금은 verification에서 user에 접근하기 위해 One-to-one relation을 verification entity에서 선언해 주었다. 하지만 막상 usersService에서 verification repository에 접근해서 verification.user를 불러와 보면 undefined로 나오는 것을 볼 수 있다.

```typescript
  async verifyEmail(code: string): Promise<boolean> {
    const verification = await this.verifications.findOne(
      { code }
    );
    if (verification) {
      console.log(verification);
    }
    return false;
  }
```

Entity를 불러올 때 그 relation을 함께 가져오는 것은 사실 상당히 비싼 기능이다. 따라서 TypeORM에서 relation을 함께 불러오고 싶다면 명시적으로 선언을 해 주어야 한다.

```typescript
  async verifyEmail(code: string): Promise<boolean> {
    const verification = await this.verifications.findOne(
      { code },
      { relations: ['user'] },
    );
    if (verification) {
      console.log(verification);
    }
    return false;
  }
```

이렇게 해 두면 verification은 아래와 같이 user까지 함께 nest된 결과물을 보여주게 된다.

```
Verification {
  id: 1,
  createdAt: 2021-03-16T04:31:01.312Z,
  UpdatedAt: 2021-03-16T04:31:01.312Z,
  code: '39495be7-ceb0-40eb-91a5-d4e348304dd7',
  user: User {
    id: 6,
    createdAt: 2021-03-16T04:31:01.267Z,
    UpdatedAt: 2021-03-16T04:31:01.267Z,
    email: 'test@test.com',
    password: '$2b$10$5HvAaE4/K.SSQ.cth6uaA.1rMpr8CZXf6iNwaD7nigwPJpmVtYLpe',
    role: 2,
    isVerified: false
  }
}
```

만약 option에서 {relation} 대신 {loadRelationId: true}로 설정해 주면 위처럼 User object 자체를 다 보여주는 것이 아니라 id로만 보여준다.

### 6.3 Verifying User part Two

앞서 말한 hashPassword method의 문제점을 해결해보자. 두 가지 변경사항이 있는데, 첫 번째는 password field에 옵션을 주어 select되지 않도록 하는 것이다.

```typescript
  @Field((type) => String)
  @Column({ select: false })
  @IsString()
  password: string;
```

이렇게 column decorator에 옵션을 주면 이제 user entity에서 password는 select되지 않는다. 여기에 더해서 hashPassword는 user entity가 password를 갖고 있을 때에만 hashing이 실행되도록 조건을 부여한다.

```typescript
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      try {
        this.password = await bcrypt.hash(this.password, 10);
      } catch (e) {
        console.log(e);
        throw new InternalServerErrorException();
      }
    }
  }
```

이러면 한 가지 문제가 발생하는데, 바로 login과 같이 user가 입력한 password와 그 id로 select 한 user entity의 password를 비교하는 것이 불가능해진다는 것이다(password는 undefined가 될 것이다.) select:false로 설정된 필드는 아래와 같이 명시적으로 선언해주면 불러올 수 있게 된다.

```typescript
const user = await this.users.findOne(
  { email },
  { select: ['id', 'password'] },
);
if (!user) {
  return { ok: false, error: 'Invalid Credential' };
}
const passwordCorrect = await user.checkPassword(password);
if (!passwordCorrect) return { ok: false, error: 'Invalid Credential' };
const token = this.jwtService.sign({ id: user.id });
return { ok: true, token };
```

select에 id까지 함께 불러온 이유는, 이렇게 명시적으로 select해 올 필드를 선언할 경우에는 정확하게 그 필드만을 불러오기 때문이다. 따라서 email만 select 해줄 경우 passwordCorrect까지는 true가 되겠지만, user.id가 undefined상태로 전달된 효력없는 token이 생성된다. 위와 같이 id도 함께 명시해주어야 한다.

### 10.8 Edit Restaurant part Two

- @relationId decorator

Restaurant entity는 User type field owner를 갖고, ManyToOne decorator를 사용하여 User와의 관계를 정의하고 있다. 그렇다면 차후 service에서 restaurant를 불러올 때 비교를 위해 userId만 불러오고 싶으면 어떻게 해야할까?

방법 1. this.restaurants.find({id:RestaurantId}).owner.userId
가장 직관적이지만 매우 느리다. userId 하나를 불러오기 위해 user object 전체를 불러온 뒤 그 안에서 다시 id를 보아야 하기 때문.

방법 2. findOne method에서 {loadRelationIds:true}를 두 번째 인자로 넣는 방법
이것 또한 다른 문제를 불러온다, 아래 코드를 보자.

```typescript
const restaurant = this.restaurants.findOne(
  { id: 1 },
  { loadRelationIds: true },
);
if (user !== restaurant.owner) {
  throw new Error();
}
```

위 코드는 작동하지 않을 것이다. 왜냐하면 restaurant.owner는 User type이라고 정의 해 뒀기 때문이다.

방법 3. 결론적으로 아래 방법대로 진행해야한다.

```typescript
  @Field((type) => User)
  @ManyToOne((type) => User, (user) => user.restaurants, {
    onDelete: 'CASCADE',
  })
  owner: User;

  @RelationId((restaurant:Restaurant)=>restaurant.owner)
  ownerId:number;
```

### Order Subscription

- Pending Orders (Owner) / s: newOrder / t: createOrder(newOrder)
- OrderStatus (Customer, Delivery, Owner) / s: orderUpdate / t: editOrder(orderUpdate)
- Pending Pickup Order (Delivery) / s: orderUpdate / t: editOrder(orderUpdate)

Who: Client
How: Create
What: Order
When: Any time
To: Onwer of Restaurant
Action: Accept or Decline Order

Who: Client
How: Cancel
What: Order
When: After place an order && Before accepted by Owner
To: Owner
Action: Cancel notice

Who: Owner
How: Accept
What: Order
To: Nearby Delivery
Action: Accept or Decline Delivery

Who: Delivery
How: Accept
What: Delivery
To: Owner
Action: Delivery accepted notice

Who: Owner
How: Cooked
What: Order
To: Delivery
Action: Cooked notice

Who: Delivery
How: Picked
What: Order
To: Client, Owner
Action: Picked notice

Who: Delivery
How: Delivered
What: Order
To: Client Owner
Action: Delivered notice
