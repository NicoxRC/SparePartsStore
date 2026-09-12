# Testing Standards

This document defines what must be tested, how, and to what level in `api`. Frontend testing conventions will be added once a `client` test setup exists — none is configured today (`client`'s `npm run lint` is the current bar there).

## Testing framework

**Jest**, pre-configured by the Nest CLI.

## What must be tested

**Unit tests are mandatory for the Service layer.** Services own the business logic — cost calculation, stock movement validation, self-protection rules on user updates, and (going forward) Dataico request/response handling. This is where bugs are costly and tests are worth the most.

| Layer | Required? |
|---|---|
| Services | ✅ Mandatory |
| Controllers | ❌ Not required (thin, delegate to services) |
| Guards / Interceptors | ❌ Not required for now |
| Entities / DTOs | ❌ Not required (no logic to test) |

## No fixed coverage percentage

Not enforcing a minimum coverage number — that tends to produce shallow tests written to hit the metric. Standard instead: **every service method with a decision, a calculation, or a business rule has at least one test for its expected behavior, plus its edge cases.**

## What a good service test covers

1. **The happy path**
2. **Edge cases** — boundary values (e.g. quantity that brings stock to exactly 0, a reference that's exactly `MAX_LENGTH` characters)
3. **Error cases** — invalid input, entity not found, business rule violation (should throw the expected exception)
4. **Every branch** — if the method has an `if/else`, both branches need a test

### Example — testing the reverse cost calculation

```typescript
describe('ProductsService', () => {
  describe('calculateCost', () => {
    it('divides by 1.65 for saleType NORMAL', () => {
      expect(service.calculateCost(1650, SaleType.NORMAL)).toBe(1000);
    });

    it('divides by 1.30 for saleType NETO', () => {
      expect(service.calculateCost(1300, SaleType.NETO)).toBe(1000);
    });

    it('rounds the result', () => {
      expect(service.calculateCost(1000, SaleType.NORMAL)).toBe(606);
    });
  });
});
```

### Example — testing a business rule that throws

```typescript
describe('InventoryService.createMovement', () => {
  it('rejects a movement that would take stock negative', async () => {
    mockProductsRepository.findOneBy.mockResolvedValue({ id: '1', stock: 5 });
    await expect(
      service.createMovement({ productId: '1', quantity: -10 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('derives movementType PURCHASE from a positive quantity', async () => { /* ... */ });
  it('derives movementType ADJUSTMENT from a negative quantity', async () => { /* ... */ });
});
```

## Mocking

- **Never hit a real database in a unit test.** Mock the TypeORM repository via `getRepositoryToken()`.
- **Never make a real call to Dataico in a unit test.** Mock `DataicoClientService` (or whichever sub-domain service wraps a Dataico call) — see `ARCHITECTURE.md`'s invoicing module structure.
- Keep mocks close to the test file — avoid a shared "god mock" file.

## File naming and location

Test files live next to the file they test:

```
src/
└── inventory/
    ├── inventory.service.ts
    ├── inventory.service.spec.ts
    ├── inventory.controller.ts
    └── inventory.module.ts
```

## Running tests

```bash
npm run test
npm run test:watch
npm run test:cov      # informational, not enforced
```

## Testing Dataico integration code specifically

Since Dataico is a real external system with real DIAN legal consequences, and there's no sandbox guarantee documented yet for every module:

- Unit-test the request-building and response-parsing logic against **mocked** Dataico responses shaped exactly like the examples in that module's shared Postman reference — not invented shapes.
- Any manual testing against Dataico's real API (sandbox or production) is a deliberate, human-supervised step, not something to automate into the regular test suite without an explicit sandbox environment variable gate.

## Definition of Done requirement

Per `DEFINITION_OF_DONE.md`, a PR (or direct commit, for a small change) that adds or modifies service logic **cannot be considered done without corresponding unit tests.**

## Out of scope (for now)

- End-to-end (e2e) tests
- Frontend component/unit tests
- CI/CD pipeline running tests automatically
- Fixed coverage thresholds

Tracked as future improvements in `PROJECT_ROADMAP.md`.
