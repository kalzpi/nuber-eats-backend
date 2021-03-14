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

```Typescript
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
