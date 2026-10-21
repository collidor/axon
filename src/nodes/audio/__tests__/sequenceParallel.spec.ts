import { describe, it, expect } from 'vitest'
import {
  SequenceNodeEngine,
  createSequenceNode,
  ParallelNodeEngine,
  createParallelNode,
  createAudioClockNode,
  MockAudioTimeProvider,
} from '../index'

describe('Ticket 022: Pure Graph Sequence & Parallel Nodes', () => {
  describe('SequenceNodeEngine', () => {
    it('initializes with default notes and slices cycle time evenly', () => {
      const seq = createSequenceNode({
        initialData: { notes: ['C4', 'E4', 'G4', 'B4'], durationRatio: 0.8 },
      })

      expect(seq.getNotes()).toEqual(['C4', 'E4', 'G4', 'B4'])

      // Query arc for full cycle [0, 1]
      const events = seq.processArc({
        start: 0,
        end: 1,
        cycle: 0,
        phase: 0,
        time: 10,
        duration: 2,
      })

      expect(events.length).toBe(4)
      expect(events[0].note).toBe('C4')
      expect(events[0].time).toBe(10)
      expect(events[1].note).toBe('E4')
      expect(events[1].time).toBe(10 + 0.25 * 2) // 10.5
      expect(events[2].note).toBe('G4')
      expect(events[2].time).toBe(10 + 0.5 * 2) // 11.0
      expect(events[3].note).toBe('B4')
      expect(events[3].time).toBe(10 + 0.75 * 2) // 11.5

      expect(seq.getOutputs().stepIndex).toBe(0)
      expect(seq.getOutputs().activeNote).toBe('C4')
    })

    it('skips rests ("~" or "rest")', () => {
      const seq = new SequenceNodeEngine({
        initialData: { notes: ['G3', '~', 'G3', 'rest'] },
      })

      const events = seq.processArc({
        start: 0,
        end: 1,
        cycle: 0,
        phase: 0,
        time: 0,
        duration: 1,
      })

      expect(events.length).toBe(2)
      expect(events[0].note).toBe('G3')
      expect(events[0].time).toBe(0)
      expect(events[1].note).toBe('G3')
      expect(events[1].time).toBe(0.5)
    })
  })

  describe('ParallelNodeEngine', () => {
    it('merges multiple event streams concurrently into a single ordered stream', () => {
      const par = createParallelNode()

      par.setInput('in1', [
        { time: 1.0, duration: 0.5, note: 'C4', freq: 261.63 },
        { time: 2.0, duration: 0.5, note: 'G4', freq: 392.0 },
      ])

      par.setInput('in2', [
        { time: 1.0, duration: 0.5, note: 'E4', freq: 329.63 }, // chord with C4
        { time: 1.5, duration: 0.2, note: 'bd', freq: 60 },
      ])

      const merged = par.mergeEvents()
      expect(merged.length).toBe(4)
      expect(par.getOutputs().voiceCount).toBe(4)

      // Verify sorted by time
      expect(merged[0].time).toBe(1.0)
      expect(merged[1].time).toBe(1.0)
      expect(merged[2].time).toBe(1.5)
      expect(merged[3].time).toBe(2.0)
    })
  })

  describe('Integration with AudioClockNodeEngine', () => {
    it('advances sequence with audio clock arc output', () => {
      const mockTime = new MockAudioTimeProvider()
      const clock = createAudioClockNode({ initialData: { bpm: 120, run: false } }, mockTime)
      const seq = createSequenceNode({ initialData: { notes: ['D4', 'A4'] } })

      clock.subscribe((name, val) => {
        if (name === 'arc' && val) {
          seq.setInput('arc', val)
        }
      })

      // Advance clock by 0.1 second (at 120 bpm, 4 beats per cycle = 2 seconds per cycle, cycle window is [0.05, 0.1])
      clock.advance(0.1)
      const events = seq.getOutputs().events as any[]
      expect(Array.isArray(events)).toBe(true)
      expect(events.length).toBeGreaterThan(0)
      expect(events[0].note).toBe('D4')
    })
  })
})
