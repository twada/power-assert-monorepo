# ADR-002: Step-by-Step Format Implementation

## Status

Proposed

## Context

Following ADR-001's decision to implement LLM-friendly output formats, this ADR details the technical implementation of the step-by-step format, which serves as the foundation for AI-readable outputs.

The step-by-step format presents assertion failures as numbered sequential steps, making it highly compatible with LLMs due to:
- Sequential processing alignment
- Tokenization robustness
- Context independence
- Familiar patterns in LLM training data

Example output:
```
Step 1: ary = [0,1,2]
Step 2: zero = 0
Step 3: ary.indexOf(zero) = 0
Step 4: two = 2
Step 5: 0 === 2 = false
Assertion failed: Expected 0 to equal 2
```

## Technical Constraints

1. **Cross-package changes required**: Implementation requires changes to both `@power-assert/transpiler-core` and `@power-assert/runtime`
2. **SWC compatibility**: Must work with both TypeScript/ESTree AST and SWC's Rust-based AST
3. **Current limitation**: transpiler-core currently only stores `leftIndex` (marker position for vertical bar)
4. **Version synchronization**: All packages are developed and released together, allowing breaking changes

## Decision

Extend transpiler-core to capture additional metadata during transpilation:

```typescript
interface StepInfo {
  startPos: number;  // Start position of element
  endPos: number;    // End position of element
  markerPos: number; // Value marker position (formerly leftIndex)
  evalOrder: number; // Evaluation order (depth-first numbering)
}
```

### Naming Rationale

- **`markerPos`** instead of `leftIndex`: More implementation-agnostic, describes the purpose (marking values) rather than UI details
- **`startPos`/`endPos`** instead of `left`/`right`: Clearer semantic meaning, consistent with `*Pos` naming pattern
- Consistent naming improves code readability and maintainability

### Why not astPath?

We deliberately avoid storing AST structure information (astPath) because:
1. ESTree and SWC AST structures differ significantly
2. Step-by-step format only needs execution order, not AST structure
3. Simpler implementation that works across different AST types
4. Better performance without complex AST analysis

## Implementation Details

### Phase 1: Transpiler-core Extension

1. **Extend metadata collection**:
   - Capture `startPos` and `endPos` during AST traversal
   - Assign `evalOrder` using depth-first traversal counter
   - Store alongside existing marker position (rename from `leftIndex` to `markerPos`)

2. **Replace existing implementation**:
   - Directly update interfaces with new field names
   - Make all fields required from the start
   - Coordinated release across all packages

### Phase 2: Runtime Formatter

1. **Create StepByStepFormatter**:
   ```typescript
   class StepByStepFormatter implements Formatter {
     format(assertion: AssertionResult): string {
       // Sort by evalOrder
       // Generate "Step N: expression = value" lines
       // Add final assertion message
     }
   }
   ```

2. **Value tracking**:
   - Use `evalOrder` as key to match expressions with values
   - Extract code snippets using `startPos` and `endPos`

### Phase 3: SWC Plugin Compatibility

1. **Implement same metadata in Rust**:
   - Mirror the `StepInfo` structure
   - Use same depth-first ordering algorithm
   - Ensure consistent evalOrder numbering

## Consequences

### Positive
- Clean separation between AST structure and execution order
- Works consistently across TypeScript and Rust implementations
- Simple, performant implementation
- Enables future hybrid format development

### Negative
- Requires coordinated changes across multiple packages
- Increases transpiler complexity
- More metadata to maintain during transpilation

### Neutral
- Sets precedent for future formatter requirements
- Establishes pattern for cross-implementation compatibility

## Implementation Order

1. Extend transpiler-core with new metadata fields
2. Update TypeScript transpiler implementation
3. Implement StepByStepFormatter in runtime
4. Update SWC plugin with same metadata
5. Add comprehensive tests across all packages

## References

- ADR-001: LLM-Friendly Output Formats
- Related issue: (to be created)