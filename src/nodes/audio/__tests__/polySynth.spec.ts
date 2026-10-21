import { describe, it, expect, afterEach } from 'vitest'
import {
  AudioDriverManager,
  NullAudioContext,
  PolySynthNodeEngine,
  createPolySynthNode,
  type AudioEvent,
} from '../index'

describe('Ticket 012: Headless Web Audio Driver & PolySynth Engine', () => {
  describe('AudioDriverManager', () => {
    it('returns a singleton context manager and detects headless mode in tests', () => {
      const driver = AudioDriverManager.get()
      expect(driver).toBeDefined()
      expect(driver.isHeadless()).toBe(true)

      const ctx = driver.getContext()
      expect(ctx).toBeInstanceOf(NullAudioContext)
      expect(ctx.state).toBe('running')
    })

    it('creates mock nodes that support standard Web Audio API methods', () => {
      const ctx = AudioDriverManager.get().getContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      expect(osc).toBeDefined()
      expect(gain).toBeDefined()
      expect(filter).toBeDefined()

      // Connect graph
      expect(() => {
        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop()
      }).not.toThrow()
    })
  })

  describe('PolySynthNodeEngine', () => {
    let synth: PolySynthNodeEngine

    afterEach(() => {
      synth?.destroy()
    })

    it('initializes a pool of voices and emits audioOut bus id', () => {
      synth = new PolySynthNodeEngine({
        initialData: {
          waveform: 'sawtooth',
          cutoff: 2000,
          maxVoices: 8,
        },
      })

      expect(synth.getOutputs().audioOut).toContain('audio-bus')
    })

    it('schedules individual notes without throwing in headless mode', () => {
      synth = new PolySynthNodeEngine()
      expect(() => {
        synth.playNote('A4', 0.5)
        synth.playNote('C5', 0.25)
      }).not.toThrow()
    })

    it('processes batch AudioEvents from mini-notation or sequencer', () => {
      synth = new PolySynthNodeEngine()

      const events: AudioEvent[] = [
        {
          time: 0,
          duration: 0.25,
          note: 'C4',
          freq: 261.63,
          velocity: 0.9,
          pan: -0.5,
        },
        {
          time: 0.25,
          duration: 0.25,
          note: 'G4',
          freq: 392.0,
          velocity: 0.8,
          pan: 0.5,
        },
      ]

      synth.playEvents(events)
      expect(synth.getOutputs().lastEvent).toEqual(events[1])
    })

    it('safely handles micro-negative floating point times without throwing RangeError', () => {
      synth = new PolySynthNodeEngine()
      const microNegativeEvents: AudioEvent[] = [
        {
          time: -6.93889e-18,
          duration: 0.25,
          note: 'G3',
          freq: 196.0,
          velocity: 0.9,
        },
      ]
      expect(() => {
        synth.playEvents(microNegativeEvents)
      }).not.toThrow()
    })

    it('can be instantiated using createPolySynthNode factory', () => {
      synth = createPolySynthNode({
        initialData: { waveform: 'square' },
      })
      expect(synth).toBeInstanceOf(PolySynthNodeEngine)
    })

    it('modulates filter cutoff with filterEnv parameter', () => {
      synth = new PolySynthNodeEngine({
        initialData: {
          cutoff: 1000,
          filterEnv: 3000,
          attack: 0.05,
          decay: 0.1,
          sustain: 0.5,
        },
      })
      expect(() => {
        synth.playNote('C4', 0.5)
      }).not.toThrow()
    })

    it('generates white noise when waveform is configured as noise', () => {
      synth = new PolySynthNodeEngine({
        initialData: {
          waveform: 'noise',
        },
      })
      expect(() => {
        synth.playNote('C4', 0.2)
      }).not.toThrow()
    })
  })
})
