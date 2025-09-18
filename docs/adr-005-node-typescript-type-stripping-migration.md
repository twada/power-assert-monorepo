# ADR-005: Node.js TypeScript Type Stripping Migration

## Status

Accepted

## Context

The power-assert monorepo has been using a hybrid TypeScript development approach where:
- Source files are written in TypeScript with `.mts` extensions
- TypeScript compilation produces `.mjs` files for distribution
- Test execution required either pre-compilation or runtime transpilation with tools like `tsimp`
- Import paths in source files used `.mjs` extensions to reference compiled output

With Node.js 22.6.0 introducing experimental TypeScript type stripping support via the `--experimental-strip-types` flag, we have an opportunity to simplify our development workflow while maintaining TypeScript benefits.

## Decision

We will migrate the monorepo to leverage Node.js native TypeScript type stripping support with the following architectural changes:

### 1. Import Path Strategy

**Change from**: Source files importing compiled `.mjs` files
```typescript
// Before
import { renderDiagram } from './diagram.mjs';
```

**Change to**: Source files importing TypeScript source files directly
```typescript
// After
import { renderDiagram } from './diagram.mts';
```

**Rationale**: This enables Node.js type stripping to work directly with source files, eliminating the need for pre-compilation during development and testing.

### 2. Conditional Exports Strategy

**Enhancement**: Package.json exports now include a `dev` condition that points to TypeScript source files:

```json
{
  "exports": {
    ".": {
      "module-sync": {
        "types": "./dist/transpiler-core.d.mts",
        "dev": "./src/transpiler-core.mts",
        "default": "./dist/transpiler-core.mjs"
      },
      "import": {
        "types": "./dist/transpiler-core.d.mts",
        "dev": "./src/transpiler-core.mts",
        "default": "./dist/transpiler-core.mjs"
      }
    }
  }
}
```

**Rationale**: The `dev` condition allows Node.js to resolve TypeScript source files when running with `--conditions=dev`, while production environments continue using compiled `.mjs` files.

### 3. Package Self-Reference Pattern

**Enhancement**: Using package self-reference for internal module resolution:
```typescript
// Before
register('./hooks.mjs', import.meta.url);

// After
register('@power-assert/node/hooks', import.meta.url);
```

**Rationale**: This leverages conditional exports to automatically resolve to the appropriate file (source or compiled) based on execution context.

### 4. TypeScript Configuration Updates

**New compiler options**:
```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "erasableSyntaxOnly": true
  }
}
```

**Rationale**: These options enable TypeScript to:
- Accept `.mts` imports in source files
- Rewrite them to `.mjs` during compilation
- Ensure only type-only syntax is used (compatible with type stripping)

### 5. Test Execution Strategy

**Change from**: Multi-stage test execution requiring compilation
```bash
# Before
npm run build:clean && node --import=tsimp/import --test
```

**Change to**: Direct TypeScript execution with Node.js
```bash
# After
node --conditions=dev --test 'src/**/__tests__/**/*test.mts'
```

**Rationale**: Node.js type stripping eliminates the need for separate transpilation tools during testing, simplifying the development workflow.

### 6. File Organization Changes

**Test file relocation**: Some test files moved from `__tests__` subdirectories to more appropriate locations based on their purpose (e.g., examples).

**Extension consistency**: All test commands now consistently target `.mts` files instead of mixture of `.mjs` and `.mts`.

## Consequences

### Benefits

1. **Simplified Development Workflow**: Developers can run tests directly on TypeScript source files without pre-compilation
2. **Faster Iteration**: Eliminates build step for development and testing
3. **Reduced Tooling Complexity**: No longer dependent on external transpilation tools like `tsimp` for development
4. **Future-Proof**: Leverages native Node.js capabilities rather than external dependencies
5. **Consistent Import Paths**: Source files now have consistent `.mts` imports that work both in development and production

### Trade-offs

1. **Node.js Version Dependency**: Requires Node.js 22.6.0+ for type stripping support
2. **Experimental Feature Risk**: Type stripping is still experimental and subject to change
3. **Conditional Exports Complexity**: Package.json exports become more complex with multiple conditions
4. **Migration Overhead**: Significant refactoring required to update all import paths

### Risks and Mitigations

1. **Risk**: Type stripping feature changes or removal in future Node.js versions
   - **Mitigation**: Maintain dual support through conditional exports; can fallback to compilation if needed

2. **Risk**: Performance impact of runtime type stripping vs pre-compilation
   - **Mitigation**: Production builds continue using pre-compiled `.mjs` files

3. **Risk**: Compatibility issues with other tools in the ecosystem
   - **Mitigation**: Gradual rollout and thorough testing of integration points

## Implementation Notes

- All packages in the monorepo are updated consistently
- Existing compiled output and distribution mechanism remain unchanged
- The migration maintains backward compatibility for consumers
- Test infrastructure updated to use new execution strategy across all packages

This migration represents a significant modernization of the development workflow while maintaining production stability and backward compatibility.