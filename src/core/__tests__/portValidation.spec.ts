import { describe, it, expect } from 'vitest'
import {
  toPortDescriptor,
  isPortAssignable,
  validatePortConnection,
} from '../portValidation'
import { BaseGraph } from '../base.graph'
import { BaseNode } from '../base.node'
import { s } from '@collidor/struct'

describe('Type-Safe Edge Connections & Port Subtyping (Ticket 001)', () => {
  describe('toPortDescriptor', () => {
    it('normalizes JS primitive constructors to AST descriptors', () => {
      expect(toPortDescriptor(Number)).toEqual({ kind: 'number' })
      expect(toPortDescriptor(String)).toEqual({ kind: 'string' })
      expect(toPortDescriptor(Boolean)).toEqual({ kind: 'boolean' })
      expect(toPortDescriptor(BigInt)).toEqual({ kind: 'bigint' })
      expect(toPortDescriptor(Date)).toEqual({ kind: 'date' })
      expect(toPortDescriptor(Array)).toEqual({ kind: 'array', items: { kind: 'any' } })
    })

    it('normalizes null or undefined to any wildcard', () => {
      expect(toPortDescriptor(null)).toEqual({ kind: 'any' })
      expect(toPortDescriptor(undefined)).toEqual({ kind: 'any' })
    })

    it('extracts descriptor from @collidor/struct schemas', () => {
      const numSchema = s.number().min(10)
      const desc = toPortDescriptor(numSchema)
      expect(desc.kind).toBe('number')
      expect((desc as any).min).toBe(10)
    })
  })

  describe('isPortAssignable & validatePortConnection', () => {
    it('allows matching primitive constructors', () => {
      expect(isPortAssignable(Number, Number)).toBe(true)
      expect(isPortAssignable(String, String)).toBe(true)
      expect(isPortAssignable(Boolean, Boolean)).toBe(true)
    })

    it('rejects mismatched primitive constructors with descriptive reason', () => {
      expect(isPortAssignable(String, Number)).toBe(false)
      const res = validatePortConnection(String, Number)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('cannot connect to input of type number')
    })

    it('treats null as wildcard allowing connection in both directions', () => {
      expect(isPortAssignable(null, Number)).toBe(true)
      expect(isPortAssignable(Number, null)).toBe(true)
      expect(validatePortConnection(null, Number).valid).toBe(true)
    })

    it('enforces sound nullability across struct schemas', () => {
      const nonNullStr = s.string()
      const nullableStr = s.string().nullable()

      // Non-nullable output CAN flow into nullable input
      expect(isPortAssignable(nonNullStr, nullableStr)).toBe(true)

      // Nullable output CANNOT flow into non-nullable input (prevents NPE)
      expect(isPortAssignable(nullableStr, nonNullStr)).toBe(false)
      const res = validatePortConnection(nullableStr, nonNullStr)
      expect(res.valid).toBe(false)
    })

    it('validates Odin named structs compatibility', () => {
      const PositionA = s.struct('Position', { x: s.number(), y: s.number() })
      const PositionB = s.struct('Position', { x: s.number(), y: s.number() })
      const Health = s.struct('Health', { current: s.number(), max: s.number() })

      expect(isPortAssignable(PositionA, PositionB)).toBe(true)
      expect(isPortAssignable(PositionA, Health)).toBe(false)

      const res = validatePortConnection(PositionA, Health)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('struct "Position"')
      expect(res.reason).toContain('struct "Health"')
    })
  })

  describe('BaseGraph Integration', () => {
    class OutputNode extends BaseNode {
      constructor(id: string) {
        super({
          id,
          inputs: { in: null },
          outputs: { numOut: Number, strOut: String },
        })
      }
    }

    class InputNode extends BaseNode {
      constructor(id: string) {
        super({
          id,
          inputs: { numIn: Number, strIn: String },
          outputs: { out: null },
        })
      }
    }

    it('canConnectPorts evaluates graph port IDs accurately', () => {
      const graph = new BaseGraph()
      const n1 = new OutputNode('n1')
      const n2 = new InputNode('n2')
      graph.addNode(n1)
      graph.addNode(n2)

      // Compatible: numOut -> numIn
      expect(graph.canConnectPorts('n1:numOut', 'n2:numIn').valid).toBe(true)

      // Incompatible: strOut -> numIn
      const badCheck = graph.canConnectPorts('n1:strOut', 'n2:numIn')
      expect(badCheck.valid).toBe(false)
      expect(badCheck.reason).toContain('Incompatible port types')
    })

    it('addEdge connects compatible ports and rejects incompatible ports', () => {
      const graph = new BaseGraph()
      const n1 = new OutputNode('n1')
      const n2 = new InputNode('n2')
      graph.addNode(n1)
      graph.addNode(n2)

      // 1. Compatible connection succeeds
      const success = graph.addEdge('n1:numOut', 'n2:numIn')
      expect(success).toBe(true)

      // 2. Incompatible connection is rejected and not added
      const failure = graph.addEdge('n1:strOut', 'n2:numIn')
      expect(failure).toBe(false)
    })
  })
})
