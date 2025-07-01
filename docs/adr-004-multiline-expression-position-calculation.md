# ADR-004: Multi-line Expression Position Calculation Design

## Status

Accepted

## Context

During the integration test update work for implementing the stepwise output format (ADR-002/ADR-003), we discovered a bug in `@power-assert/transpiler-core` where expression extraction became inaccurate for multi-line expressions. The bug manifested in two scenarios:

1. Multi-line function calls:
   ```javascript
   assert.equal(truthy,
     falsy,
     'falsy is not truthy')
   ```
   Expected extraction: `falsy`
   Actual extraction: `sert.`

2. Multi-line binary expressions:
   ```javascript
   assert(truthy
          ===
          falsy)
   ```
   Expected extraction: `falsy`
   Actual extraction: `truth`

The issue only occurred in the TypeScript implementation (`@power-assert/transpiler-core`), while the Rust implementation (`swc-plugin-power-assert`) worked correctly.

## Decision

We redesigned the position calculation system in `@power-assert/transpiler-core` to properly handle multi-line expressions by:

1. **Unifying the position calculation interface with clear naming**
   - Created `calculateAssertionRelativeOffsetFor(currentNode, baseNode, code)` function
   - Returns `AssertionRelativeOffset` type that clearly represents positions relative to the assertion expression start
   - Uses `baseNode` parameter to indicate the base node (assertion expression) for offset calculation
   - The offset is derived from the baseNode, eliminating caller complexity
   - Applied consistent naming across both TypeScript and Rust implementations for clarity

2. **Implementing proper multi-line position conversion**
   - Added `columnToPos()` function to convert line/column positions to absolute positions
   - This function accounts for newline characters and line lengths when calculating positions across multiple lines

3. **Consolidating offset handling**
   - Unified handling of different AST node formats (range-based, start/end-based, location-based)
   - All position calculations now return consistent relative positions

## Consequences

### Positive

1. **Accurate multi-line expression handling**: The transpiler now correctly extracts expressions that span multiple lines, matching the behavior of the Rust implementation.

2. **Cleaner API**: The new `calculateAssertionRelativeOffsetFor` function provides a simpler interface that automatically handles different node formats.

3. **Better maintainability**: Consolidated offset handling reduces code duplication and makes the position calculation logic easier to understand.

4. **Parser agnostic**: The solution works correctly with different parsers (Acorn, Meriyah, SWC) that provide position information in different formats.

### Negative

1. **API change**: The internal API changed from `searchAddress` to `calculateAssertionRelativeOffsetFor`, though this is not a public API.

2. **Slightly increased complexity**: The `columnToPos` function adds complexity to handle line/column to absolute position conversion.

### Neutral

1. **Performance**: The performance impact is negligible as position calculation is only done during transpilation, not at runtime.

## Implementation Details

### Before (Incorrect for multi-line)

```typescript
export function searchAddress (currentNode: Node, offset: Position | number, code: string): Address {
  if (typeof offset === 'number') {
    return {
      markerPos: calculateAddressOf(currentNode, offset, code) - offset,
      startPos: startAddressOf(currentNode, offset) - offset,
      endPos: endAddressOf(currentNode, offset) - offset
    };
  } else {
    return {
      markerPos: calculateAddressOf(currentNode, offset, code) - offset.column,
      startPos: startAddressOf(currentNode, offset) - offset.column,
      endPos: endAddressOf(currentNode, offset) - offset.column
    };
  }
}
```

The problem: `offset.column` only represents the column position on a single line, not the position within the entire code snippet.

### After (Correct for multi-line)

```typescript
export function calculateAssertionRelativeOffsetFor (currentNode: Node, baseNode: Node, code: string): AssertionRelativeOffset {
  let base: Position | number;
  if (baseNode.range) {
    base = baseNode.range[0];
  } else if (isAcornSwcNode(baseNode)) {
    base = baseNode.start;
  } else if (baseNode.loc) {
    base = baseNode.loc.start;
  } else {
    assert(false, 'Node must have range or location information');
  }
  return {
    markerPos: calculateMarkerPosOf(currentNode, base, code),
    startPos: startPosOf(currentNode, base, code),
    endPos: endPosOf(currentNode, base, code)
  };
}

function columnToPos (target: Position, base: Position, code: string): number {
  if (target.line === base.line) {
    return target.column - base.column;
  }
  const howManyLines = target.line - base.line;
  const lines = code.split('\n');
  let pos = 0;
  for (let i = 0; i < howManyLines; i++) {
    pos += lines[i].length + 1; // +1 for newline character
  }
  pos += target.column;
  return pos;
}
```

## References

- [Investigation Report: Multi-line Expression Bug](./investigations/2024-06-28-transpiler-core-multiline-expression-bug.en.md)
- [Position Calculation Analysis Session](./investigations/2024-06-28-transpiler-core-multiline-position-calculation-session1.md)
- Git commits: eb9b02c, bb93c73, 0c8d1c1, 382f7d2, 7e09352, 8c04795