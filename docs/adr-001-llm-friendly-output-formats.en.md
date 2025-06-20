# ADR-001: LLM-Friendly Output Formats for power-assert

## Status

Proposed

## Context

Power-assert currently generates ASCII-art style diagrams to visualize assertion failures. These diagrams use vertical alignment to show the relationship between expressions and their values:

```
assert(ary.indexOf(zero) === two)
       |   |       |     |   |
       |   |       |     |   2
       |   |       |     false
       |   |       0
       |   0
       [0,1,2]
```

A discussion on social media raised an important point: Large Language Models (LLMs) may have difficulty interpreting these ASCII-art style representations due to:

1. **Tokenization issues**: LLMs process text as tokens, which can disrupt visual alignment
2. **Whitespace handling**: Precise spacing required for alignment is difficult for LLMs to generate/maintain
3. **Linear context**: LLMs are optimized for linear (left-to-right, top-to-bottom) text processing

As AI-powered development tools become more prevalent, with agents frequently running automated tests, we need to consider alternative output formats that are more easily parsed by LLMs while maintaining the rich debugging information that power-assert provides.

## Decision Drivers

* **LLM Compatibility**: Output should be easily parsed and understood by language models
* **Information Preservation**: All debugging information from the original format must be retained
* **Human Readability**: Should remain useful for human developers
* **Backward Compatibility**: Existing format should remain available
* **Implementation Complexity**: Changes should be maintainable and not overly complex

## Considered Options

### Option 1: Structured Text Format

```
Assertion failed: assert(ary.indexOf(zero) === two)
Expression tree:
- ary: [0,1,2]
- zero: 0
- ary.indexOf(zero): 0
- two: 2
- ary.indexOf(zero) === two: false
Final comparison: 0 === 2
```

**Pros:**
- Clear hierarchy
- Easy to parse line by line
- No alignment dependencies

**Cons:**
- Less visually intuitive than ASCII art
- Requires mental mapping to original expression

### Option 2: JSON Format

```json
{
  "assertion": "ary.indexOf(zero) === two",
  "evaluation": {
    "ary": [0, 1, 2],
    "zero": 0,
    "ary.indexOf(zero)": 0,
    "two": 2,
    "result": false
  },
  "comparison": "0 === 2"
}
```

**Pros:**
- Machine-readable by design
- Structured data format
- Easy to integrate with tooling

**Cons:**
- Less human-friendly
- More verbose
- May require JSON parsing in test output

### Option 3: Indent-Based Format

```
assert(ary.indexOf(zero) === two)
  ary: [0,1,2]
  zero: 0
  ary.indexOf(zero): 0
  two: 2
  === comparison: false
  actual: 0
  expected: 2
```

**Pros:**
- Clean and readable
- Hierarchy through indentation
- Familiar to developers (similar to YAML)

**Cons:**
- Still depends on whitespace (though less critically)
- May not show expression structure as clearly

### Option 4: Step-by-Step Format

```
Step 1: ary = [0,1,2]
Step 2: zero = 0
Step 3: ary.indexOf(zero) = 0
Step 4: two = 2
Step 5: 0 === 2 = false
Assertion failed: Expected 0 to equal 2
```

**Pros:**
- Clear execution order
- **Very LLM-friendly sequential format** for the following reasons:
  - **Sequential Processing**: Aligns perfectly with LLMs' natural left-to-right, top-to-bottom processing flow
  - **Explicit Structure**: Numbered steps provide clear information hierarchy that LLMs can easily parse
  - **Tokenization Robust**: Each step is self-contained on a single line, immune to whitespace tokenization issues
  - **Context Independent**: Each step can be understood independently, reducing dependency on surrounding context
  - **Natural Language Pattern**: Follows familiar "Step 1, Step 2" patterns common in LLM training data
- Easy to follow logic flow

**Cons:**
- Loses expression structure
- More verbose for complex expressions
- May be harder to trace back to original code

### Option 5: S-Expression Format

```
(assert-failed
  (=== (indexOf ary zero) two)
  (values
    (ary [0 1 2])
    (zero 0)
    (indexOf-result 0)
    (two 2))
  (comparison 0 2 false))
```

**Pros:**
- Preserves expression structure
- Unambiguous parsing
- Compact

**Cons:**
- Unfamiliar to most JavaScript developers
- Requires understanding of S-expressions
- May be off-putting

### Option 6: Hybrid Format (Recommended)

After further discussion, a hybrid approach combining human-readable and AI-readable formats emerged as the most practical solution:

