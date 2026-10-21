import type { EntityStoreAdapter, TransactionCommitResult } from '../transactions/transaction'
import { ExecutionTransaction } from '../transactions/transaction'
import { createImplicitContext } from '../transactions/context'
import { SessionIdentityManager } from './identity'

export interface PlayerCommandPacket {
  type: 'PLAYER_COMMAND'
  commandId: string
  userUuid: string
  actorId?: string
  targetId?: string
  targetSequenceId?: number
  action: string
  payload: Record<string, unknown>
}

export interface StateReplicationBundle {
  type: 'STATE_REPLICATION'
  bundleId: string
  timestamp: number
  schemaVersion: number
  mutatedEntities: Record<
    string,
    { struct_id: string; sequence_id: number; data: Record<string, unknown> }
  >
  deletedEntityIds: string[]
  events: { eventName: string; payload: unknown }[]
}

export interface FieldRedactionRule {
  structId: string
  hostOnlyFields: Set<string>
  ownerOnlyFields?: Set<string>
}

export class HostAuthorityEngine {
  private identityManager: SessionIdentityManager
  private store: EntityStoreAdapter
  private schemaVersion = 1
  private redactionRules = new Map<string, Set<string>>() // struct_id -> Set of hostOnly field names
  private ownerOnlyRules = new Map<string, Set<string>>() // struct_id -> Set of ownerOnly field names

  constructor(store: EntityStoreAdapter, identityManager = new SessionIdentityManager()) {
    this.store = store
    this.identityManager = identityManager
  }

  private addFieldsToMap(map: Map<string, Set<string>>, structId: string, fields: string[]): void {
    if (!map.has(structId)) {
      map.set(structId, new Set())
    }
    const set = map.get(structId)!
    fields.forEach((f) => set.add(f))
  }

  public registerHostOnlyFields(structId: string, fields: string[]): void {
    this.addFieldsToMap(this.redactionRules, structId, fields)
  }

  public registerOwnerOnlyFields(structId: string, fields: string[]): void {
    this.addFieldsToMap(this.ownerOnlyRules, structId, fields)
  }

  public getIdentityManager(): SessionIdentityManager {
    return this.identityManager
  }

  public setSchemaVersion(version: number): void {
    this.schemaVersion = version
  }

  public getSchemaVersion(): number {
    return this.schemaVersion
  }

  /**
   * Processes an incoming player command in a host-authoritative transactional boundary.
   */
  public async handlePlayerCommand(
    command: PlayerCommandPacket,
    executor: (tx: ExecutionTransaction, cmd: PlayerCommandPacket) => void,
  ): Promise<{
    success: boolean
    result?: TransactionCommitResult
    replicationBundle?: StateReplicationBundle
    error?: string
  }> {
    // 1. Validate Command Authority
    const hasAuthority = this.identityManager.validateCommandAuthority(
      command.actorId,
      command.userUuid,
      false,
    )
    if (!hasAuthority) {
      return {
        success: false,
        error: `Permission Denied: User ${command.userUuid} is not authorized to control actor ${command.actorId}.`,
      }
    }

    // 2. Setup 3-Phase Execution Transaction
    const ctx = createImplicitContext({
      currentActorId: command.actorId,
      senderPeerId: command.userUuid,
      userUuid: command.userUuid,
    })
    const tx = new ExecutionTransaction(ctx)

    // 3. Execute logic within transaction
    try {
      executor(tx, command)
    } catch (err) {
      tx.rollback()
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }

    // 4. Commit transaction
    const commitRes = await tx.commit(this.store)
    if (!commitRes.success) {
      return {
        success: false,
        error: commitRes.error,
      }
    }

    // 5. Generate StateReplicationBundle
    const bundle: StateReplicationBundle = {
      type: 'STATE_REPLICATION',
      bundleId: `rep_${Date.now()}`,
      timestamp: Date.now(),
      schemaVersion: this.schemaVersion,
      mutatedEntities: commitRes.updatedEntities,
      deletedEntityIds: commitRes.deletedEntityIds,
      events: commitRes.stagedEvents,
    }

    return {
      success: true,
      result: commitRes,
      replicationBundle: bundle,
    }
  }

  public redactEntityData(
    structId: string,
    data: Record<string, unknown>,
    isOwner: boolean,
  ): Record<string, unknown> {
    const hostOnlyFields = structId ? this.redactionRules.get(structId) : undefined
    const ownerOnlyFields = structId ? this.ownerOnlyRules.get(structId) : undefined

    const cleanData: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (hostOnlyFields?.has(k)) {
        continue // Redact GM/HOST secrets
      }
      if (!isOwner && ownerOnlyFields?.has(k)) {
        continue // Redact private owner data for other players
      }
      cleanData[k] = v
    }
    return cleanData
  }

  /**
   * Redacts HOST_ONLY (and non-owner OWNER_ONLY) fields from a replication bundle before transmission to peers.
   */
  public redactBundleForPeer(
    bundle: StateReplicationBundle,
    options?: { recipientUserUuid?: string; structIdMap?: Record<string, string> },
  ): StateReplicationBundle {
    const redactedMutations: Record<
      string,
      { struct_id: string; sequence_id: number; data: Record<string, unknown> }
    > = {}

    for (const [entityId, entityInfo] of Object.entries(bundle.mutatedEntities)) {
      const structId = entityInfo.struct_id || options?.structIdMap?.[entityId] || ''
      const isOwner = options?.recipientUserUuid
        ? this.identityManager.isOwner(entityId, options.recipientUserUuid)
        : false

      redactedMutations[entityId] = {
        struct_id: entityInfo.struct_id,
        sequence_id: entityInfo.sequence_id,
        data: this.redactEntityData(structId, entityInfo.data, isOwner),
      }
    }

    return {
      ...bundle,
      mutatedEntities: redactedMutations,
    }
  }
}
