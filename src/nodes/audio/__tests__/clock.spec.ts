import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  AudioEventSchema,
  noteToFrequency,
  frequencyToMidi,
  AudioClockNodeEngine,
  MockAudioTimeProvider,
  createAudioClockNode,
} from '../index'

describe('Ticket 009: Audio Clock, Transport & Event Scheduler', () => {
  describe('AudioEvent Schema & Pitch Utilities', () => {
    it('validates a well-formed AudioEvent with AudioEventSchema', () => {
      const event = {
        time: 1.25,
        duration: 0.5,
        note: 'C4',
        freq: 261.63,
        velocity: 0.9,
        pan: -0.2,
        params: { cutoff: 1500 },
      }

      const res = AudioEventSchema.safeParse(event)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.note).toBe('C4')
        expect(res.data.velocity).toBe(0.9)
      }
    })

    it('applies default values for velocity and pan when omitted', () => {
      const minimalEvent = {
        time: 0.0,
        duration: 0.25,
      }

      const res = AudioEventSchema.safeParse(minimalEvent)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.velocity).toBe(0.8)
        expect(res.data.pan).toBe(0.0)
      }
    })

    it('accurately computes note frequencies via noteToFrequency', () => {
      expect(noteToFrequency('A4')).toBeCloseTo(440, 1)
      expect(noteToFrequency('a4')).toBeCloseTo(440, 1)
      expect(noteToFrequency('A3')).toBeCloseTo(220, 1)
      expect(noteToFrequency('A5')).toBeCloseTo(880, 1)
      expect(noteToFrequency('C4')).toBeCloseTo(261.63, 1)
      expect(noteToFrequency('C5')).toBeCloseTo(523.25, 1)

      // Accidentals enharmonic equivalence
      expect(noteToFrequency('C#4')).toBeCloseTo(noteToFrequency('Db4'), 2)
      expect(noteToFrequency('F#3')).toBeCloseTo(noteToFrequency('Gb3'), 2)

      // Direct MIDI number
      expect(noteToFrequency(69)).toBe(440)
      expect(noteToFrequency(60)).toBeCloseTo(261.63, 1)

      // Direct frequency passthrough
      expect(noteToFrequency(1000)).toBe(1000)
    })

    it('converts frequency to closest MIDI note via frequencyToMidi', () => {
      expect(frequencyToMidi(440)).toBe(69)
      expect(frequencyToMidi(220)).toBe(57)
      expect(frequencyToMidi(261.63)).toBe(60)
      expect(frequencyToMidi(523.25)).toBe(72)
    })
  })

  describe('AudioClockNodeEngine', () => {
    let mockTime: MockAudioTimeProvider
    let clock: AudioClockNodeEngine

    beforeEach(() => {
      mockTime = new MockAudioTimeProvider()
      clock = new AudioClockNodeEngine(
        {
          initialData: {
            bpm: 120,
            lookaheadMs: 100,
            run: false, // Don't auto-run timer in test
          },
        },
        mockTime,
      )
    })

    afterEach(() => {
      clock.stop()
    })

    it('calculates CPS based on BPM and beatsPerCycle', () => {
      // 120 BPM with 4 beats per cycle = 120 / (60 * 4) = 0.5 CPS (1 cycle every 2 seconds)
      expect(clock.getCps()).toBe(0.5)

      clock.setBpm(60)
      expect(clock.getCps()).toBe(0.25)

      clock.setBpm(240)
      expect(clock.getCps()).toBe(1.0)
    })

    it('deterministically advances cycle and phase using mock time', () => {
      // Clock starts at time 0
      clock.start()
      let arc = clock.pollAhead()
      expect(arc.cycle).toBe(0)
      expect(arc.phase).toBe(0)
      expect(arc.time).toBe(0)

      // Advance by 1 second (at 120 BPM / 0.5 CPS, 1s = 0.5 cycle)
      arc = clock.advance(1.0)
      expect(arc.cycle).toBe(0)
      expect(arc.phase).toBeCloseTo(0.5, 2)
      expect(arc.time).toBe(1.0)

      // Advance by another 1 second (total 2s = 1.0 cycle)
      arc = clock.advance(1.0)
      expect(arc.cycle).toBe(1)
      expect(arc.phase).toBeCloseTo(0.0, 2)
      expect(arc.time).toBe(2.0)

      // Advance by another 1.5 seconds (total 3.5s = 1.75 cycles)
      arc = clock.advance(1.5)
      expect(arc.cycle).toBe(1)
      expect(arc.phase).toBeCloseTo(0.75, 2)
    })

    it('emits lookahead arc window covering current time + lookaheadMs', () => {
      clock.start()
      // lookaheadMs = 100ms = 0.1s. At 0.5 CPS, 0.1s is 0.05 cycle.
      const arc = clock.advance(0.5)
      expect(arc.duration).toBeCloseTo(0.1, 2)
      expect(arc.end).toBeGreaterThan(arc.start)
      expect(arc.end - arc.start).toBeCloseTo(0.05, 2)
    })

    it('resets cycle and phase on reset()', () => {
      clock.start()
      clock.advance(5.0)
      expect(clock.pollAhead().cycle).toBeGreaterThan(0)

      clock.reset()
      const arc = clock.pollAhead()
      expect(arc.cycle).toBe(0)
      expect(arc.phase).toBe(0)
    })

    it('can be instantiated using createAudioClockNode factory', () => {
      const instance = createAudioClockNode(
        {
          initialData: { bpm: 140, run: false },
        },
        mockTime,
      )
      expect(instance).toBeInstanceOf(AudioClockNodeEngine)
      expect(instance.getBpm()).toBe(140)
      instance.stop()
    })
  })
})