```
AssertionError [ERR_ASSERTION]:

# Human-readable format:
assert(`${alice.name} and ${bob.name}` === `bob and alice`)
       |  |     |           |   |      |   |
       |  |     |           |   |      |   "bob and alice"
       |  |     |           |   |      false
       |  |     |           |   "bob"
       |  |     |           Object{name:"bob"}
       |  |     "alice"
       |  Object{name:"alice"}
       "alice and bob"

# AI-readable format:
Step 1: alice = Object{name:"alice"}
Step 2: alice.name = "alice"
Step 3: bob = Object{name:"bob"}
Step 4: bob.name = "bob"
Step 5: `${alice.name} and ${bob.name}` = "alice and bob"
Step 6: "alice and bob" === "bob and alice" = false
Assertion failed: Expected "alice and bob" to equal "bob and alice"
```

**Pros:**
- **Optimal for human-AI collaboration**: Humans use visual ASCII diagrams, AI uses step-by-step sequential format
- **Leverages step-by-step format's LLM advantages**: Sequential processing, tokenization robustness, context independence
- Enables gradual migration without breaking changes
- Facilitates human-AI collaboration during debugging
- Information redundancy increases understanding reliability

**Cons:**
- Doubles the output length
- Increases implementation and maintenance complexity
- May be overwhelming for simple assertions

### Option 7: Compact Hybrid Format

A more concise version for less complex assertions:

```
assert(`${alice.name} and ${bob.name}` === `bob and alice`)
       "alice and bob" === "bob and alice"  // false

AI_STEPS: alice.name="alice" → bob.name="bob" → LEFT="alice and bob" | RIGHT="bob and alice" | RESULT=false
```

**Pros:**
- Reduces output verbosity
- Still provides both human and AI readable information
- Suitable for simpler expressions

**Cons:**
- Less detailed than full hybrid format
- May require fallback to full format for complex expressions

## Decision

Based on the analysis and subsequent discussions, we propose implementing **Option 6 (Hybrid Format)** as the recommended approach, specifically combining ASCII diagrams with step-by-step format for optimal human-AI collaboration:

**Recommended Hybrid Format**: ASCII diagrams (human-readable) + Step-by-step format (AI-readable)

The step-by-step format is particularly well-suited for LLMs due to its sequential processing alignment, tokenization robustness, and context independence.

**Phased implementation strategy**:
1. **Phase 1**: Implement Option 4 (Step-by-step Format) as the foundation for AI readability
2. **Phase 2**: Add Option 6 (Hybrid Format) combining ASCII diagrams with step-by-step format
3. **Phase 3**: Implement Option 7 (Compact Hybrid Format) using step-by-step principles
4. **Phase 4**: Add Option 2 (JSON Format) for tooling integration

The implementation will:
1. Add a new output formatter system to `@power-assert/runtime`
2. Allow format selection via environment variable: `POWER_ASSERT_OUTPUT_FORMAT`
   - `traditional` (default) - ASCII-art format
   - `structured` - Structured text format
   - `json` - JSON format
   - `hybrid` - Full hybrid format
   - `hybrid:compact` - Compact hybrid format
3. Default to traditional ASCII-art format for backward compatibility
4. Support format switching at runtime
5. Allow fine-grained control over output verbosity

## Consequences

### Positive
- Better integration with AI-powered development tools
- Maintains all debugging information
- Preserves backward compatibility
- Opens possibilities for additional output formats

### Negative
- Increases codebase complexity
- Requires maintenance of multiple output formats
- May fragment the user experience

### Neutral
- Documentation needs to cover multiple output formats
- Test suites need to verify all output formats

## Implementation Notes

The new formatter will be implemented in `@power-assert/runtime` with:
- A formatter interface to allow easy addition of new formats
- Environment variable control: `POWER_ASSERT_OUTPUT_FORMAT=traditional|structured|json|hybrid|hybrid:compact`
- Runtime API for format selection
- Comprehensive tests for each format
- Priority order for implementation:
  1. Step-by-step format (foundation for AI-readable formats, optimal LLM compatibility)
  2. Hybrid format combining ASCII diagrams with step-by-step (recommended for human-AI collaboration)
  3. Compact hybrid format using step-by-step principles (for simpler assertions)
  4. JSON format (for tooling integration)

## References

- Original Twitter discussion: https://x.com/mizchi/status/1934532873715077503
- Power-assert philosophy: "No API is the best API"
- Related issues: (to be added)