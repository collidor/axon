import { describe, it, expect, vi } from 'vitest'
import { createTypeConvertNode } from '../typeConvert.node'

describe('TypeConvert Node', () => {
  it('converts string to integer (parseInt)', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'integer' } })
    const sub = vi.fn<(name: string | number | symbol, value: unknown) => void>()
    node.subscribe(sub)

    node.setInput('input', '42')
    expect(sub).toHaveBeenCalledWith('output', 42)
    expect(sub).toHaveBeenCalledWith('integer', 42)
    expect(node.getOutput('output')).toBe(42)
    expect(node.getOutput('integer')).toBe(42)
  })

  it('handles negative integers, whitespace, and floats for integer target', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'integer' } })

    node.setInput('input', '  -15  ')
    expect(node.getOutput('output')).toBe(-15)

    node.setInput('input', '123.75')
    expect(node.getOutput('output')).toBe(123)

    node.setInput('input', 99.4)
    expect(node.getOutput('output')).toBe(99)
  })

  it('supports custom radix (hexadecimal, binary)', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'integer', radix: 16 } })

    node.setInput('input', 'FF')
    expect(node.getOutput('output')).toBe(255)

    node.setInput('radix', 2)
    node.setInput('input', '1010')
    expect(node.getOutput('output')).toBe(10)
  })

  it('falls back to default fallback or custom fallback on invalid input', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'integer', fallback: -1 } })

    node.setInput('input', 'not_a_number')
    expect(node.getOutput('output')).toBe(-1)

    node.setInput('input', '')
    expect(node.getOutput('output')).toBe(-1)

    node.setInput('input', null)
    expect(node.getOutput('output')).toBe(-1)
  })

  it('converts to number / float', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'number' } })

    node.setInput('input', '3.14159')
    expect(node.getOutput('output')).toBeCloseTo(3.14159)

    node.setInput('input', '-0.05')
    expect(node.getOutput('output')).toBeCloseTo(-0.05)
  })

  it('converts to boolean', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'boolean' } })

    node.setInput('input', 'true')
    expect(node.getOutput('output')).toBe(true)

    node.setInput('input', 'false')
    expect(node.getOutput('output')).toBe(false)

    node.setInput('input', '0')
    expect(node.getOutput('output')).toBe(false)

    node.setInput('input', '1')
    expect(node.getOutput('output')).toBe(true)

    node.setInput('input', '')
    expect(node.getOutput('output')).toBe(false)
  })

  it('converts to string', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'string' } })

    node.setInput('input', 500)
    expect(node.getOutput('output')).toBe('500')

    node.setInput('input', true)
    expect(node.getOutput('output')).toBe('true')
  })

  it('parses JSON strings', () => {
    const node = createTypeConvertNode({ initialData: { targetType: 'json' } })

    node.setInput('input', '{"hp": 25, "name": "Goblin"}')
    expect(node.getOutput('output')).toEqual({ hp: 25, name: 'Goblin' })

    node.setInput('input', 'invalid json')
    expect(node.getOutput('output')).toBeNull()
  })
})

