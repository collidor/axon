export class MaxRecursionDepthExceededError extends Error {
  public readonly executionDepth: number
  public readonly maxDepth: number

  constructor(executionDepth: number, maxDepth: number) {
    super(
      `Max Recursion Depth Exceeded: Graph chained execution depth (${executionDepth}) exceeded the maximum limit (${maxDepth}). Transaction aborted and rolled back.`,
    )
    this.name = 'MaxRecursionDepthExceededError'
    this.executionDepth = executionDepth
    this.maxDepth = maxDepth
  }
}

export interface ImplicitContext {
  executionDepth: number
  maxRecursionDepth: number
  currentActorId?: string
  senderPeerId: string
  userUuid: string
}

export interface CreateContextOptions {
  executionDepth?: number
  maxRecursionDepth?: number
  currentActorId?: string
  senderPeerId?: string
  userUuid?: string
}

/**
 * Creates an initial execution context.
 */
export function createImplicitContext(options: CreateContextOptions = {}): ImplicitContext {
  return {
    executionDepth: options.executionDepth ?? 1,
    maxRecursionDepth: options.maxRecursionDepth ?? 10,
    currentActorId: options.currentActorId,
    senderPeerId: options.senderPeerId ?? 'local-tab',
    userUuid: options.userUuid ?? 'user_local',
  }
}

/**
 * Advances the execution depth for a chained graph execution, enforcing the recursion circuit breaker.
 */
export function advanceExecutionContext(ctx: ImplicitContext): ImplicitContext {
  const nextDepth = ctx.executionDepth + 1
  if (nextDepth > ctx.maxRecursionDepth) {
    throw new MaxRecursionDepthExceededError(nextDepth, ctx.maxRecursionDepth)
  }
  return {
    ...ctx,
    executionDepth: nextDepth,
  }
}
