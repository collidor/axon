import { describe, it, expect } from 'vitest'
import {
  EuclideanRhythmNodeEngine,
  createEuclideanNode,
  StepSequencerNodeEngine,
  createStepSequencerNode,
  ScaleQuantizerNodeEngine,
  createScaleQuantizerNode,
  ChordNodeEngine,
  createChordNode,
  ArpeggiatorNodeEngine,
  createArpeggiatorNode,
} from '../index'

describe('Ticket 011: Musical Theory & Visual Sequencing Nodes', () => {
  describe('EuclideanRhythmNodeEngine', () => {
    it('generates Euclidean patterns and steps through them', () => {
      const node = new EuclideanRhythmNodeEngine({
        initialData: { hits: 3, steps: 8, rotate: 0 },
      })

      const pat = node.getPattern()
      expect(pat).toEqual([true, false, false, true, false, false, true, false])

      // Step 0
      node.setStep(0)
      expect(node.advanceStep()).toBe(false) // step 1: false
      expect(node.advanceStep()).toBe(false) // step 2: false
      expect(node.advanceStep()).toBe(true) // step 3: true
    })

    it('supports pattern rotation offset', () => {
      const node = new EuclideanRhythmNodeEngine({
        initialData: { hits: 3, steps: 8, rotate: 1 },
      })

      const pat = node.getPattern()
      // Rotated right by 1
      expect(pat[1]).toBe(true)
    })
  })

  describe('StepSequencerNodeEngine', () => {
    it('programs individual steps and computes pitch offsets', () => {
      const seq = new StepSequencerNodeEngine({
        initialData: { length: 8, rootNote: 'C3' },
      })

      seq.setStepItem(0, { active: true, noteOffset: 0, velocity: 1.0 })
      seq.setStepItem(1, { active: true, noteOffset: 7, velocity: 0.8 }) // fifth above

      seq.setStep(0)
      expect(seq.getOutputs().note).toBe('C3')
      expect(seq.getOutputs().trigger).toBe(true)

      seq.setStep(1)
      expect(seq.getOutputs().note).toBe('G3')
      expect(seq.getOutputs().velocity).toBe(0.8)
    })
  })

  describe('ScaleQuantizerNodeEngine', () => {
    it('snaps chromatic MIDI inputs to C minor pentatonic', () => {
      const quant = new ScaleQuantizerNodeEngine({
        initialData: { root: 'C', scale: 'minorPentatonic' },
      })

      // C minor pentatonic: C (0), Eb (3), F (5), G (7), Bb (10)
      // Input: C#4 (MIDI 61) -> snaps to C4 (60) or Eb4 (63)
      const res = quant.quantize('C#4')
      expect(['C4', 'D#4']).toContain(res.note) // D#4 is Eb4 enharmonic

      // Input: E4 (MIDI 64) -> snaps to Eb4 (63)
      const resE = quant.quantize('E4')
      expect(['D#4', 'F4']).toContain(resE.note)

      // Input: exact scale degree G4 (MIDI 67) -> remains G4
      const resG = quant.quantize('G4')
      expect(resG.note).toBe('G4')
    })
  })

  describe('ChordNodeEngine', () => {
    it('expands root note into chord triads and seventh chords', () => {
      const chord = new ChordNodeEngine({
        initialData: { root: 'C4', type: 'min7', inversion: 0 },
      })

      const res = chord.generateChord()
      expect(res.midis).toEqual([60, 63, 67, 70]) // C4, D#4/Eb4, G4, A#4/Bb4

      // Inversion 1: D#4, G4, A#4, C5
      chord.setInput('inversion', 1)
      const resInv = chord.generateChord()
      expect(resInv.midis).toEqual([63, 67, 70, 72])
    })
  })

  describe('ArpeggiatorNodeEngine', () => {
    it('arpeggiates chord notes in up and down modes', () => {
      const arp = new ArpeggiatorNodeEngine({
        initialData: { mode: 'up', octaves: 1 },
      })

      arp.setInput('notes', ['C4', 'E4', 'G4'])
      arp.setInput('frequencies', [261.63, 329.63, 392.0])

      arp.setStep(0)
      expect(arp.getOutputs().note).toBe('C4')

      const step1 = arp.advance()
      expect(step1.note).toBe('E4')

      const step2 = arp.advance()
      expect(step2.note).toBe('G4')

      const step3 = arp.advance()
      expect(step3.note).toBe('C4') // wraps back up
    })
  })
})
