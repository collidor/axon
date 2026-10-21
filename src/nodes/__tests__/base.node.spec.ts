/* oxlint-disable typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { BaseNode } from '../../core/base.node'

describe('BaseNode', () => {
  it('should initialize with a generated ID if none provided', () => {
    const node = new BaseNode({ inputs: {}, outputs: {} })
    expect(node.id).toMatch(/^node-\d+-/)
  })

  it('should use provided ID', () => {
    const node = new BaseNode({ id: 'custom-id', inputs: {}, outputs: {} })
    expect(node.id).toBe('custom-id')
  })

  it('should store and retrieve input/output names', () => {
    const node = new BaseNode({
      inputs: { in1: Number, in2: String },
      outputs: { out1: Boolean },
    })
    expect(node.inputNames).toContain('in1')
    expect(node.inputNames).toContain('in2')
    expect(node.outputNames).toContain('out1')
  })

  it('should generate deterministic port IDs', () => {
    const node = new BaseNode({ id: 'node1', inputs: { in1: Number }, outputs: {} })
    expect(node.getPortId('in1')).toBe('node1:in1')
  })

  it('should trigger onInit with correct context', () => {
    const onInit = vi.fn<(ctx: unknown) => void>()
    const initialData = { count: 0 }
    const globalData = { env: 'test' }
    new BaseNode(
      {
        inputs: {},
        outputs: {},
        initialData,
        onInit: onInit as any,
      },
      globalData,
    )

    expect(onInit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: initialData,
        globalData: globalData,
      }),
    )
  })

  it('should prevent redundant input updates using Object.is', () => {
    const onInputChange = vi.fn<(name: string, val: unknown, ctx: unknown) => void>()
    const node = new BaseNode({
      inputs: { a: Number },
      outputs: {},
      onInputChange: onInputChange as any,
    })

    node.setInput('a', 10)
    node.setInput('a', 10) // Same value

    expect(onInputChange).toHaveBeenCalledTimes(1)
  })

  it('should handle input disconnection', () => {
    const onInputDisconnect = vi.fn<(name: string, ctx: unknown) => void>()
    const node = new BaseNode({
      inputs: { a: Number },
      outputs: {},
      onInputDisconnect: onInputDisconnect as any,
    })

    node.setInput('a', 10)
    node.disconnectInput('a')

    expect(node.getInput('a')).toBeUndefined()
    expect(onInputDisconnect).toHaveBeenCalledWith('a', expect.anything())
  })

  it('should prevent redundant output emissions', () => {
    const onOutputChange = vi.fn<(name: string, ctx: unknown) => void>()
    new BaseNode<Record<string, never>, { b: typeof Number }>({
      inputs: {},
      outputs: { b: Number },
      onOutputChange: onOutputChange as any,
      onInit: ({ emitOutput }) => {
        emitOutput('b', 10)
        emitOutput('b', 10)
      },
    })

    expect(onOutputChange).toHaveBeenCalledTimes(1)
  })

  it('should warn and block invalid types in emitOutput', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const node = new BaseNode<Record<string, never>, { b: typeof Number }>({
      inputs: {},
      outputs: { b: Number },
      onInit: ({ emitOutput }) => {
        emitOutput('b', 'not-a-number' as any)
      },
    })

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid type'))
    expect(node.getOutput('b')).toBeUndefined()
    consoleSpy.mockRestore()
  })

  it('should handle output disconnection', () => {
    const onOutputDisconnect = vi.fn<(name: string, ctx: unknown) => void>()
    const onOutputChange = vi.fn<(name: string, ctx: unknown) => void>()
    const node = new BaseNode<Record<string, never>, { b: typeof Number }>({
      inputs: {},
      outputs: { b: Number },
      onOutputChange: onOutputChange as any,
      onOutputDisconnect: onOutputDisconnect as any,
      onInit: ({ emitOutput }) => emitOutput('b', 10),
    })

    onOutputChange.mockClear()
    node.disconnectOutput('b')

    expect(node.getOutput('b')).toBeUndefined()
    expect(onOutputChange).toHaveBeenCalledWith('b', expect.anything())
    expect(onOutputDisconnect).toHaveBeenCalledWith('b', expect.anything())
  })

  it('should trigger onDestroy hook', () => {
    const onDestroy = vi.fn<(ctx: unknown) => void>()
    const node = new BaseNode({ inputs: {}, outputs: {}, onDestroy: onDestroy as any })
    node.destroy()
    expect(onDestroy).toHaveBeenCalled()
  })

  it('should allow multiple output subscribers', () => {
    const sub1 = vi.fn<(name: string, val: unknown) => void>()
    const sub2 = vi.fn<(name: string, val: unknown) => void>()

    const node = new BaseNode<{ in: typeof String }, { out: typeof String }>({
      inputs: { in: String },
      outputs: { out: String },
      onInputChange: (name, val, { emitOutput }) => emitOutput('out', val as string),
    })

    node.subscribe(sub1 as any)
    const unsub2 = node.subscribe(sub2 as any)

    node.setInput('in', 'test')

    expect(sub1).toHaveBeenCalledWith('out', 'test')
    expect(sub2).toHaveBeenCalledWith('out', 'test')

    unsub2()
    node.setInput('in', 'test2')
    expect(sub1).toHaveBeenCalledTimes(2)
    expect(sub2).toHaveBeenCalledTimes(1)
  })

  it('should warn and block invalid types in setInput', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const node = new BaseNode({ inputs: { a: Number }, outputs: {} })

    node.setInput('a', 'string' as any)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid type'))
    expect(node.getInput('a')).toBeUndefined()
    consoleSpy.mockRestore()
  })

  it('should handle custom class validation', () => {
    class Vec2 {
      constructor(
        public x: number,
        public y: number,
      ) {}
    }
    const node = new BaseNode({ inputs: { pos: Vec2 }, outputs: {} })

    const v = new Vec2(1, 2)
    node.setInput('pos', v)
    expect(node.getInput('pos')).toBe(v)

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    node.setInput('pos', { x: 1, y: 2 } as any)
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
