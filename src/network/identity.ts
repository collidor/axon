export interface IdentifyPacket {
  type: 'IDENTIFY'
  userUuid: string
  nickname?: string
  authToken?: string
  isHost?: boolean
}

export interface PeerSession {
  peerId: string
  userUuid: string
  nickname: string
  isHost: boolean
  connectedAt: number
}

export class SessionIdentityManager {
  private peerToUser = new Map<string, string>() // peerId -> userUuid
  private userToSessions = new Map<string, PeerSession>() // userUuid -> PeerSession
  private entityOwners = new Map<string, string>() // entityId -> userUuid

  /**
   * Registers or updates a peer identity handshake.
   */
  public registerPeer(peerId: string, packet: IdentifyPacket): PeerSession {
    const session: PeerSession = {
      peerId,
      userUuid: packet.userUuid,
      nickname: packet.nickname ?? `Player_${packet.userUuid.slice(0, 4)}`,
      isHost: Boolean(packet.isHost),
      connectedAt: Date.now(),
    }

    this.peerToUser.set(peerId, packet.userUuid)
    this.userToSessions.set(packet.userUuid, session)
    return session
  }

  public unregisterPeer(peerId: string): void {
    const userUuid = this.peerToUser.get(peerId)
    if (userUuid) {
      this.userToSessions.delete(userUuid)
      this.peerToUser.delete(peerId)
    }
  }

  public getUserUuid(peerId: string): string | undefined {
    return this.peerToUser.get(peerId)
  }

  public getSessionByUser(userUuid: string): PeerSession | undefined {
    return this.userToSessions.get(userUuid)
  }

  public setEntityOwner(entityId: string, userUuid: string): void {
    this.entityOwners.set(entityId, userUuid)
  }

  public getEntityOwner(entityId: string): string | undefined {
    return this.entityOwners.get(entityId)
  }

  public isOwner(entityId: string, userUuid: string): boolean {
    const owner = this.entityOwners.get(entityId)
    return owner === undefined || owner === userUuid
  }

  /**
   * Validates whether a command sender has authority over the target actor entity.
   */
  public validateCommandAuthority(
    actorId: string | undefined,
    userUuid: string,
    isHost = false,
  ): boolean {
    if (isHost) return true
    if (!actorId) return true
    return this.isOwner(actorId, userUuid)
  }
}
