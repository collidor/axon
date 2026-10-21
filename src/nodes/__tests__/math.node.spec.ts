import { describe, it, expect, vi } from 'vitest'
import { createMathNode } from '../math.node'

describe('MathNode', () => {
  it('should calculate ADD by default', () => {
    const node = createMathNode()
    node.setInput('a', 10)
    node.setInput('b', 5)
    expect(node.getOutput('result')).toBe(15)
  })

  it('should update result when operator changes to SUBTRACT', () => {
    const node = createMathNode()
    node.setInput('a', 10)
    node.setInput('b', 5)
    expect(node.getOutput('result')).toBe(15)

    node.setInput('operator', 'SUBTRACT')
    expect(node.getOutput('result')).toBe(5)
  })

  it('should update result when operator changes to MULTIPLY', () => {
    const node = createMathNode()
    node.setInput('a', 10)
    node.setInput('b', 5)
    node.setInput('operator', 'MULTIPLY')
    expect(node.getOutput('result')).toBe(50)
  })

  it('should update result when operator changes to DIVIDE', () => {
    const node = createMathNode()
    node.setInput('a', 10)
    node.setInput('b', 2)
    node.setInput('operator', 'DIVIDE')
    expect(node.getOutput('result')).toBe(5)
  })

  it('should trigger subscriber when operator changes result', () => {
    const node = createMathNode()
    node.setInput('a', 10)
    node.setInput('b', 5)

    const sub = vi.fn<(name: 'result', val: unknown) => void>()
    node.subscribe(sub)

    node.setInput('operator', 'SUBTRACT')
    expect(sub).toHaveBeenCalledWith('result', 5)
  })
})
