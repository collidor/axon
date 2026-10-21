// oxlint-disable typescript/no-explicit-any
import { isValid } from './validation'

export type ConstructorToType<T> = T extends typeof Number
  ? number
  : T extends typeof String
    ? string
    : T extends typeof Boolean
      ? boolean
      : T extends null
        ? unknown
        : T extends ArrayConstructor
          ? unknown[]
          : T extends new (...args: unknown[]) => infer R
            ? R
            : unknown

export type MapSchema<T> = {
  [K in keyof T]: ConstructorToType<T[K]>
}

export type NodeExecutionStatus = 'idle' | 'running' | 'resolved' | 'rejected'

export interface PortMetadata {
  name: string
  direction: 'in' | 'out'
  type: unknown
}

export type NodeInitOptions<
  TInputSchema extends Record<string, unknown>,
  TOutputSchema extends Record<string, unknown>,
  TData = unknown,
  TGlobalData = unknown,
  TState = unknown,
  TContext = {
    inputs: Partial<MapSchema<TInputSchema>>
    data: TData
    state: TState
    globalData: TGlobalData
    node: BaseNode<TInputSchema, TOutputSchema, TData, TGlobalData, TState>
    status: NodeExecutionStatus
    setStatus: (status: NodeExecutionStatus, progress?: number, error?: unknown) => void
    executeAsync: <T>(task: () => Promise<T>) => Promise<T>
    emitOutput: <K extends keyof TOutputSchema>(
      outputName: K,
      value: MapSchema<TOutputSchema>[K],
    ) => void
  },
> = {
  id?: string
  nodeType?: string
  x?: number
  y?: number
  inputs: TInputSchema
  outputs: TOutputSchema
  initialData?: TData
  dataSchema?: unknown
  onInit?: (context: TContext) => void
  onDestroy?: (context: TContext) => void
  // input
  onInputDisconnect?: (inputName: keyof TInputSchema, context: TContext) => void
  onInputChange?: (
    inputName: keyof TInputSchema,
    value: MapSchema<TInputSchema>[keyof TInputSchema],
    context: TContext,
  ) => void
  onPortConnect?: (
    portName: string,
    value: unknown,
    fromPortId: string,
    context: TContext,
  ) => void
  onPortDisconnect?: (
    portName: string,
    removedValue: unknown,
    fromPortId: string,
    context: TContext,
  ) => void
  // output
  onOutputDisconnect?: (outputName: keyof TOutputSchema, context: TContext) => void
  onOutputChange?: (outputName: keyof TOutputSchema, context: TContext) => void
} & Record<string, unknown>

let nodeCounter = 0
function generateUniqueId() {
  return `node-${nodeCounter++}-${Math.random().toString(36).substring(2, 9)}`
}

export class BaseNode<
  TInputSchema extends Record<string, unknown> = any,
  TOutputSchema extends Record<string, unknown> = any,
  TData = any,
  TGlobalData = any,
  TState = any,
