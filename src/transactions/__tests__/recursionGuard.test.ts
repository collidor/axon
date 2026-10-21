import { describe, it, expect } from 'vitest'
import {
  createImplicitContext,
  advanceExecutionContext,
  MaxRecursionDepthExceededError,
} from '../context'

describe('Recursion Guard & ImplicitContext Circuit Breaker', () => {
  it('tracks execution depth across chained executions', () => {
    let ctx = createImplicitContext({ maxRecursionDepth: 5 })
    expect(ctx.executionDepth).toBe(1)

    ctx = advanceExecutionContext(ctx)
    expect(ctx.executionDepth).toBe(2)

    ctx = advanceExecutionContext(ctx)
    expect(ctx.executionDepth).toBe(3)
  })

  it('throws MaxRecursionDepthExceededError when execution depth exceeds limit', () => {
    let ctx = createImplicitContext({ maxRecursionDepth: 3 })
    ctx = advanceExecutionContext(ctx) // depth 2
    ctx = advanceExecutionContext(ctx) // depth 3

    expect(() => {
      advanceExecutionContext(ctx) // attempts depth 4 > 3
    }).toThrow(MaxRecursionDepthExceededError)
  })
})
