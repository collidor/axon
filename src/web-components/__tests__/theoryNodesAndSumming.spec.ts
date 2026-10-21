import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { nodeRegistry } from '../../core/nodeRegistry'
import { AUDIO_NODE_TYPES } from '../../nodes/audio/audioNodes.constants'
import { registerWebComponentNodes } from '../nodes/registerWebComponentNodes'
import { TAG_NAMES } from '../constants'
import '../nodes'
import { BaseGraph } from '../../core/base.graph'
import { PolySynthNodeEngine } from '../../nodes/audio/polySynth.engine'
import { MasterOutputNodeEngine } from '../../nodes/audio/fx/masterOutput.engine'

describe('Music Theory Web Components & Multi-Input Audio Summing (Ticket 033)', () => {
  beforeEach(() => {
    registerWebComponentNodes()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('registers all 4 music theory nodes with their web component tag names in nodeRegistry', () => {
    const euclidean = nodeRegistry.get(AUDIO_NODE_TYPES.EUCLIDEAN)
    expect(euclidean).toBeDefined()
    expect(euclidean?.component).toBe(TAG_NAMES.AXON_EUCLIDEAN_NODE)

    const scaleQuantizer = nodeRegistry.get(AUDIO_NODE_TYPES.SCALE_QUANTIZER)
    expect(scaleQuantizer).toBeDefined()
    expect(scaleQuantizer?.component).toBe(TAG_NAMES.AXON_SCALE_QUANTIZER_NODE)

    const chord = nodeRegistry.get(AUDIO_NODE_TYPES.CHORD)
    expect(chord).toBeDefined()
    expect(chord?.component).toBe(TAG_NAMES.AXON_CHORD_NODE)

    const arpeggiator = nodeRegistry.get(AUDIO_NODE_TYPES.ARPEGGIATOR)
    expect(arpeggiator).toBeDefined()
    expect(arpeggiator?.component).toBe(TAG_NAMES.AXON_ARPEGGIATOR_NODE)
  })

  it('renders <axon-euclidean-node> custom element with ports and step controls', () => {
    const el = document.createElement(TAG_NAMES.AXON_EUCLIDEAN_NODE) as any
    el.id = 'euclid-test'
    document.body.appendChild(el)

    expect(el.querySelector('.node-header h3')?.textContent).toContain('Euclidean Rhythm')
    expect(el.querySelector('.euclidean-steps-input')).toBeDefined()
    expect(el.querySelector('.euclidean-pulses-input')).toBeDefined()
    expect(el.querySelector('axon-port-in[id="euclid-test:clock"]')).toBeDefined()
    expect(el.querySelector('axon-port-out[id="euclid-test:trigger"]')).toBeDefined()
  })

  it('renders <axon-scale-quantizer-node> custom element with root and scale dropdowns', () => {
    const el = document.createElement(TAG_NAMES.AXON_SCALE_QUANTIZER_NODE) as any
    el.id = 'quant-test'
    document.body.appendChild(el)

    expect(el.querySelector('.node-header h3')?.textContent).toContain('Scale Quantizer')
    expect(el.querySelector('.quantizer-root-select')).toBeDefined()
    expect(el.querySelector('.quantizer-scale-select')).toBeDefined()
    expect(el.querySelector('axon-port-in[id="quant-test:pitch"]')).toBeDefined()
    expect(el.querySelector('axon-port-out[id="quant-test:quantizedNote"]')).toBeDefined()
  })

  it('renders <axon-chord-node> custom element with chord voicing display', () => {
    const el = document.createElement(TAG_NAMES.AXON_CHORD_NODE) as any
    el.id = 'chord-test'
    document.body.appendChild(el)

    expect(el.querySelector('.node-header h3')?.textContent).toContain('Chord Generator')
    expect(el.querySelector('.chord-root-select')).toBeDefined()
    expect(el.querySelector('.chord-type-select')).toBeDefined()
    expect(el.querySelector('.chord-notes-readout')).toBeDefined()
    expect(el.querySelector('axon-port-out[id="chord-test:notes"]')).toBeDefined()
  })

  it('renders <axon-arpeggiator-node> custom element with mode select and octaves input', () => {
    const el = document.createElement(TAG_NAMES.AXON_ARPEGGIATOR_NODE) as any
    el.id = 'arp-test'
    document.body.appendChild(el)

    expect(el.querySelector('.node-header h3')?.textContent).toContain('Arpeggiator')
    expect(el.querySelector('.arp-mode-select')).toBeDefined()
    expect(el.querySelector('.arp-octaves-input')).toBeDefined()
    expect(el.querySelector('axon-port-in[id="arp-test:clock"]')).toBeDefined()
    expect(el.querySelector('axon-port-out[id="arp-test:note"]')).toBeDefined()
  })

  it('escapes potentially dangerous HTML in AxonDisplayNode label and value', () => {
    const el = document.createElement('axon-display-node') as any
    el.id = 'disp-security-test'
    el.nodeData = { label: '<script>alert(1)</script>' }
    document.body.appendChild(el)

    // Script tag must be escaped, not rendered as raw executable element
    expect(el.querySelector('script')).toBeNull()
    expect(el.querySelector('.display-title')?.textContent).toBe('<script>alert(1)</script>')
  })

  it('enforces strict single incoming connection per input port, replacing previous incoming edge', () => {
    const graph = new BaseGraph()
    const synthA = new PolySynthNodeEngine({ id: 'synthA' })
    const synthB = new PolySynthNodeEngine({ id: 'synthB' })
    const master = new MasterOutputNodeEngine({ id: 'master' })

    graph.addNode(synthA)
    graph.addNode(synthB)
    graph.addNode(master)

    // Connect synthA to master audioIn
    const edgeA = graph.addEdge('synthA:audioOut', 'master:audioIn')
    expect(edgeA).toBe(true)
    expect(graph.getEdges()).toHaveLength(1)
    expect((master as any).connectedSourceNode).not.toBeNull()

    // Connecting synthB replaces synthA on master:audioIn
    const edgeB = graph.addEdge('synthB:audioOut', 'master:audioIn')
    expect(edgeB).toBe(true)
    expect(graph.getEdges()).toHaveLength(1)
    expect(graph.getEdges()[0]).toEqual(['synthB:audioOut', 'master:audioIn'])

    // Removing edge leaves 0 edges and disconnects input
    graph.removeEdge('synthB:audioOut', 'master:audioIn')
    expect(graph.getEdges()).toHaveLength(0)
    expect((master as any).connectedSourceNode).toBeNull()
  })
})
