export type TabRole = 'LEADER' | 'FOLLOWER'

export type IPCMessage =
  | { type: 'LEADER_HEARTBEAT'; tabId: string; timestamp: number }
  | { type: 'LEADER_CLAIM'; tabId: string; timestamp: number }
  | { type: 'MUTATION_BUNDLE'; bundle: Record<string, unknown>; sourceTabId: string }
  | { type: 'COMMAND_PROXY'; command: Record<string, unknown>; sourceTabId: string }
  | {
      type: 'CROSS_WINDOW_DND'
      entityId: string
      sourceWindowId: string
      targetCoordinates: { x: number; y: number }
      metadata?: Record<string, unknown>
    }
  | { type: 'SCHEMA_RELOAD'; schemaVersion: number }

export interface CrossWindowDnDPayload {
  mimeType: 'application/x-axon-node'
  entityId: string
  sourceWindowId: string
  timestamp: number
}

export class MultiWindowIPCCoordinator {
  public readonly tabId: string
  private channelName: string
  private channel: BroadcastChannel | null = null
  private role: TabRole = 'FOLLOWER'
  private lastLeaderHeartbeat = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private electionTimer: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<(msg: IPCMessage) => void>()

  constructor(
    channelName = 'axon_graph_ipc',
    tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  ) {
    this.tabId = tabId
    this.channelName = channelName
    this.initChannel()
  }

  private initChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(this.channelName)
        this.channel.onmessage = (event) => {
          this.handleIncomingMessage(event.data as IPCMessage)
        }
      } catch (err) {
        console.warn('BroadcastChannel not available:', err)
      }
    }
  }

  public getRole(): TabRole {
    return this.role
  }

  public setRole(role: TabRole): void {
    this.role = role
    if (role === 'LEADER') {
      this.broadcastMessage({
        type: 'LEADER_CLAIM',
        tabId: this.tabId,
        timestamp: Date.now(),
      })
    }
  }

  public startHeartbeat(intervalMs = 2000): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = setInterval(() => {
      if (this.role === 'LEADER') {
        this.broadcastMessage({
          type: 'LEADER_HEARTBEAT',
          tabId: this.tabId,
          timestamp: Date.now(),
        })
      }
    }, intervalMs)
  }

  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  public startElectionMonitoring(timeoutMs = 4000): void {
    if (this.electionTimer) clearInterval(this.electionTimer)
    this.lastLeaderHeartbeat = Date.now()

    this.electionTimer = setInterval(
      () => {
        if (this.role === 'FOLLOWER') {
          const elapsed = Date.now() - this.lastLeaderHeartbeat
          if (elapsed > timeoutMs) {
            // Leader missed heartbeat threshold; promote this tab to leader
            this.setRole('LEADER')
            this.startHeartbeat()
          }
        }
      },
      Math.floor(timeoutMs / 2),
    )
  }

  public stopElectionMonitoring(): void {
    if (this.electionTimer) {
      clearInterval(this.electionTimer)
      this.electionTimer = null
    }
  }

  public broadcastMessage(msg: IPCMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg)
      } catch {
        // Ignored in closed channels
      }
    }
  }

  public onMessage(callback: (msg: IPCMessage) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  public dispatchCrossWindowDrop(
    entityId: string,
    targetCoordinates: { x: number; y: number },
    metadata?: Record<string, unknown>,
  ): void {
    this.broadcastMessage({
      type: 'CROSS_WINDOW_DND',
      entityId,
      sourceWindowId: this.tabId,
      targetCoordinates,
      metadata,
    })
  }

  public createDnDDataTransferPayload(entityId: string): string {
    const payload: CrossWindowDnDPayload = {
      mimeType: 'application/x-axon-node',
      entityId,
      sourceWindowId: this.tabId,
      timestamp: Date.now(),
    }
    return JSON.stringify(payload)
  }

  private handleIncomingMessage(msg: IPCMessage): void {
    if (msg.type === 'LEADER_HEARTBEAT' || msg.type === 'LEADER_CLAIM') {
      this.lastLeaderHeartbeat = msg.timestamp
      if (msg.tabId !== this.tabId && this.role === 'LEADER') {
        // Another tab claims leadership; resolve tie-break by tabId lexicography
        if (msg.tabId < this.tabId) {
          this.role = 'FOLLOWER'
        }
      }
    }

    this.listeners.forEach((listener) => {
      try {
        listener(msg)
      } catch (err) {
        console.warn('Error in IPC listener:', err)
      }
    })
  }

  public destroy(): void {
    this.stopHeartbeat()
    if (this.electionTimer) clearInterval(this.electionTimer)
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.listeners.clear()
  }
}