> {
  readonly [Symbol.toStringTag] = 'BaseNode'
  readonly id: string
  public data: TData
  public globalData: TGlobalData
  public nodeType: string
  public state: TState = {} as TState
  public position: { x: number; y: number } = { x: 0, y: 0 }
  public graph?: {
    flush?: () => void
    addEdge?: (fromId: string, toId: string) => boolean
    getNode?: (id: string) => any
    [key: string]: any
  }
  public step?(): void

  #inputs: Record<keyof any, any> = {}
  #outputs: Record<keyof any, any> = {}
  #options: NodeInitOptions<any, any, any, any, any>
  #settleDependencies: (() => Promise<void>)[] = []

  #status: NodeExecutionStatus = 'idle'
  #progress: number = 0
  #lastError: unknown = null
  #statusListeners: Set<(status: NodeExecutionStatus, progress: number, error?: unknown) => void> = new Set()

  #inputListeners: Set<(name: any, value: unknown) => void> = new Set()
  #outputListeners: Set<(name: any, value: unknown) => void> = new Set()
  #context?: any

  constructor(
    options: NodeInitOptions<TInputSchema, TOutputSchema, TData, TGlobalData, TState>,
    globalData?: TGlobalData,
  ) {
    this.id = options.id ?? generateUniqueId()
    this.data = options.initialData ?? ({} as unknown as TData)
    this.globalData = globalData ?? ({} as unknown as TGlobalData)
    this.nodeType = options.nodeType ?? 'custom-node'
    this.position = {
      x: typeof options.x === 'number' ? options.x : 0,
      y: typeof options.y === 'number' ? options.y : 0,
    }

    this.#options = options as any

    // Initialize inputs from initialData if keys match schema
    if (options.initialData && typeof options.initialData === 'object') {
      Object.entries(options.initialData).forEach(([key, value]) => {
        if (key in options.inputs) {
          ;(this.#inputs as any)[key] = value
        }
      })
    }

    this.#init()
  }

  #init() {
    this.#options.onInit?.(this.#createContext())
  }

  public get inputNames(): (keyof TInputSchema)[] {
    return Object.keys(this.#options.inputs)
  }

  public get inputDefinition(): TInputSchema {
    return this.#options.inputs
  }

  public get outputNames(): (keyof TOutputSchema)[] {
    return Object.keys(this.#options.outputs)
  }

  public get outputDefinition(): TOutputSchema {
    return this.#options.outputs
  }

  public get dataSchema(): unknown | undefined {
    return (this.#options as any)?.dataSchema
  }

  public set dataSchema(schema: unknown | undefined) {
    ;(this.#options as any).dataSchema = schema
  }

  #dataListeners: Set<(data: TData) => void> = new Set()

  public updateData(partialData: Partial<TData>): void {
    this.data = { ...this.data, ...partialData }
    this.#dataListeners.forEach((listener) => {
      try {
        listener(this.data)
      } catch (e) {
        console.error('[Axon] Error in data listener:', e)
      }
    })
  }

  public onDataChange(listener: (data: TData) => void): () => void {
    this.#dataListeners.add(listener)
    return () => this.#dataListeners.delete(listener)
  }

  public destroy() {
    this.#options.onDestroy?.(this.#createContext())
    this.#outputListeners.clear()
    this.#inputListeners.clear()
    this.#dataListeners.clear()
    this.#statusListeners.clear()
    this.#settleDependencies = []
    this.#context = undefined
  }

  public addSettleDependency(dep: () => Promise<void>) {
    this.#settleDependencies.push(dep)
  }

  #createContext() {
    if (!this.#context) {
      this.#context = {
        inputs: this.#inputs,
        node: this,
        emitOutput: <K extends keyof TOutputSchema>(name: K, value: MapSchema<TOutputSchema>[K]) =>
          this.emitOutput(name, value),
        setStatus: (status: NodeExecutionStatus, progress?: number, error?: unknown) =>
          this.setStatus(status, progress, error),
        executeAsync: <T>(task: () => Promise<T>) => this.executeAsync(task),
      } as any

      Object.defineProperties(this.#context, {
        data: {
          get: () => this.data,
          enumerable: true,
        },
        state: {
          get: () => this.state,
          enumerable: true,
        },
        globalData: {
          get: () => this.globalData,
          enumerable: true,
        },
        status: {
          get: () => this.status,
          enumerable: true,
        },
      })
    }
    return this.#context!
  }

  public get status(): NodeExecutionStatus {
    return this.#status
  }

  public get progress(): number {
    return this.#progress
  }

  public get lastError(): unknown {
    return this.#lastError
  }

  public setStatus(
    status: NodeExecutionStatus,
    progress: number = status === 'resolved' ? 100 : 0,
    error?: unknown,
  ): void {
    this.#status = status
    this.#progress = progress
    this.#lastError = error ?? null
    this.#statusListeners.forEach((listener) => {
      try {
        listener(status, progress, error)
      } catch (e) {
        console.error('[Axon] Error in status listener:', e)
      }
    })
  }

  public subscribeStatus(
    listener: (status: NodeExecutionStatus, progress: number, error?: unknown) => void,
  ): () => void {
    this.#statusListeners.add(listener)
    return () => this.#statusListeners.delete(listener)
  }

  public async executeAsync<T>(task: () => Promise<T>): Promise<T> {
    this.setStatus('running', 0)
    try {
      const result = await task()
      this.setStatus('resolved', 100)
      return result
    } catch (err) {
      this.setStatus('rejected', this.#progress, err)
      throw err
    }
  }

  /**
   * Generates a unique ID for a port.
   * Format: node_id:port_name
   */
  public getPortId(portName: keyof TInputSchema | keyof TOutputSchema): string {
    return `${this.id}:${String(portName)}`
  }

  public setInput<K extends keyof TInputSchema>(name: K, value: MapSchema<TInputSchema>[K]) {
    const target = this.#options.inputs[name]
    if (!target) {
      if (Object.is(this.#inputs[name], value)) return
      // Allow setting values for dynamic ports even if not in initial schema
      this.#inputs[name] = value
      this.#inputListeners.forEach((listener) => listener(name, value))
      this.#options.onInputChange?.(name, value, this.#createContext())
      return
    }
    if (!isValid(value, target)) {
      console.warn(
        `Invalid type for input "${String(name)}" on node "${this.id}". Expected ${
          (target as { name?: string })?.name ?? 'unknown'
        }, got ${typeof value}`,
      )
      return
    }

    if (Object.is(this.#inputs[name], value)) return

    this.#inputs[name] = value
    this.#inputListeners.forEach((listener) => listener(name, value))
    this.#options.onInputChange?.(name, value, this.#createContext())
  }

  public addInput(name: string, type: unknown) {
    ;(this.#options.inputs as any)[name] = type
    this.#inputListeners.forEach((listener) => listener(name as keyof TInputSchema, undefined))
  }

  public removeInput(name: string) {
    delete (this.#options.inputs as any)[name]
    delete this.#inputs[name]
    this.#inputListeners.forEach((listener) => listener(name as keyof TInputSchema, undefined))
  }

  public addOutput(name: string, type: unknown) {
    ;(this.#options.outputs as any)[name] = type
    this.#outputListeners.forEach((listener) => listener(name as keyof TOutputSchema, undefined))
  }

  public removeOutput(name: string) {
    delete (this.#options.outputs as any)[name]
    delete this.#outputs[name]
    this.#outputListeners.forEach((listener) => listener(name as keyof TOutputSchema, undefined))
  }

  public disconnectInput(name: keyof TInputSchema) {
    delete this.#inputs[name]
    this.#options.onInputDisconnect?.(name, this.#createContext())
    this.#inputListeners.forEach((listener) => listener(name, undefined))
  }

  public emitOutput<K extends keyof TOutputSchema>(name: K, value: MapSchema<TOutputSchema>[K]) {
    const target = this.#options.outputs[name]
    if (!target) {
      if (Object.is(this.#outputs[name], value)) return
      // Allow emitting to dynamic ports
      this.#outputs[name] = value
      this.#options.onOutputChange?.(name as keyof TOutputSchema, this.#createContext())
      this.#outputListeners.forEach((listener) => listener(name, value))
      return
    }
    if (!isValid(value, target)) {
      console.warn(
        `Invalid type for output "${String(name)}" on node "${this.id}". Expected ${
          (target as { name?: string })?.name ?? 'unknown'
        }, got ${typeof value}`,
      )
      return
    }

    if (Object.is(this.#outputs[name], value)) return

    this.#outputs[name] = value

    this.#options.onOutputChange?.(name as keyof TOutputSchema, this.#createContext())

    this.#outputListeners.forEach((listener) => listener(name, value))
  }

  public disconnectOutput(name: keyof TOutputSchema) {
    delete this.#outputs[name]
    const context = this.#createContext()
    this.#options.onOutputChange?.(name as keyof TOutputSchema, context)
    this.#options.onOutputDisconnect?.(name, context)
  }

  public subscribe(listener: (name: keyof TOutputSchema, value: unknown) => void) {
    this.#outputListeners.add(listener)
    return () => this.#outputListeners.delete(listener)
  }

  public subscribeInput(listener: (name: keyof TInputSchema, value: unknown) => void) {
    this.#inputListeners.add(listener)
    return () => this.#inputListeners.delete(listener)
  }

  public getOutput<K extends keyof TOutputSchema>(
    name: K,
  ): MapSchema<TOutputSchema>[K] | undefined {
    return this.#outputs[name]
  }

  public getInput<K extends keyof TInputSchema>(name: K): MapSchema<TInputSchema>[K] | undefined {
    return this.#inputs[name]
  }

  public getInputs(): Partial<MapSchema<TInputSchema>> {
    return { ...this.#inputs } as Partial<MapSchema<TInputSchema>>
  }

  public getOutputs(): Partial<MapSchema<TOutputSchema>> {
    return { ...this.#outputs } as Partial<MapSchema<TOutputSchema>>
  }

  public getInputsSchema(): TInputSchema {
    return { ...(this.#options.inputs as TInputSchema) }
  }

  public getOutputsSchema(): TOutputSchema {
    return { ...(this.#options.outputs as TOutputSchema) }
  }

  public getPortMetadata(portName: string): PortMetadata | null {
    const inputs = this.#options.inputs || {}
    if (portName in inputs) {
      return {
        name: portName,
        direction: 'in',
        type: inputs[portName],
      }
    }
    const outputs = this.#options.outputs || {}
    if (portName in outputs) {
      return {
        name: portName,
        direction: 'out',
        type: outputs[portName],
      }
    }
    return null
  }

  public notifyPortConnect(portName: string, value: unknown, fromPortId: string): void {
    this.#options.onPortConnect?.(portName, value, fromPortId, this.#createContext())
  }

  public notifyPortDisconnect(
    portName: string,
    removedValue: unknown,
    fromPortId: string,
  ): void {
    this.#options.onPortDisconnect?.(
      portName,
      removedValue,
      fromPortId,
      this.#createContext(),
    )
  }

  /**
   * Fluent helper to connect an output port on this node to an input port on a target node.
   */
  public connect(
    outputPort: keyof TOutputSchema | string,
    targetNode: BaseNode<any, any, any, any, any>,
    inputPort: string,
  ): boolean {
    if (!this.graph || typeof this.graph.addEdge !== 'function') {
      throw new Error(`[Axon] Cannot connect node "${this.id}" before adding it to a graph.`)
    }
    return this.graph.addEdge(
      this.getPortId(outputPort as keyof TOutputSchema),
      targetNode.getPortId(inputPort),
    )
  }

  /**
   * Returns a promise that resolves when the node has finished any internal
   * asynchronous work (e.g. subgraph propagation).
   */
  public async settle(): Promise<void> {
    await Promise.all(this.#settleDependencies.map((dep) => dep()))
  }
}
