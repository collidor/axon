import type { BaseNode } from '../core/base.node'
import {
  AXON_EDGE,
  AXON_GRAPH,
  AXON_PORT,
  type AxonBoxType,
  type AxonEdgeType,
  type AxonGraphType,
  type AxonPortBaseType,
} from './constants'

export const isAxonEdge = (el: unknown): el is AxonEdgeType => {
  return typeof el === 'object' && el !== null && (el as AxonEdgeType)[AXON_EDGE] === true
}

export const isBaseNode = (el: unknown): el is BaseNode => {
  return (
    typeof el === 'object' && el !== null && (el as BaseNode)[Symbol.toStringTag] === 'BaseNode'
  )
}

export const isAxonGraph = (el: unknown): el is AxonGraphType => {
  return typeof el === 'object' && el !== null && (el as AxonGraphType)[AXON_GRAPH] === true
}

export const isAxonPort = (el: unknown, inOut?: 'in' | 'out'): el is AxonPortBaseType => {
  if (typeof el !== 'object' || el === null) return false
  const htmlEl = el as HTMLElement
  const isPortElement =
    (htmlEl as AxonPortBaseType)[AXON_PORT] !== undefined ||
    (typeof htmlEl.tagName === 'string' && htmlEl.tagName.startsWith('AXON-PORT')) ||
    htmlEl.hasAttribute?.('data-port-in') ||
    htmlEl.hasAttribute?.('data-port-out') ||
    htmlEl.classList?.contains('port-socket') ||
    htmlEl.classList?.contains('edge-socket')
  if (!isPortElement) return false
  if (!inOut) return true

  const isInput =
    (typeof htmlEl.tagName === 'string' && htmlEl.tagName.endsWith('IN')) ||
    htmlEl.hasAttribute?.('data-port-in') ||
    htmlEl.classList?.contains('in-socket') ||
    htmlEl.classList?.contains('input-port') ||
    htmlEl.classList?.contains('input')
  const isOutput =
    (typeof htmlEl.tagName === 'string' && htmlEl.tagName.endsWith('OUT')) ||
    htmlEl.hasAttribute?.('data-port-out') ||
    htmlEl.classList?.contains('out-socket') ||
    htmlEl.classList?.contains('output-port') ||
    htmlEl.classList?.contains('output')

  return inOut === 'in' ? Boolean(isInput) : Boolean(isOutput)
}

export const canConnectPorts = (portA: AxonPortBaseType, portB: AxonPortBaseType): boolean => {
  const isAIn = isAxonPort(portA, 'in')
  const isBIn = isAxonPort(portB, 'in')

  if (isAIn === isBIn) return false

  const dataTypeA = portA.getAttribute('data-type') ?? null
  const dataTypeB = portB.getAttribute('data-type') ?? null

  if (!dataTypeA || !dataTypeB) return true
  if (dataTypeA !== dataTypeB) return false
  return true
}

export const isAxonBox = (el: unknown): el is AxonBoxType => {
  return typeof el === 'object' && el !== null && (el as AxonBoxType).id !== undefined
}

export function escapePortId(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(id)
  }
  return id.replace(/([:.[\]])/g, '\\$1')
}

export function formatValue(val: unknown): string {
  if (val === undefined || val === null) return '-'
  if (typeof val === 'number') return val.toFixed(2)
  if (typeof val === 'boolean') return val ? 'ON' : 'OFF'
  if (typeof val === 'string') return val
  if (typeof val === 'object') return '{...}'
  return typeof val === 'symbol' || typeof val === 'bigint' ? val.toString() : '-'
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const NODE_TYPE_TAG_ALIASES: Record<string, string> = {
  'poly-synth': 'axon-synth-node',
  'synth': 'axon-synth-node',
  'drum-sampler': 'axon-drum-sampler-node',
  'sampler': 'axon-drum-sampler-node',
  'master-output': 'axon-master-output-node',
  'audio-clock': 'axon-audio-clock-node',
  'sequence': 'axon-sequence-node',
  'parallel': 'axon-parallel-node',
  'step-sequencer': 'axon-step-sequencer-node',
  'delay': 'axon-delay-node',
  'reverb': 'axon-reverb-node',
  'bitcrusher': 'axon-bitcrusher-node',
  'audio-mixer': 'axon-audio-mixer-node',
  'mixer': 'axon-audio-mixer-node',
  'euclidean': 'axon-euclidean-node',
  'scale-quantizer': 'axon-scale-quantizer-node',
  'chord': 'axon-chord-node',
  'arpeggiator': 'axon-arpeggiator-node',
}

export function resolveNodeTagName(type: string): string {
  const normalized = type.toLowerCase().replace(/_/g, '-')
  if (NODE_TYPE_TAG_ALIASES[normalized]) {
    return NODE_TYPE_TAG_ALIASES[normalized]
  }

  const tag = normalized.startsWith('axon-') ? normalized : `axon-${normalized}`
  if (typeof customElements !== 'undefined') {
    if (customElements.get(tag)) return tag
    if (customElements.get(`${tag}-node`)) return `${tag}-node`
    const withoutNode = tag.replace(/-node$/, '')
    if (customElements.get(withoutNode)) return withoutNode
  }
  return tag.endsWith('-node') ? tag : `${tag}-node`
}
