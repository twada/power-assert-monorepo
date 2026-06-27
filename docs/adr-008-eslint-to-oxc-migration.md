# ADR-008: Migration from ESLint (neostandard) to oxlint and oxfmt

## Status

Accepted

## Context

The monorepo used ESLint with the [neostandard](https://github.com/neostandard/neostandard) preset as its sole linting and formatting tool. The configuration was minimal:

```javascript
// eslint.config.mjs
import neostandard from 'neostandard';
export default neostandard({
  filesTs: ["**/*.mts"],
  semi: true,
  ts: true
});
```

This setup bundled lint rules and formatting conventions into a single tool invocation (`eslint` / `eslint --fix`). While functional, it had several drawbacks:

1. **Performance**: ESLint's JavaScript-based architecture is significantly slower than native alternatives on this monorepo's codebase
2. **Conflated concerns**: Linting (correctness, suspicious patterns) and formatting (whitespace, semicolons) were handled by one tool, making it impossible to run them independently or at different stages
3. **Dependency weight**: ESLint + neostandard + their transitive dependencies added substantial `node_modules` overhead (net reduction of ~4,000 packages in `package-lock.json`)

The [OXC project](https://oxc.rs/) provides Rust-based alternatives — oxlint for linting and oxfmt for formatting — that are compatible with the existing rule semantics while offering significantly better performance.

## Decision

Replace ESLint (neostandard) with two separate tools from the OXC ecosystem:

- **oxlint** for linting (correctness, suspicious patterns, style rules)
- **oxfmt** for formatting (whitespace, line wrapping, punctuation style)

### 1. Separation of lint and format

**Before**: Single command for both concerns
```json
{
  "lint": "eslint 'packages/**/src/**/*.mts'",
  "lint:fix": "eslint --fix 'packages/**/src/**/*.mts'"
}
```

**After**: Dedicated commands for each concern
```json
{
  "lint": "oxlint packages",
  "fmt": "oxfmt packages"
}
```

**Rationale**: Separating lint and format into independent commands allows them to run at different stages — linting during `npm test` (as before), formatting on demand or in CI. The `lint:fix` command is removed because oxlint is a read-only linter; formatting corrections are handled exclusively by oxfmt.

### 2. Lint rule mapping (neostandard → oxlint)

The `.oxlintrc.json` configuration explicitly maps neostandard's rule set to oxlint equivalents, organized by the same categories neostandard uses internally:

| Category | Example rules | Count |
|---|---|---|
| Suspicious | `no-extend-native`, `no-unexpected-multiline`, `no-useless-constructor` | 6 |
| Pedantic | `eqeqeq`, `no-fallthrough`, `no-self-compare`, `no-throw-literal` | 14 |
| Style | `curly`, `new-cap`, `no-return-assign`, `yoda` | 12 |
| Restriction | `no-var`, `no-labels`, `no-sequences`, `no-void` | 7 |
| Import plugin | `import/first`, `import/no-duplicates` | 5 |
| Node plugin | `node/no-new-require`, `node/no-exports-assign` | 2 |
| Promise plugin | `promise/param-names` | 1 |

oxlint plugins enabled: `typescript`, `unicorn`, `oxc`, `import`, `node`, `promise`.

**Rationale**: Rather than relying on oxlint's category-based defaults (e.g., `"suspicious": "warn"`), rules are listed individually to maintain an exact 1:1 mapping with the previous neostandard configuration. This ensures no new warnings or errors appear from rules that were not previously enforced, and no previously enforced rules are silently dropped.

### 3. Lint-triggered code changes

Applying oxlint produced 4 minor code changes (8 lines):

- **ESLint directive comments → oxlint directives**: `/* eslint no-eval: 0 */` → `/* oxlint-disable no-eval */`
- **Unused parameter prefixing**: `state` → `_state`, `decl` → `_decl` (oxlint's `no-unused-vars`)
- **Regex simplification**: `/^AssertionError/.test(e.name)` → `e.name.startsWith('AssertionError')` (oxlint's `unicorn/prefer-string-starts-ends-with` via the `correctness` category)
- **Suppression comment**: Added `// oxlint-disable-next-line no-unused-private-class-members` for a private field that is used indirectly

### 4. ESLint directive comment migration policy

oxlint recognizes ESLint directive syntax (`eslint-disable`, `eslint-disable-line`, etc.) for compatibility, so existing comments continue to function. However, the codebase migrates to oxlint-native directives where possible, following this policy:

1. **oxlint has the rule** → rewrite `eslint-disable` to `oxlint-disable` (e.g., `no-new-wrappers`, `no-new-func`, `no-array-constructor`, `no-cond-assign`)
2. **oxlint does not have the rule** → keep the `eslint-disable` comment as-is (e.g., `prefer-regex-literals`)
3. **Suppression can be eliminated by fixing the code** → fix the code instead of converting the directive:
   - Remove useless escape characters in regex character classes rather than suppressing `no-useless-escape` (e.g., `[^\(\s]` → `[^(\s]`)
   - Replace `value !== value` NaN idiom with `Number.isNaN(value)` rather than suppressing `no-self-compare`

### 5. Format configuration (oxfmt)

The `.oxfmtrc.json` is configured to minimize style drift from neostandard:

```json
{
  "printWidth": 320,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "none",
  "sortImports": false,
  "sortPackageJson": false
}
```

| Setting | Value | Why |
|---|---|---|
| `printWidth` | `320` | Prevents oxfmt from wrapping lines that neostandard left unwrapped. Set deliberately high to preserve the existing one-line style for most statements |
| `semi` | `true` | Matches neostandard's `semi: true` |
| `singleQuote` | `true` | Matches neostandard's quote style |
| `trailingComma` | `"none"` | Matches neostandard's default (no trailing commas) |
| `sortImports` | `false` | Preserves existing import order; neostandard did not sort imports |
| `sortPackageJson` | `false` | Preserves existing `package.json` key order |

### 6. Accepted formatting differences

oxfmt is a Prettier-compatible formatter with opinionated defaults that cannot all be configured. The following style changes are accepted as unavoidable:

1. **Space before function parenthesis removed**: `function foo ()` → `function foo()`, `method ()` → `method()`. This is Prettier's fixed behavior — no configuration option exists. (~142 occurrences across the codebase)

2. **TypeScript type/interface member separator**: `,` → `;`. Prettier always uses semicolons for TypeScript type and interface members. (~95 occurrences)

3. **Multi-line collapsing**: With `printWidth: 320`, array literals and import declarations that were previously spread across multiple lines are collapsed to a single line when they fit

4. **Multi-line template literal expansion**: Function calls with multi-line template literal arguments are expanded by Prettier's argument-breaking algorithm (notably in `integration_test.mts`)

5. **Minor expression normalization**: Removal of redundant parentheses, addition of parentheses around ternary expressions in arrow functions

### 7. Ignore patterns

Both tools share a consistent set of ignore patterns:

- `*.mjs` — compiled output (TypeScript sources are `.mts`; compiled `.mjs` files should not be linted or formatted)
- `**/dist/**` — distribution builds
- `**/examples/**` — example code (may intentionally use non-standard patterns)
- `**/fixtures/**` — test fixtures (intentional formatting for test assertions)

oxfmt additionally ignores `*.json`, `*.md`, `*.toml`, and `.swcrc` since it can format those file types but they are outside its intended scope here.

### 8. Dependency changes

**Removed** (2 direct + ~4,000 transitive):
- `eslint` ^9.0.0
- `neostandard` ^0.13.0

**Added** (2 direct, minimal transitive — native binaries):
- `oxlint` ^1.64.0
- `oxfmt` ^0.50.0

## Consequences

### Benefits

1. **Performance**: oxlint and oxfmt are Rust-based native binaries; linting completes in milliseconds rather than seconds
2. **Separation of concerns**: Lint and format are independent operations with distinct commands and configurations
3. **Reduced dependency footprint**: ~4,000 fewer transitive packages in `node_modules`
4. **OXC ecosystem alignment**: The monorepo already uses SWC (another Rust-based tool) for its high-performance plugin; adopting OXC tools continues the pattern of using Rust-based JavaScript tooling

### Trade-offs

1. **Formatting style differences**: The 5 categories of formatting changes listed above alter the code style from neostandard's conventions. These are cosmetic and do not affect runtime behavior
2. **No `lint:fix` equivalent**: oxlint is read-only; auto-fixable issues must be corrected manually or by oxfmt (for formatting issues). This is by design — mixing lint fixes with format fixes in a single command was a source of confusion
3. **Less mature ecosystem**: oxlint and oxfmt are newer tools than ESLint; some niche rules or edge cases may behave differently

### Migration approach

The migration was carried out incrementally to keep each commit reviewable:

1. Add oxlint to devDependencies
2. Create `.oxlintrc.json` with neostandard-equivalent rules
3. Apply oxlint fixes (4 files, 8 lines)
4. Add oxfmt to devDependencies, create `.oxfmtrc.json`, add `fmt` script
5. Apply oxfmt formatting (29 files)
6. Migrate remaining ESLint directive comments to oxlint-native directives, fix code where suppression can be eliminated
7. Remove ESLint, neostandard, and `eslint.config.mjs`
