# ADR-003: Design Evolution from ADR-002

## Status

Accepted

## Context

During the implementation of ADR-002 (Step-by-Step Format Implementation), several design decisions were refined based on practical implementation feedback. This ADR documents these changes to maintain a clear record of design evolution and the rationale behind each modification.

The implementation spanned from `feat/stepwise-base` to `feat/stepwise` branch, involving changes across `@power-assert/transpiler-core`, `@power-assert/runtime`, and `swc-plugin-power-assert`.

## Design Changes from ADR-002

### 1. evalOrder Calculation Moved to Runtime

**Original Design (ADR-002)**: Calculate evaluation order during transpilation using depth-first traversal counter.

**Implemented Design**: evalOrder is captured at runtime using an incrementing counter in `ArgumentRecorderImpl`.

**Rationale**: 
- Runtime calculation provides the actual execution order, which is more accurate than static analysis
- JavaScript's evaluation order can be complex with short-circuit operators and conditional expressions
- Simplifies transpiler implementation by removing the need for complex traversal logic

**Implementation**:
```typescript
// In ArgumentRecorderImpl
tap(value: unknown, left: number, start: number, end: number, metadata?: CapturedValueMetadata): unknown {
  const evalOrder = ++this.#evalOrder;  // Runtime counter
  // ...
}
```

### 2. argIndex Calculation Moved to Transpile Time

**Original Design**: Calculate argument index at runtime by incrementing a counter while processing recorded arguments.

**Implemented Design**: Use the argument number already known at transpile time and store it directly in captured values.

**Rationale**:
- The transpiler already knows which argument it's processing via `argumentNumber`
- Eliminates redundant runtime calculation
- Reduces complexity in the runtime rendering logic

**Implementation**:
```typescript
// Transpiler provides argumentNumber to ArgumentRecorderImpl
// Runtime stores it directly in captured values
this.#capturedValues.push({
  value: wrap(value),
  argIndex: this.#argumentNumber,  // Known at transpile time
  // ...
});
```

### 3. Introduction of Address Type Structure

**Original Design**: Pass individual position values (startPos, endPos, markerPos) as separate parameters.

**Implemented Design**: Introduced a structured `Address` type to encapsulate all position information.

**Rationale**:
- Groups related data together for better cohesion
- Makes function signatures cleaner and more maintainable
- Facilitates consistent handling across TypeScript and Rust implementations

**Implementation**:
```typescript
export type Address = {
  markerPos: number;
  startPos: number;
  endPos: number;
};
```

### 4. Enhanced Stepwise Format with Argument Grouping

**Original Design**: Simple sequential step output.

**Implemented Design**: Steps are grouped by argument with clear separators.

**Rationale**:
- Improves readability when multiple arguments are involved
- Makes it easier to trace evaluation within each argument
- Better supports complex assertions with multiple arguments

**Implementation Output**:
```
=== arg:1 ===
Step 1: `ary` => [0,1,2]
Step 2: `ary.indexOf(zero)` => 0
=== arg:2 ===
Step 3: `two` => 2
```

### 5. Simplified Metadata Passing

**Original Design**: Create intermediate objects for passing captured values between layers.

**Implemented Design**: Pass captured values directly without intermediate transformation.

**Rationale**:
- Reduces object allocation and copying
- Simplifies the data flow between transpiler and runtime
- Maintains data integrity without unnecessary transformations

### 6. Consistent Position Naming

**Original Design**: Mixed naming with `leftIndex` and position-related terms.

**Implemented Design**: Consistent `*Pos` suffix for all position-related fields (markerPos, startPos, endPos).

**Rationale**:
- Aligns with ADR-002's naming recommendations
- Improves code readability and reduces confusion
- Creates a clear naming pattern for position-related data

## Consequences

### Positive
- More accurate evaluation order tracking through runtime calculation
- Cleaner and more maintainable code structure
- Better performance with reduced runtime calculations for argIndex
- Enhanced output format improves debugging experience
- Consistent implementation across TypeScript and Rust

### Negative
- Runtime evalOrder calculation adds slight overhead during test execution
- Address type structure requires coordinated changes across packages

### Neutral
- Design evolution demonstrates the value of implementation feedback
- Sets precedent for iterative design refinement in future ADRs

## Implementation Status

All changes have been successfully implemented across:
- `@power-assert/transpiler-core`: Address type and metadata passing
- `@power-assert/runtime`: Runtime evalOrder tracking and stepwise rendering
- `swc-plugin-power-assert`: Rust implementation with same semantics

The implementation is ready for integration testing and release.

## References

- ADR-002: Step-by-Step Format Implementation
- Git history: `feat/stepwise-base..feat/stepwise`