import { describe, it, expect } from 'vitest'
import { ScaleQuantizerNodeEngine } from '../scaleQuantizer.engine'
import { ArpeggiatorNodeEngine } from '../arpeggiator.engine'
import { AudioClockNodeEngine, MockAudioTimeProvider } from '../clock.engine'
import { BaseGraph } from '../../../core/base.graph'

describe('Audio Math & Theory Bug Fixes (Ticket 031)', () => {
  describe('ScaleQuantizer Octave Math', () => {
    it('snaps C4 to C4 in A minor scale without erroneously jumping to C5', () => {
      const quantizer = new ScaleQuantizerNodeEngine({
        initialData: {
          root: 'A',
          scale: 'minor',
        },
      })

      // Input C4 (MIDI 60)
      const res = quantizer.quantize('C4')
      expect(res.midi).toBe(60)
      expect(res.note).toBe('C4')
      expect(quantizer.getOutput('midi')).toBe(60)
      expect(quantizer.getOutput('quantizedNote')).toBe('C4')
    })

    it('snaps non-scale notes within the same octave when nearest degree is in octave', () => {
      const quantizer = new ScaleQuantizerNodeEngine({
        initialData: {
          root: 'A',
          scale: 'minor',
        },
      })

      // C#4 (61) should snap to C4 (60) or D4 (62)
      const res = quantizer.quantize(61)
      expect([60, 62]).toContain(res.midi)
      expect(['C4', 'D4']).toContain(res.note)
    })
  })

  describe('Arpeggiator Multi-Octave Note Names', () => {
    it('transposes note names across higher octaves instead of repeating base octave names', () => {
      const arp = new ArpeggiatorNodeEngine({
        initialData: {
          mode: 'up',
          octaves: 2,
        },
      })
      arp.setInput('notes', ['C4', 'E4', 'G4'])
      arp.setInput('octaves', 2)

      const notes: string[] = []
      // 3 notes * 2 octaves = 6 steps
      for (let i = 0; i < 6; i++) {
        const step = arp.setStep(i)
        notes.push(step.note)
      }

      // First 3 steps should be octave 4, second 3 steps should be octave 5
      expect(notes).toEqual(['C4', 'E4', 'G4', 'C5', 'E5', 'G5'])
    })
  })

  describe('AudioClock Tick Output', () => {
    it('emits boolean true for tick output rather than timestamp number', () => {
      const mockTime = new MockAudioTimeProvider()
      const clock = new AudioClockNodeEngine(
        {
          initialData: { bpm: 120, run: false },
        },
        mockTime,
      )

      let tickValue: unknown = null
      clock.subscribe((name, val) => {
        if (name === 'tick') tickValue = val
      })

      clock.pollAhead()
      expect(tickValue).toBe(true)
      expect(typeof tickValue).toBe('boolean')
    })

    it('connects audioClock tick output to arpeggiator clock input without port type error', () => {
      const graph = new BaseGraph()
      const mockTime = new MockAudioTimeProvider()
      const clock = new AudioClockNodeEngine({ id: 'clk' }, mockTime)
      const arp = new ArpeggiatorNodeEngine({ id: 'arp' })

      graph.addNode(clock)
      graph.addNode(arp)

      const edge = graph.addEdge('clk:tick', 'arp:clock')
      expect(edge).toBeDefined()
    })
  })
})
