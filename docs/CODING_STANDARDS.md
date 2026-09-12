# Coding Standards

This document defines naming conventions, code style, and structural conventions for both `api` and `client`, based on the conventions **already in consistent use** in this codebase — not a generic starter-kit standard. The goal is that any new file looks like it was written by the same person who wrote everything else.

## Tooling

```bash
npm run lint         # api: eslint --fix ; client: eslint
npm run format        # api: prettier --write
```

**A PR with lint errors does not meet the Definition of Done** — see `DEFINITION_OF_DONE.md`.

## TypeScript

Both `api` and `client` use **strict mode**. No implicit `any`. If a type is genuinely unknown, use `unknown` and narrow it.

```typescript
// ❌ Avoid
function parseInput(data: any) { ... }

// ✅ Prefer
function parseInput(data: unknown) {
  if (typeof data === 'string') { ... }
}
```

## File naming — kebab-case for backend files, PascalCase for components

This is the one place this project's convention **differs from a typical NestJS starter or from other projects you may have seen**: backend files use **kebab-case**, not camelCase.

| File type | Convention | Example |
|---|---|---|
| NestJS files (controller/service/module/entity/dto/guard/strategy) | kebab-case, `.type.ts` suffix | `products.controller.ts`, `create-product.dto.ts`, `jwt-refresh.strategy.ts`, `inventory-movement.entity.ts` |
| React components | PascalCase | `ProductFormPage.tsx`, `BarcodeScannerModal.tsx` |
| Hooks | camelCase, `use` prefix | `useProducts.ts`, `useCreateMovement` (exported function name) |
| Services (axios wrappers), lib files | lowercase, one word per domain | `products.ts`, `lookups.ts`, `storage.ts` |
| Test files | same name + `.spec.ts` | `products.service.spec.ts` |
| Folders | lowercase, plural for domain modules | `products/`, `departments/`, `entities/`, `dto/` |

## Naming conventions (identifiers)

| Element | Convention | Example |
|---|---|---|
| Variables, functions | camelCase | `calculateCost`, `getProducts` |
| Classes, interfaces, types, React components | PascalCase | `ProductsService`, `CreateProductDto`, `ProductFormPage` |
| Constants (true constants) | UPPER_SNAKE_CASE | `COST_FACTORS`, `MAX_RETRY_ATTEMPTS` |
| Enums | PascalCase name, **UPPER_SNAKE_CASE members** | `enum SaleType { NORMAL = 'normal', NETO = 'neto' }` — see `UserRole`, `MovementType` in `common/enums/` for the existing precedent |
| Interfaces | No `I` prefix | `JwtPayload`, not `IJwtPayload` |
| Boolean variables | prefixed `is`/`has`/`should`/`must` | `isActive`, `mustChangePassword` |

## API (NestJS) standards

### DTO validation and transformation

Every DTO uses `class-validator` decorators; input normalization (uppercasing a reference, trimming a name) happens via `@Transform()` at the DTO layer, not ad hoc in the service:

```typescript
export class CreateProductDto {
  @Transform(({ value }) => value?.toUpperCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  reference: string;

  @Type(() => Number)
  @IsNumber()
  @Min(500)
  salePrice: number;

  @IsEnum(SaleType)
  saleType: SaleType;

  @IsUUID()
  departmentId: string;
}
```

Query DTOs use `@Type(() => Number)` for numeric query params (`page`, `limit`) since query strings arrive as strings — this is already the pattern in every `Query*Dto`.

### Services throw, controllers don't catch

```typescript
async findOne(id: string): Promise<Product> {
  const product = await this.productsRepository.findOneBy({ id });
  if (!product) {
    throw new NotFoundException(`Product with id ${id} not found`);
  }
  return product;
}
```

### Uniqueness checks — check, then trust a DB-level safety net

Every service that enforces a partial-unique constraint (see `DATABASE.md`) does an app-level pre-check for a clean error message, **and** catches the DB-level unique-violation as a safety net against a race condition — using the shared `isUniqueViolation()` helper in `common/utils/`:

```typescript
try {
  return await this.usersRepository.save(user);
} catch (error) {
  if (isUniqueViolation(error)) {
    throw new ConflictException('Email already in use');
  }
  throw error;
}
```

### Search — escape ILIKE input

Any `search` query param that gets used in an `ILIKE '%...%'` clause **must** go through the shared ILIKE-escaping helper in `common/utils/` first — raw user input into an `ILIKE` pattern is a latent injection-adjacent bug (a `%`/`_` in the search term changes matching semantics unexpectedly), already fixed once in this codebase (see `918b3fa` in git history) — don't reintroduce it in a new module.

### Environment variables — never accessed directly outside config

`ConfigService` only, injected wherever needed:

```typescript
// ❌ Avoid
const secret = process.env.JWT_ACCESS_SECRET;

// ✅ Prefer
constructor(private configService: ConfigService) {}
const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
```

### Transactions for multi-step writes

Any write that touches more than one table as a single logical operation goes through `EntityManager.transaction()` — see `InventoryService.createMovement` (movement insert + `Product.stock` update) for the existing precedent. Don't leave a two-step write un-transacted "because it's usually fine."

## Client (React + Vite) standards

### Named exports, not default exports

```typescript
// ✅
export function ProductForm() { ... }
```

### Component props — typed with an interface

```typescript
interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormValues) => void;
}
```

### Data fetching only through hooks

Components never call axios/the service layer directly — always through a `hooks/use*.ts` TanStack Query hook.

```typescript
// ❌
useEffect(() => { getProducts(query).then(setProducts) }, []);

// ✅
const { data, isLoading } = useProducts(query);
```

### Forms — React Hook Form + Zod

Every form has a matching schema in `lib/schemas/`, wired via `@hookform/resolvers/zod`. Input coercion (e.g. a numeric field arriving as a string from an `<input>`) uses `z.coerce.number()` in the schema, not manual `Number(...)` calls scattered in the component — see `lib/schemas/product.ts`'s `Input`/`Values` type split for the existing precedent when pre- and post-coercion types need to differ.

### Keep components small and focused

If a page file exceeds ~200 lines or mixes multiple concerns (a list, a modal, and a form all in one file), split it.

## Import order

1. External packages
2. Internal absolute/aliased imports
3. Relative imports
4. Type-only imports last within each group

## Comments

Code should be self-explanatory through naming. Comments are for **why**, not **what**. Avoid commented-out code — delete it, git history keeps it.

## Related documents

- `ARCHITECTURE.md` — the folder structure these standards apply to
- `TESTING.md` — how service logic covered by these standards should be tested
- `DEFINITION_OF_DONE.md` — lint passing is a merge requirement
