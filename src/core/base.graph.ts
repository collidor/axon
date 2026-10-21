import { Result } from '@collidor/toolkit'
import type { BaseNode, PortMetadata } from './base.node'
import { validatePortConnection } from './portValidation'
import { parsePortId, formatPortId } from './portId'
import {
  serializeHeadlessGraph,
  loadHeadlessGraph,
  type SerializedGraph,
} from './serialization'

export class BaseGraph {
  #portValues = new Map<string, unknown>()
  #adjacencyMap = new Map<string, Set<string>>()
  #portToNode = new Map<string, string>() // portId -> nodeId
  #nodeToInputPorts = new Map<string, Set<string>>() // nodeId -> Set of inputPortIds
  #nodeToOutputPorts = new Map<string, Set<string>>() // nodeId -> Set of outputPortIds
  #portMetadata = new Map<string, PortMetadata>()

  #microtaskQueue = Promise.resolve()
  #pendingNodes = new Set<string>()

  #onNodeChangeListeners = new Map<string, (inputs: Record<string, unknown>) => void>()
  #onPulseListeners = new Set<(fromId: string, toId: string, value: unknown) => void>()
  #onPortValueChangeListeners = new Set<(id: string, value: unknown) => void>()

  #nodeSubscriptions = new Map<string, (() => void)[]>()
  #nodes = new Map<string, BaseNode>()

  #inputBuffer: Record<string, unknown> = {}

  public globalData: Record<string, unknown> = {}

  /**
   * Registers a BaseNode instance with the graph.
   * Automatically sets up two-way synchronization between node state and graph ports.
   */
  addNode(node: BaseNode) {
    this.#nodes.set(node.id, node)
    node.graph = this
    const unsubs: (() => void)[] = []

    // 1. Map input ports to the node
    node.inputNames.forEach((name) => {
      this.registerInputPort(node.id, node.getPortId(name))
    })
    node.outputNames.forEach((name) => {
      this.registerOutputPort(node.id, node.getPortId(name))
    })

    // 2. Subscribe to node outputs and forward to graph ports
    unsubs.push(
      node.subscribe((name, value) => {
        const portId = node.getPortId(name)
        if (!this.#portToNode.has(portId)) {
          this.registerOutputPort(node.id, portId)
        }
        this.setPortValue(portId, value)
      }),
    )

    // 3. Subscribe to node inputs and forward to graph ports
    unsubs.push(
      node.subscribeInput((name, value) => {
        const portId = node.getPortId(name)
        if (!this.#portToNode.has(portId)) {
          this.registerInputPort(node.id, portId)
        }
        this.setPortValue(portId, value)
      }),
    )

    // 4. Subscribe to graph changes for this node's input ports
    unsubs.push(
      this.subscribeNode(node.id, (inputs) => {
        Object.entries(inputs).forEach(([portId, value]) => {
          const portName = portId.split(':')[1]
          if (portName && value !== undefined) {
            node.setInput(portName, value)
          }
        })
      }),
    )

    this.#nodeSubscriptions.set(node.id, unsubs)

    // 5. Push initial node state to the graph
    node.outputNames.forEach((name) => {
      const val = node.getOutput(name)
      if (val !== undefined) {
        this.setPortValue(node.getPortId(name), val)
      }
    })

    node.inputNames.forEach((name) => {
      const val = node.getInput(name)
      if (val !== undefined) {
        this.setPortValue(node.getPortId(name), val)
      }
    })
  }

  /**
   * Registers a port as belonging to a specific node with optional direction.
   */
  registerPort(nodeId: string, portId: string, direction?: 'in' | 'out') {
    this.#portToNode.set(portId, nodeId)

    if (direction === 'in') {
      this.registerInputPort(nodeId, portId)
      return
    }
    if (direction === 'out') {
      this.registerOutputPort(nodeId, portId)
      return
    }

    const node = this.#nodes.get(nodeId)
    if (node) {
      const portName = portId.split(':')[1]
      const meta = node.getPortMetadata(portName)
      if (meta?.direction === 'in' || node.inputNames.includes(portName as any)) {
        this.registerInputPort(nodeId, portId)
      } else if (meta?.direction === 'out' || node.outputNames.includes(portName as any)) {
        this.registerOutputPort(nodeId, portId)
      }
    }
  }

