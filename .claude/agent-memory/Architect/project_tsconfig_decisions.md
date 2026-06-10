---
name: project-tsconfig-decisions
description: Explains why apps/api/tsconfig.json uses commonjs/node and which options were deliberately removed
metadata:
  type: project
---

`apps/api/tsconfig.json` was corrected from a bad ESM-oriented config to a proper NestJS CommonJS config.

**Why:** NestJS 11 compiles to CommonJS. The original file used `"module": "nodenext"` / `"moduleResolution": "nodenext"` which implies ESM and breaks decorator metadata emission required by NestJS.

Decisions made:

- `"module": "commonjs"` — NestJS default; no `"type": "module"` in package.json
- `"moduleResolution": "node"` — matches CommonJS resolution; `nodenext` is ESM-only
- `"resolvePackageJsonExports"` — removed; ESM/NodeNext concept, not needed for CommonJS
- `"isolatedModules"` — removed; conflicts with `emitDecoratorMetadata` (TypeORM + NestJS decorators need full type metadata from tsc, not transpile-only mode)
- `"baseUrl": "./"` — intentionally kept; enables absolute imports like `import { X } from 'src/...'` paired with `tsconfig-paths` which is already a devDependency and registered in the `test:debug` script
- `"outDir": "./dist"` — correct and unchanged

**How to apply:** Never reintroduce `nodenext`/`resolvePackageJsonExports`/`isolatedModules` for this backend. If path aliases are added later, add them under `"paths"` alongside `"baseUrl"`.
