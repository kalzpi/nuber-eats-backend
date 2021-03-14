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