  registerInputPort(nodeId: string, portId: string) {
    this.#portToNode.set(portId, nodeId)
    if (!this.#nodeToInputPorts.has(nodeId)) {
      this.#nodeToInputPorts.set(nodeId, new Set())
    }
    this.#nodeToInputPorts.get(nodeId)!.add(portId)
  }

  registerOutputPort(nodeId: string, portId: string) {
    this.#portToNode.set(portId, nodeId)
    if (!this.#nodeToOutputPorts.has(nodeId)) {
      this.#nodeToOutputPorts.set(nodeId, new Set())
    }
    this.#nodeToOutputPorts.get(nodeId)!.add(portId)
  }

  setPortMetadata(portId: string, metadata: PortMetadata) {
    this.#portMetadata.set(portId, metadata)
  }

  getPortMetadata(portId: string): PortMetadata | null {
    if (this.#portMetadata.has(portId)) {
      return this.#portMetadata.get(portId)!
    }
    const { nodeId, portName } = parsePortId(portId)
    const resolvedNodeId = this.#portToNode.get(portId) || nodeId
    const node = this.#nodes.get(resolvedNodeId)
    if (node && typeof node.getPortMetadata === 'function') {
      return node.getPortMetadata(portName)
    }
    return null
  }

  unregisterNode(nodeId: string) {
    const node = this.#nodes.get(nodeId)
    if (node) {
      node.graph = undefined
    }

    // Remove all edges originating from or targeting this node
    const edgesToRemove: [string, string][] = []
    for (const [fromId, toSet] of this.#adjacencyMap.entries()) {
      const fromNodeId = parsePortId(fromId).nodeId
      for (const toId of toSet) {
        const toNodeId = parsePortId(toId).nodeId
        if (fromNodeId === nodeId || toNodeId === nodeId) {
          edgesToRemove.push([fromId, toId])
        }
      }
    }
    for (const [fromId, toId] of edgesToRemove) {
      this.removeEdge(fromId, toId)
    }

    if (node) {
      node.destroy()
    }

    this.#nodes.delete(nodeId)
    const inputPorts = this.#nodeToInputPorts.get(nodeId)
    if (inputPorts) {
      inputPorts.forEach((portId) => this.#portToNode.delete(portId))
    }
    const outputPorts = this.#nodeToOutputPorts.get(nodeId)
    if (outputPorts) {
      outputPorts.forEach((portId) => this.#portToNode.delete(portId))
    }
    this.#nodeToInputPorts.delete(nodeId)
    this.#nodeToOutputPorts.delete(nodeId)
    this.#onNodeChangeListeners.delete(nodeId)
    this.#pendingNodes.delete(nodeId)

    const unsubs = this.#nodeSubscriptions.get(nodeId)
    if (unsubs) {
      unsubs.forEach((unsub) => unsub())
      this.#nodeSubscriptions.delete(nodeId)
    }
  }

  hasNode(nodeId: string): boolean {
    return this.#nodes.has(nodeId)
  }

  getNode(nodeId: string): BaseNode | undefined {
    return this.#nodes.get(nodeId)
  }

  get nodes() {
    return Array.from(this.#nodes.values())
  }

  getPortType(portId: string): unknown {
    const { nodeId, portName } = parsePortId(portId)
    const resolvedNodeId = this.#portToNode.get(portId) || nodeId
    const node = this.#nodes.get(resolvedNodeId)
    if (!node) return null
    const inputs = node.getInputsSchema()
    if (portName in inputs) return inputs[portName]
    const outputs = node.getOutputsSchema()
    if (portName in outputs) return outputs[portName]
    return null
  }

  canConnectPorts(
    fromIdOrNode: string,
    toIdOrPort: string,
    targetNodeId?: string,
    targetPort?: string,
  ): { valid: boolean; reason?: string } {
    const fromId = targetNodeId !== undefined ? formatPortId(fromIdOrNode, toIdOrPort) : fromIdOrNode
    const toId = targetNodeId !== undefined && targetPort !== undefined ? formatPortId(targetNodeId, targetPort) : toIdOrPort

    const fromType = this.getPortType(fromId)
    const toType = this.getPortType(toId)
    return validatePortConnection(fromType, toType)
  }

  /**
   * Connects two ports and returns a type-safe Result object:
   * Result.ok(true) or Result.err('Cannot connect output ... to input ...')
   */
  connectPorts(
    fromIdOrNode: string,
    toIdOrPort: string,
    targetNodeId?: string,
    targetPort?: string,
  ): Result<boolean, string> {
    const fromId = targetNodeId !== undefined ? formatPortId(fromIdOrNode, toIdOrPort) : fromIdOrNode
    const toId = targetNodeId !== undefined && targetPort !== undefined ? formatPortId(targetNodeId, targetPort) : toIdOrPort

    const check = this.canConnectPorts(fromId, toId)
    if (!check.valid) {
      return Result.err(check.reason || `Cannot connect output "${fromId}" to input "${toId}"`)
    }

    const added = this.addEdge(fromId, toId)
    return added ? Result.ok(true) : Result.err(`Failed to connect edge from "${fromId}" to "${toId}"`)
  }

  /**
   * Connects two ports in the graph.
   * Supports either 2-argument format: addEdge('node1:out', 'node2:in')
   * or 4-argument format: addEdge('node1', 'out', 'node2', 'in')
   */
  addEdge(
    fromIdOrNode: string,
    toIdOrPort: string,
    targetNodeId?: string,
    targetPort?: string,
  ): boolean {
    const fromId = targetNodeId !== undefined ? formatPortId(fromIdOrNode, toIdOrPort) : fromIdOrNode
    const toId = targetNodeId !== undefined && targetPort !== undefined ? formatPortId(targetNodeId, targetPort) : toIdOrPort

    const check = this.canConnectPorts(fromId, toId)
    if (!check.valid) {
      console.warn(`[Axon] Connection rejected from "${fromId}" to "${toId}": ${check.reason}`)
      return false
    }

    // Strict single connection rule for all input ports:
    // Every input port accepts at most one incoming connection.
    const { portName: targetPortName } = parsePortId(toId)
    for (const [existingFrom, toSet] of this.#adjacencyMap.entries()) {
      if (toSet.has(toId) && existingFrom !== fromId) {
        this.removeEdge(existingFrom, toId)
      }
    }

    if (!this.#adjacencyMap.has(fromId)) {
      this.#adjacencyMap.set(fromId, new Set())
    }
    this.#adjacencyMap.get(fromId)!.add(toId)

    // Sync initial value if it exists
    const val = this.getPortValue(fromId)
    if (val !== undefined) {
      this.setPortValue(toId, val)
    }

    const targetNode = this.#nodes.get(parsePortId(toId).nodeId)
    if (targetNode && typeof targetNode.notifyPortConnect === 'function') {
      targetNode.notifyPortConnect(targetPortName, val, fromId)
    }
    return true
  }

  removeEdge(fromId: string, toId: string) {
    this.#adjacencyMap.get(fromId)?.delete(toId)
    if (this.#adjacencyMap.get(fromId)?.size === 0) {
      this.#adjacencyMap.delete(fromId)
    }

    const { nodeId, portName } = parsePortId(toId)
    const targetNode = this.#nodes.get(nodeId)
    const removedVal = this.getPortValue(fromId)

    if (targetNode && typeof targetNode.notifyPortDisconnect === 'function') {
      targetNode.notifyPortDisconnect(portName, removedVal, fromId)
    }

    this.#portValues.delete(toId)
    if (targetNode && portName) {
      targetNode.disconnectInput(portName)
    }

    // Check if fromId has any remaining outgoing connections
    const fromSet = this.#adjacencyMap.get(fromId)
    const hasOutgoing = fromSet && fromSet.size > 0
    if (!hasOutgoing) {
      const { nodeId: fromNodeId, portName: fromPortName } = parsePortId(fromId)
      const sourceNode = this.#nodes.get(fromNodeId)
      if (sourceNode && fromPortName) {
        sourceNode.disconnectOutput(fromPortName)
      }
    }
  }

  clearEdges() {
    const targetPorts = new Set<string>()
    for (const [, toSet] of this.#adjacencyMap.entries()) {
      for (const toId of toSet) {
        targetPorts.add(toId)
      }
    }
    this.#adjacencyMap.clear()
    for (const toId of targetPorts) {
      this.#portValues.delete(toId)
      const { nodeId, portName } = parsePortId(toId)
      const targetNode = this.#nodes.get(nodeId)
      if (targetNode && portName) {
        targetNode.disconnectInput(portName)
      }
    }
  }

  get edges(): [string, string][] {
    const list: [string, string][] = []
    for (const [fromId, toSet] of this.#adjacencyMap.entries()) {
      for (const toId of toSet) {
        list.push([fromId, toId])
      }
    }
    return list
  }

  getEdges(): [string, string][] {
    return this.edges
  }

  getIncomingEdges(nodeId: string): { from: string; to: string }[] {
    const list: { from: string; to: string }[] = []
    for (const [fromId, toSet] of this.#adjacencyMap.entries()) {
      for (const toId of toSet) {
        if (parsePortId(toId).nodeId === nodeId) {
          list.push({ from: fromId, to: toId })
        }
      }
    }
    return list
  }

  getPortValue(id: string): unknown {
    return this.#portValues.get(id)
  }

  #recursionDepth = 0
  static readonly MAX_RECURSION_DEPTH = 100

  setPortValue(id: string, value: unknown) {
    if (this.#recursionDepth > BaseGraph.MAX_RECURSION_DEPTH) {
      console.warn(
        `[Axon] Maximum recursion depth (${BaseGraph.MAX_RECURSION_DEPTH}) exceeded during port propagation at "${id}". Infinite cycle broken defensively.`,
      )
      return
    }

    const existing = this.#portValues.get(id)
    if (Object.is(existing, value) && typeof value !== 'object') return

    this.#portValues.set(id, value)
    this.#onPortValueChangeListeners.forEach((l) => l(id, value))

    // Propagation
    const targets = this.#adjacencyMap.get(id)
    if (targets) {
      this.#recursionDepth++
      try {
        targets.forEach((toId) => {
          this.#onPulseListeners.forEach((l) => l(id, toId, value))
          this.setPortValue(toId, value)
          const { nodeId: targetNodeId, portName: targetPortName } = parsePortId(toId)
          const targetNode = this.#nodes.get(targetNodeId)
          if (targetNode && typeof targetNode.notifyPortConnect === 'function') {
            targetNode.notifyPortConnect(targetPortName, value, id)
          }
        })
      } finally {
        this.#recursionDepth--
      }
    }

    // Notification batching
    const nodeId = this.#portToNode.get(id)
    if (nodeId) {
      this.#pendingNodes.add(nodeId)
      this.#queueFlush()
    }
  }

  /**
   * Sets a port value and immediately flushes graph notifications synchronously,
   * avoiding stale synchronous reads in headless testing and CLI execution.
   */
  setPortValueSync(id: string, value: unknown): void {
    this.setPortValue(id, value)
    this.flush()
  }

  #queueFlush() {
    void this.#microtaskQueue.then(() => {
      this.#flushNotifications()
    })
  }

