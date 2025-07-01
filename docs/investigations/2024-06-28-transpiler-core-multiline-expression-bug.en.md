# transpiler-core Multi-line Expression Extraction Bug Analysis Report

## Overview

During the integration test update work, we discovered a bug in `@power-assert/transpiler` where expression extraction becomes inaccurate for multi-line expressions. This document provides a detailed analysis of the issue and a plan for fixing it.

## Problem Details

### Failing Test Cases

1. **Multi-line assert.equal call**
   ```javascript
   assert.equal(truthy,
     falsy,
     'falsy is not truthy')
   ```
   - Expected extraction: `falsy`
   - Actual extraction: `sert.`

2. **Multi-line binary expression**
   ```javascript
   assert(truthy
          ===
          falsy)
   ```
   - Expected extraction: `falsy`
   - Actual extraction: `truth`

### Scope of Impact

- Only occurs with multi-line expressions in `@power-assert/transpiler`
- `swc-plugin-power-assert` (Rust implementation) works correctly
- Single-line expressions work without issues

## Root Cause Analysis

### 1. Related Code

#### A. `extractArea` function (`assertion-visitor.mts:78-92`)
```typescript
export function extractArea (code: string, start: Position, end: Position): string {
  const lines = code.split(/\n/);
  const startLineStr = lines[start.line - 1];
  const endLineStr = lines[end.line - 1];
  if (start.line === end.line) {
    return startLineStr.slice(start.column, end.column);
  } else if (start.line + 1 === end.line) {
    return startLineStr.slice(start.column) + '\n' + endLineStr.slice(0, end.column);
  } else {
    const middleLines = lines.slice(start.line, end.line - 1);
    return startLineStr.slice(start.column) + '\n' + middleLines.join('\n') + '\n' + endLineStr.slice(0, end.column);
  }
}
```

#### B. `searchAddress` function (`address.mts:42-56`)
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

#### C. Position calculation caller (`assertion-visitor.mts:175-184`)
```typescript
#calculateAddress (currentNode: Node): Address {
  const code = this.#assertionCode;
  if (this.#callexp.loc) {
    const offsetPosition = this.#callexp.loc.start;
    return searchAddress(currentNode, offsetPosition, code);
  } else {
    const offset = getStartRangeValue(this.#callexp);
    return searchAddress(currentNode, offset, code);
  }
}
```

### 2. Core Issues

1. **Position calculation inconsistency**
   - `searchAddress` returns relative positions (subtracts offset)
   - However, these relative positions need further adjustment when used in `extractArea`

2. **Column position calculation errors in multi-line contexts**
   - Mixing of Position type (line/column) and number type (absolute position)
   - Column position alone cannot accurately locate positions across multiple lines

3. **assertionCode scope**
   - `#assertionCode` contains the entire assert call
   - However, individual argument positions are not correctly calculated as relative positions within this scope

## Fix Strategy

### Phase 1: Problem Reproduction and Understanding (Current Session)

1. **Create minimal reproduction test cases**
   ```typescript
   // transpiler-core/src/__tests__/address_test.mts
   describe('searchAddress with multi-line code', () => {
     it('should calculate correct positions for identifiers on new lines', () => {
       // Minimal test case to reproduce the issue
     });
   });
   ```

2. **Add debugging information**
   - Output logs at each step of position calculation
   - Clarify differences between actual and expected values

### Phase 2: Fix Implementation

1. **Fix position calculation logic**
   - Unify to absolute position calculations
   - Or make relative position calculations consistent

2. **Improve extractArea**
   - Make boundary handling accurate for multi-line cases
   - Clarify offset adjustment logic

3. **Comprehensive testing**
   - Verify operation with both single-line and multi-line cases
   - Confirm compatibility with swc-plugin behavior

### Phase 3: Refactoring

1. **Code clarification**
   - Add documentation for position calculations
   - Clarify types (absolute position vs relative position)

2. **Edge case handling**
   - Boundary handling at line ends/beginnings
   - Handling cases with empty lines

## Recommended Work Process

1. **Complete the current PR**
   - Consider integration tests complete with 32/34 passing
   - Add comments for the 2 failing tests

2. **Create a new issue**
   - Title: "transpiler-core: Inaccurate expression extraction for multi-line expressions"
   - Summarize this document's contents

3. **Fix in a separate PR**
   - Add unit tests for transpiler-core
   - Fix position calculation logic
   - Ensure all integration tests pass

## Reference Information

- swc-plugin-power-assert (Rust implementation) works correctly with the same test cases
- This is a TypeScript implementation-specific issue
- The ADR-002, ADR-003 implementations themselves are correct (output format is correct)

## Related Files

- `/packages/transpiler-core/src/assertion-visitor.mts`
- `/packages/transpiler-core/src/address.mts`
- `/packages/integration-tests/src/__tests__/integration_test.mts`