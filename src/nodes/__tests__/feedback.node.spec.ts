import { describe, it, expect, vi } from 'vitest'
import { BaseGraph } from '../../core/base.graph'
import { createFeedbackNode, FeedbackNodeEngine } from '../feedback.node'
import { createMathNode } from '../math.node'
import { createClockNode } from '../clock.node'
import { BaseNode } from '../../core/base.node'

describe('Cycle Feedback Nodes and Async Streaming Pipeline (Ticket 007)', () => {
  describe('FeedbackNodeEngine Headless Unit Tests', () => {
    it('initializes with seed initial value on output and previous', () => {
      const fb = createFeedbackNode({ initialData: { initial: 10 } })

      expect(fb.getOutput('output')).toBe(10)
      expect(fb.getOutput('previous')).toBe(10)
      expect(fb.state.currentValue).toBe(10)
      expect(fb.state.nextValue).toBe(10)
      expect(fb.state.stepCount).toBe(0)
    })

    it('stages incoming input in nextValue without immediately modifying current output', () => {
      const fb = createFeedbackNode({ initialData: { initial: 5 } })

      // Send new input
      fb.setInput('input', 42)

      // Current output remains latched at 5
      expect(fb.getOutput('output')).toBe(5)
      expect(fb.state.currentValue).toBe(5)
      // Staged nextValue holds the incoming value
      expect(fb.state.nextValue).toBe(42)
    })

    it('advances nextValue -> currentValue on step() and tracks cycle count', () => {
      const fb = createFeedbackNode({ initialData: { initial: 0 } })

      fb.setInput('input', 99)
      const stepped = fb.step()

      expect(stepped).toBe(99)
      expect(fb.getOutput('output')).toBe(99)
      expect(fb.getOutput('previous')).toBe(0)
      expect(fb.state.stepCount).toBe(1)

      // Step again without new input retains 99
      fb.step()
      expect(fb.getOutput('output')).toBe(99)
      expect(fb.getOutput('previous')).toBe(99)
      expect(fb.state.stepCount).toBe(2)
    })

    it('resets back to initial value when reset() is invoked or reset input is true', () => {
      const fb = createFeedbackNode({ initialData: { initial: 100 } })

      fb.setInput('input', 500)
      fb.step()
      expect(fb.getOutput('output')).toBe(500)

      fb.reset()
      expect(fb.getOutput('output')).toBe(100)
      expect(fb.state.currentValue).toBe(100)
      expect(fb.state.stepCount).toBe(0)

      // Test reset input port
      fb.setInput('input', 777)
      fb.step()
      expect(fb.getOutput('output')).toBe(777)

      fb.setInput('reset', true)
      expect(fb.getOutput('output')).toBe(100)
    })
  })

  describe('Closed-Loop Accumulator & Feedback Cycle in BaseGraph', () => {
    it('executes closed-loop state accumulation across discrete graph.step() boundaries without infinite recursion', () => {
      const graph = new BaseGraph()

      const fb = createFeedbackNode({ id: 'fb', initialData: { initial: 0 } })
      const math = createMathNode({ id: 'math', initialData: { b: 1, operator: 'ADD' } })

      graph.addNode(fb)
      graph.addNode(math)

      // Connect feedback output -> math input a
      expect(graph.addEdge('fb:output', 'math:a')).toBe(true)
      // Connect math result -> feedback input (closing the loop!)
      expect(graph.addEdge('math:result', 'fb:input')).toBe(true)

      graph.flush()

      // Initial state:
      // Feedback output is 0. Math adds 0 + 1 = 1. Math emits 1 to fb:input.
      // Feedback latches 1 in nextValue, but output remains 0!
      expect(fb.getOutput('output')).toBe(0)
      expect(math.getOutput('result')).toBe(1)
      expect(fb.state.nextValue).toBe(1)

      // Advance Cycle 1
      graph.step()
      expect(fb.getOutput('output')).toBe(1)
      expect(math.getOutput('result')).toBe(2)
      expect(fb.state.nextValue).toBe(2)

      // Advance Cycle 2
      graph.step()
      expect(fb.getOutput('output')).toBe(2)
      expect(math.getOutput('result')).toBe(3)
      expect(fb.state.nextValue).toBe(3)

      // Advance Cycle 3
      graph.step()
      expect(fb.getOutput('output')).toBe(3)
      expect(math.getOutput('result')).toBe(4)
      expect(fb.state.nextValue).toBe(4)
    })

    it('advances feedback loop when step input is triggered by a clock pulse', () => {
      const graph = new BaseGraph()

      const fb = createFeedbackNode({ id: 'fb-clocked', initialData: { initial: 10 } })
      const math = createMathNode({ id: 'math-doubler', initialData: { b: 2, operator: 'MULTIPLY' } })

      graph.addNode(fb)
      graph.addNode(math)

      graph.addEdge('fb-clocked:output', 'math-doubler:a')
      graph.addEdge('math-doubler:result', 'fb-clocked:input')
      graph.flush()

      // Output = 10, math = 20, fb staged nextValue = 20
      expect(fb.getOutput('output')).toBe(10)
      expect(math.getOutput('result')).toBe(20)

      // Trigger step input
      fb.setInput('step', true)
      graph.flush()

      expect(fb.getOutput('output')).toBe(20)
      expect(math.getOutput('result')).toBe(40)

      fb.setInput('step', false)
      fb.setInput('step', true)
      graph.flush()

      expect(fb.getOutput('output')).toBe(40)
      expect(math.getOutput('result')).toBe(80)
    })

    it('breaks runaway recursion defensively when an uncontrolled direct cycle exists', () => {
      const graph = new BaseGraph()
      const warnCalls: string[] = []
      const originalWarn = console.warn
      console.warn = (...args: any[]) => {
        warnCalls.push(args.join(' '))
        originalWarn(...args)
      }

      try {
        let calls = 0
        const node = new BaseNode({
          id: 'direct-loop',
          inputs: { in: null },
          outputs: { out: null },
          onInputChange: (name, val, ctx) => {
            calls++
            if (name === 'in') {
              ctx.emitOutput('out', Number(val || 0) + 1)
            }
          },
        })

        graph.addNode(node)
        graph.addEdge('direct-loop:out', 'direct-loop:in')

        graph.setPortValue('direct-loop:in', 1)
        graph.flush()

        expect(calls).toBeGreaterThan(50)
        expect(warnCalls.length).toBeGreaterThan(0)
        expect(warnCalls[0]).toMatch(/Maximum (recursion depth|notification flush iterations)/)
      } finally {
        console.warn = originalWarn
      }
    })
  })

  describe('Standardized BaseNode Async Streaming Lifecycle', () => {
    it('manages status transitions: idle -> running -> resolved on executeAsync', async () => {
      const node = new BaseNode({
        id: 'async-task',
        inputs: {},
        outputs: { res: null },
      })

      expect(node.status).toBe('idle')
      expect(node.progress).toBe(0)

      const statusLog: string[] = []
      node.subscribeStatus((status, progress) => {
        statusLog.push(`${status}:${progress}`)
      })

      const promise = node.executeAsync(async () => {
        expect(node.status).toBe('running')
        return 'success-payload'
      })

      const res = await promise
      expect(res).toBe('success-payload')
      expect(node.status).toBe('resolved')
      expect(node.progress).toBe(100)

      expect(statusLog).toEqual(['running:0', 'resolved:100'])
    })

    it('transitions to rejected and records lastError when executeAsync fails', async () => {
      const node = new BaseNode({
        id: 'failing-task',
        inputs: {},
        outputs: {},
      })

      const error = new Error('Remote network timeout')

      await expect(
        node.executeAsync(async () => {
          throw error
        }),
      ).rejects.toThrow('Remote network timeout')

      expect(node.status).toBe('rejected')
      expect(node.lastError).toBe(error)
    })
  })
})