  #flushNotifications() {
    if (this.#pendingNodes.size === 0) return

    const pending = Array.from(this.#pendingNodes)
    this.#pendingNodes.clear()

    pending.forEach((nodeId) => {
      const listener = this.#onNodeChangeListeners.get(nodeId)
      if (listener) {
        const inputPorts = this.#nodeToInputPorts.get(nodeId)
        const inputs: Record<string, unknown> = {}
        if (inputPorts) {
          inputPorts.forEach((portId) => {
            inputs[portId] = this.#portValues.get(portId)
          })
        }
        listener(inputs)
      }
    })
  }

  subscribeNode(nodeId: string, callback: (inputs: Record<string, unknown>) => void) {
    this.#onNodeChangeListeners.set(nodeId, callback)
    return () => this.#onNodeChangeListeners.delete(nodeId)
  }

  onPulse(callback: (fromId: string, toId: string, value: unknown) => void) {
    this.#onPulseListeners.add(callback)
    return () => this.#onPulseListeners.delete(callback)
  }

  onPortValueChange(callback: (id: string, value: unknown) => void) {
    this.#onPortValueChangeListeners.add(callback)
    return () => this.#onPortValueChangeListeners.delete(callback)
  }

  /**
   * Fluent connection builder: connects a source node/port to a target node/port.
   * Usage:
   *   graph.connect(nodeA, 'out', nodeB, 'in')
   *   graph.connect('nodeA', 'out', 'nodeB', 'in')
   *   graph.connect('nodeA:out', 'nodeB:in')
   */
  connect(
    fromNodeOrId: BaseNode | string,
    fromPortOrTarget: string,
    toNodeOrId?: BaseNode | string,
    toPort?: string,
  ): boolean {
    const fromId =
      typeof fromNodeOrId === 'string'
        ? toNodeOrId !== undefined
          ? formatPortId(fromNodeOrId, fromPortOrTarget)
          : fromNodeOrId
        : fromNodeOrId.getPortId(fromPortOrTarget as any)

    const toId =
      toNodeOrId !== undefined
        ? typeof toNodeOrId === 'string'
          ? toPort !== undefined
            ? formatPortId(toNodeOrId, toPort)
            : toNodeOrId
          : toNodeOrId.getPortId(toPort as any)
        : fromPortOrTarget

    return this.addEdge(fromId, toId)
  }

  /**
   * Advances the graph state by one discrete tick/cycle:
   * Triggers step() on all feedback and delay nodes,
   * then flushes synchronous notifications across the graph.
   */
  step(): void {
    for (const node of this.#nodes.values()) {
      // oxlint-disable-next-line typescript/no-explicit-any
      const n = node as any
      if (typeof n.step === 'function') {
        n.step()
      }
    }
    this.flush()
  }

  flush(maxIterations: number = 100): void {
    let iterations = 0
    while (this.#pendingNodes.size > 0) {
      if (++iterations > maxIterations) {
        console.warn(
          `[Axon] Maximum notification flush iterations (${maxIterations}) exceeded. Potential uncontrolled cycle detected without feedback delay node.`,
        )
        this.#pendingNodes.clear()
        break
      }
      this.#flushNotifications()
    }
  }

  async settle(maxIterations = 100): Promise<void> {
    let iterations = 0
    while (this.#pendingNodes.size > 0) {
      if (++iterations > maxIterations) {
        console.warn(
          `[Axon] Maximum settle iterations (${maxIterations}) exceeded. Potential cycle detected in graph.`,
        )
        this.#pendingNodes.clear()
        break
      }
      await this.#microtaskQueue
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    for (const node of this.#nodes.values()) {
      await node.settle()
    }

    if (this.#pendingNodes.size > 0 && iterations < maxIterations) {
      return this.settle(maxIterations - iterations)
    }
  }

  exportState(): Record<string, unknown> {
    const state: Record<string, unknown> = {}
    this.#portValues.forEach((val, id) => {
      state[id] = val
    })
    return state
  }

  /**
   * Exports this graph to a JSON-compatible SerializedGraph structure headlessly.
   */
  serializeHeadlessGraph(): SerializedGraph {
    return serializeHeadlessGraph(this)
  }

  /**
   * Alias for serializeHeadlessGraph().
   */
  serialize(): SerializedGraph {
    return this.serializeHeadlessGraph()
  }

  /**
   * Reconstructs a BaseGraph from a SerializedGraph in pure headless mode.
   */
  static deserializeHeadlessGraph(
    data: SerializedGraph,
    globalData?: Record<string, unknown>,
  ): BaseGraph {
    return loadHeadlessGraph(data, undefined, globalData)
  }
}
