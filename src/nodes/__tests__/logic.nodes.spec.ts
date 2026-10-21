import { describe, it, expect, vi } from 'vitest'
import { createGateNode } from '../gate.node'
import { createLogicNode } from '../logic.node'
import { createCompareNode } from '../compare.node'

describe('Gate Node', () => {
  it('blocks signal propagation when open is false (default)', () => {
    const node = createGateNode({ initialData: { open: false } })
    const sub = vi.fn<(port: string, val: unknown) => void>()
    node.subscribe(sub)

    node.setInput('data', { hp: 50, name: 'Dragon' })
    expect(sub).not.toHaveBeenCalled()
    expect(node.getOutput('output')).toBeUndefined()
  })

  it('propagates data when open is true', () => {
    const node = createGateNode({ initialData: { open: true } })
    const sub = vi.fn<(port: string, val: unknown) => void>()
    node.subscribe(sub)

    node.setInput('data', { hp: 50, name: 'Dragon' })
    expect(sub).toHaveBeenCalledWith('output', { hp: 50, name: 'Dragon' })
    expect(node.getOutput('output')).toEqual({ hp: 50, name: 'Dragon' })
  })

  it('toggles open state and dynamically allows/blocks signals', () => {
    const node = createGateNode({ initialData: { open: false } })
    const sub = vi.fn<(port: string, val: unknown) => void>()
    node.subscribe(sub)

    // Closed: setting data does not emit
    node.setInput('data', 'packet1')
    expect(sub).not.toHaveBeenCalled()

    // Open gate and send new data: emits
    node.setInput('open', true)
    node.setInput('data', 'packet2')
    expect(sub).toHaveBeenCalledWith('output', 'packet2')
    expect(node.getOutput('output')).toBe('packet2')

    // Close gate: next data does not emit
    sub.mockClear()
    node.setInput('open', false)
    node.setInput('data', 'packet3')
    expect(sub).not.toHaveBeenCalled()
  })
})

describe('Logic Node', () => {
  it('evaluates AND, OR, XOR, NAND, NOR, XNOR operations', () => {
    const node = createLogicNode()

    // AND (true, true) -> true
    node.setInput('operator', 'AND')
    node.setInput('a', true)
    node.setInput('b', true)
    expect(node.getOutput('result')).toBe(true)

    // AND (true, false) -> false
    node.setInput('b', false)
    expect(node.getOutput('result')).toBe(false)

    // OR (true, false) -> true
    node.setInput('operator', 'OR')
    expect(node.getOutput('result')).toBe(true)

    // XOR (true, true) -> false
    node.setInput('operator', 'XOR')
    node.setInput('b', true)
    expect(node.getOutput('result')).toBe(false)

    // XOR (true, false) -> true
    node.setInput('b', false)
    expect(node.getOutput('result')).toBe(true)

    // NAND (true, true) -> false
    node.setInput('operator', 'NAND')
    node.setInput('b', true)
    expect(node.getOutput('result')).toBe(false)

    // NOR (false, false) -> true
    node.setInput('operator', 'NOR')
    node.setInput('a', false)
    node.setInput('b', false)
    expect(node.getOutput('result')).toBe(true)

    // XNOR (true, true) -> true
    node.setInput('operator', 'XNOR')
    node.setInput('a', true)
    node.setInput('b', true)
    expect(node.getOutput('result')).toBe(true)
  })

  it('evaluates NOT operator unary mode ignoring input b', () => {
    const node = createLogicNode()

    node.setInput('operator', 'NOT')
    node.setInput('a', true)
    node.setInput('b', true) // should be ignored
    expect(node.getOutput('result')).toBe(false)

    node.setInput('a', false)
    expect(node.getOutput('result')).toBe(true)
  })
})

describe('Compare Node', () => {
  it('evaluates TRUTHY, FALSY, IS_EMPTY, IS_NOT_EMPTY', () => {
    const node = createCompareNode()

    // Truthy
    node.setInput('operator', 'TRUTHY')
    node.setInput('a', 'Hello')
    expect(node.getOutput('result')).toBe(true)

    node.setInput('a', '')
    expect(node.getOutput('result')).toBe(false)

    node.setInput('a', [])
    expect(node.getOutput('result')).toBe(false)

    node.setInput('a', ['item'])
    expect(node.getOutput('result')).toBe(true)

    // Is Empty
    node.setInput('operator', 'IS_EMPTY')
    node.setInput('a', null)
    expect(node.getOutput('result')).toBe(true)

    node.setInput('a', {})
    expect(node.getOutput('result')).toBe(true)

    node.setInput('a', { name: 'Fireball' })
    expect(node.getOutput('result')).toBe(false)
  })

  it('evaluates comparisons with smart numeric coercion', () => {
    const node = createCompareNode()

    // Greater than ("25" > 20) -> true
    node.setInput('operator', 'GREATER_THAN')
    node.setInput('a', '25')
    node.setInput('b', 20)
    expect(node.getOutput('result')).toBe(true)

    // Greater than ("5" > "10") -> false (numeric coercion, 5 < 10)
    node.setInput('a', '5')
    node.setInput('b', '10')
    expect(node.getOutput('result')).toBe(false)

    // Equals (42 == "42") -> true
    node.setInput('operator', 'EQUALS')
    node.setInput('a', 42)
    node.setInput('b', '42')
    expect(node.getOutput('result')).toBe(true)

    // Strict equals (42 === "42") -> false
    node.setInput('operator', 'STRICT_EQUALS')
    node.setInput('a', 42)
    node.setInput('b', '42')
    expect(node.getOutput('result')).toBe(false)

    // Less or equal (10 <= 10) -> true
    node.setInput('operator', 'LESS_EQUAL')
    node.setInput('a', 10)
    node.setInput('b', 10)
    expect(node.getOutput('result')).toBe(true)
  })
})
