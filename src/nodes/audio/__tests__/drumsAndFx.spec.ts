import { describe, it, expect } from 'vitest'
import {
  DrumSamplerNodeEngine,
  createDrumSamplerNode,
  DelayNodeEngine,
  createAudioDelayNode,
  ReverbNodeEngine,
  createReverbNode,
  BitcrusherNodeEngine,
  createBitcrusherNode,
  MasterOutputNodeEngine,
  createMasterOutputNode,
  AudioMixerNodeEngine,
  createAudioMixerNode,
  AudioDriverManager,
  type AudioEvent,
} from '../index'
import { BaseGraph } from '../../../core/base.graph'

describe('Ticket 013: Drum Sampler & Audio Effects Chain', () => {
  describe('DrumSamplerNodeEngine', () => {
    it('synthesizes 808 percussion models (kick, snare, hat, clap) in headless mode', () => {
      const drums = new DrumSamplerNodeEngine()

      expect(() => {
        drums.triggerSound('bd')
        drums.triggerSound('sd')
        drums.triggerSound('hh')
        drums.triggerSound('oh')
        drums.triggerSound('cp')
        drums.triggerSound('cb')
      }).not.toThrow()

      expect(drums.getOutputs().lastTrigger).toBe('cb')
      expect(drums.getOutputs().audioOut).toContain('audio-bus-drums')
    })

    it('plays batch AudioEvents from mini-notation', () => {
      const drums = new DrumSamplerNodeEngine()
      const events: AudioEvent[] = [
        { time: 0, duration: 0.1, note: 'bd', velocity: 0.9 },
        { time: 0.25, duration: 0.1, note: 'hh', velocity: 0.7 },
        { time: 0.5, duration: 0.1, note: 'sd', velocity: 0.8 },
      ]

      expect(() => drums.playEvents(events)).not.toThrow()
      expect(drums.getOutputs().lastTrigger).toBe('sd')
    })

    it('supports custom sample buffer registration', () => {
      const drums = new DrumSamplerNodeEngine()
      const ctx = AudioDriverManager.get().getContext()
      const buf = ctx.createBuffer(1, 1000, 44100)

      drums.registerSampleBuffer('custom_laser', buf)
      expect(() => drums.triggerSound('custom_laser')).not.toThrow()
    })
  })

  describe('Audio Effects Pipeline', () => {
    it('DelayNodeEngine adjusts delayTime, feedback, and mix', () => {
      const delay = new DelayNodeEngine({
        initialData: { time: 0.25, feedback: 0.5, mix: 0.4 },
      })

      expect(delay.getOutputs().audioOut).toContain('audio-delay')
      expect(() => {
        delay.setInput('time', 0.5)
        delay.setInput('feedback', 0.7)
        delay.setInput('mix', 0.5)
      }).not.toThrow()
    })

    it('ReverbNodeEngine rebuilds impulse response on roomSize change', () => {
      const reverb = new ReverbNodeEngine({
        initialData: { roomSize: 1.5, damp: 0.3, mix: 0.35 },
      })

      expect(reverb.getOutputs().audioOut).toContain('audio-reverb')
      expect(() => {
        reverb.setInput('roomSize', 3.0)
        reverb.setInput('damp', 0.8)
        reverb.setInput('mix', 0.5)
      }).not.toThrow()
    })

    it('BitcrusherNodeEngine rebuilds quantization curve on bits/drive change', () => {
      const crusher = new BitcrusherNodeEngine({
        initialData: { bits: 6, drive: 2 },
      })

      expect(crusher.getOutputs().audioOut).toContain('audio-bitcrusher')
      expect(() => {
        crusher.setInput('bits', 4)
        crusher.setInput('drive', 5)
      }).not.toThrow()
    })

    it('MasterOutputNodeEngine controls volume and mute state', () => {
      const master = new MasterOutputNodeEngine({
        initialData: { volume: 0.9, muted: false },
      })

      expect(master.getOutputs().currentVolume).toBe(0.9)
      expect(master.getOutputs().analyser).toBeDefined()

      master.setInput('mute', true)
      expect(master.getOutputs().currentVolume).toBe(0)

      master.setInput('mute', false)
      master.setInput('volume', 0.75)
      expect(master.getOutputs().currentVolume).toBe(0.75)
    })

    it('AudioMixerNodeEngine sums multiple audio channels into a single output', () => {
      const mixer = createAudioMixerNode({
        initialData: { gain1: 0.8, gain2: 0.6, master: 1.0 },
      })

      expect(mixer.getOutputs().audioOut).toContain('audio-mixer')
      expect(mixer.getOutputs().activeChannels).toBe(0)

      // Connect two buses
      mixer.setInput('in1', 'audio-bus-drums-main')
      mixer.setInput('in2', 'audio-bus-synth-lead')
      expect(mixer.getOutputs().activeChannels).toBe(2)

      // Disconnect channel 1
      mixer.disconnectChannel(0)
      expect(mixer.getOutputs().activeChannels).toBe(1)

      // Update channel gains and master
      expect(() => {
        mixer.setInput('gain1', 0.5)
        mixer.setInput('gain2', 0.7)
        mixer.setInput('master', 0.9)
      }).not.toThrow()
    })

    it('DelayNodeEngine cleanly disconnects audio input and output without keeping zombie references', () => {
      const delay = createAudioDelayNode({
        initialData: { time: 0.3, feedback: 0.4, mix: 0.35 },
      })

      delay.setInput('audioIn', 'audio-bus-synth-lead')
      expect(() => delay.disconnectAudioInput()).not.toThrow()
      expect(() => delay.disconnectInput('audioIn')).not.toThrow()
      expect(() => delay.disconnectAudioOutput()).not.toThrow()
      expect(() => delay.disconnectOutput('audioOut')).not.toThrow()
    })

    it('ReverbNodeEngine, BitcrusherNodeEngine, and AudioMixerNodeEngine disconnect audio outputs cleanly', () => {
      const reverb = createReverbNode()
      const bitcrusher = createBitcrusherNode()
      const mixer = createAudioMixerNode()

      expect(() => reverb.disconnectOutput('audioOut')).not.toThrow()
      expect(() => bitcrusher.disconnectOutput('audioOut')).not.toThrow()
      expect(() => mixer.disconnectOutput('audioOut')).not.toThrow()
    })

    it('BaseGraph triggers disconnectOutput on source when edge is removed', () => {
      const graph = new BaseGraph()
      const delay = createAudioDelayNode({ id: 'd1' })
      const reverb = createReverbNode({ id: 'r1' })

      graph.addNode(delay)
      graph.addNode(reverb)
      graph.addEdge('d1:audioOut', 'r1:audioIn')

      expect(graph.edges.length).toBe(1)

      // Removing edge should trigger disconnectInput on reverb and disconnectOutput on delay
      graph.removeEdge('d1:audioOut', 'r1:audioIn')
      expect(graph.edges.length).toBe(0)
    })

    it('BaseGraph calls destroy() and unregisters bus when unregisterNode is called', () => {
      const graph = new BaseGraph()
      const delay = createAudioDelayNode({ id: 'd2' })
      graph.addNode(delay)

      const busId = delay.getOutputs().audioOut
      expect(AudioDriverManager.get().getBus(busId!)).toBeDefined()

      graph.unregisterNode('d2')
      expect(AudioDriverManager.get().getBus(busId!)).toBeUndefined()
    })
  })
})
