import { AXON_EDGE, type AxonEdgeType, TAG_NAMES } from './constants'

export class AxonEdge extends HTMLElement implements AxonEdgeType {
  readonly [AXON_EDGE] = true as const
  pulseIntensity = 0
  pulseCleanup: (() => void) | null = null
}

if (!customElements.get(TAG_NAMES.AXON_EDGE)) {
  customElements.define(TAG_NAMES.AXON_EDGE, AxonEdge)
}
