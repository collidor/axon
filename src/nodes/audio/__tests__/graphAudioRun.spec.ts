import { describe, it, expect } from 'vitest'
import { BaseGraph } from '../../../core/base.graph'
import {
  createAudioClockNode,
  createSequenceNode,
  createPolySynthNode,
  createDrumSamplerNode,
  createAudioDelayNode,
  createAudioMixerNode,
  createMasterOutputNode,
  AudioDriverManager,
} from '../index'

describe('Full Audio Graph Execution Test', () => {
  it('executes full Imperial March pipeline through mixer to master output', async () => {
    const graph = new BaseGraph()

    const clock = createAudioClockNode({
      id: 'audio-clock-1',
      initialData: { bpm: 120, run: false },
    })
    const leadSeq = createSequenceNode({
      id: 'lead-seq-1',
      initialData: { notes: ['G3', 'G3', 'G3'], velocity: 0.9 },
    })
    const bassSeq = createSequenceNode({
      id: 'bass-seq-1',
      initialData: { notes: ['G2', 'G2', 'G2'], velocity: 0.8 },
    })
    const drumSeq = createSequenceNode({
      id: 'drum-seq-1',
      initialData: { notes: ['bd', 'sd', 'hh'], velocity: 0.85 },
    })
    const leadSynth = createPolySynthNode({ id: 'lead-synth-1' })
    const bassSynth = createPolySynthNode({ id: 'bass-synth-1' })
    const drumSampler = createDrumSamplerNode({ id: 'drum-sampler-1' })
    const delay = createAudioDelayNode({ id: 'delay-fx-1' })
    const mixer = createAudioMixerNode({ id: 'audio-mixer-1' })
    const master = createMasterOutputNode({ id: 'master-out-1' })

    graph.addNode(clock)
    graph.addNode(leadSeq)
    graph.addNode(bassSeq)
    graph.addNode(drumSeq)
    graph.addNode(leadSynth)
    graph.addNode(bassSynth)
    graph.addNode(drumSampler)
    graph.addNode(delay)
    graph.addNode(mixer)
    graph.addNode(master)

    const edges = [
      { from: 'audio-clock-1:arc', to: 'lead-seq-1:arc' },
      { from: 'audio-clock-1:arc', to: 'bass-seq-1:arc' },
      { from: 'audio-clock-1:arc', to: 'drum-seq-1:arc' },
      { from: 'lead-seq-1:events', to: 'lead-synth-1:events' },
      { from: 'bass-seq-1:events', to: 'bass-synth-1:events' },
      { from: 'drum-seq-1:events', to: 'drum-sampler-1:events' },
      { from: 'lead-synth-1:audioOut', to: 'delay-fx-1:audioIn' },
      { from: 'delay-fx-1:audioOut', to: 'audio-mixer-1:in1' },
      { from: 'bass-synth-1:audioOut', to: 'audio-mixer-1:in2' },
      { from: 'drum-sampler-1:audioOut', to: 'audio-mixer-1:in3' },
      { from: 'audio-mixer-1:audioOut', to: 'master-out-1:audioIn' },
    ]

    for (const e of edges) {
      const added = graph.addEdge(e.from, e.to)
      expect(added).toBe(true)
    }

    await graph.settle()

    expect(mixer.getOutputs().activeChannels).toBe(3)
    expect(master.getOutputs().currentVolume).toBe(0.8)
    expect(delay.getOutputs().audioOut).toBe('audio-delay-delay-fx-1')
    expect(mixer.getInput('in1')).toBe('audio-delay-delay-fx-1')
    expect(mixer.getInput('in2')).toBe('audio-bus-bass-synth-1')
    expect(mixer.getInput('in3')).toBe('audio-bus-drums-drum-sampler-1')
    expect(master.getInput('audioIn')).toBe('audio-mixer-audio-mixer-1')

    // Now start the clock!
    clock.setInput('run', true)
    await graph.settle()

    // Advance clock tick
    clock.advance(0.25)
    await graph.settle()
  })
})
