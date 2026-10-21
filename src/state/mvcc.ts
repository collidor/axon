export interface MVCCValidationResult {
  valid: boolean
  reason?: 'STATE_STALE' | 'ENTITY_NOT_FOUND'
  expectedSequenceId?: number
  actualSequenceId?: number
}

export interface StaleCommandRejectionPacket {
  type: 'COMMAND_REJECTED'
  reason: 'STATE_STALE'
  targetId: string
  expectedSequenceId: number
  actualSequenceId: number
  message: string
}

export class MVCCConcurrencyEngine {
  /**
   * Validates whether an incoming command targets the entity's current sequence version.
   */
  public static validate(
    targetSequenceId: number | undefined,
    currentEntitySequenceId: number,
  ): MVCCValidationResult {
    if (targetSequenceId === undefined) {
      // If sequence ID was omitted, consider it valid (or force strict mode as needed)
      return { valid: true }
    }

    if (targetSequenceId !== currentEntitySequenceId) {
      return {
        valid: false,
        reason: 'STATE_STALE',
        expectedSequenceId: targetSequenceId,
        actualSequenceId: currentEntitySequenceId,
      }
    }

    return { valid: true }
  }

  /**
   * Creates a rejection packet payload for stale commands.
   */
  public static createRejectionPacket(
    targetId: string,
    expectedSequenceId: number,
    actualSequenceId: number,
  ): StaleCommandRejectionPacket {
    return {
      type: 'COMMAND_REJECTED',
      reason: 'STATE_STALE',
      targetId,
      expectedSequenceId,
      actualSequenceId,
      message: `Command rejected: Target entity ${targetId} was modified (v${actualSequenceId}) before command based on v${expectedSequenceId} arrived.`,
    }
  }
}
