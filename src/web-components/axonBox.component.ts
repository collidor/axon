import type { EngineNode } from '../systems/magneticDAGEngine.system'
import { TickEngine, type TickListener } from '../systems/tickEngine.system'
import type { AxonBoxType } from './constants'
import { AXON_BOX, TAG_NAMES } from './constants'

export class AxonBox extends HTMLElement implements AxonBoxType, EngineNode {
  // oxlint-disable-next-line typescript/no-explicit-any
  private _nodeData: any = undefined

  // oxlint-disable-next-line typescript/no-explicit-any
  get nodeData(): any {
    return this._nodeData
  }
  // oxlint-disable-next-line typescript/no-explicit-any
  set nodeData(val: any) {
    this._nodeData = val
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  get data(): any {
    return this._nodeData
  }
  // oxlint-disable-next-line typescript/no-explicit-any
  set data(val: any) {
    this.nodeData = val
  }

  readonly [AXON_BOX] = true as const

  #x = 0
  #y = 0
  vx = 0
  vy = 0

  #tickEngine = new TickEngine()
  #currentLerpAnimationCleanup: (() => void) | null = null

  lastRenderedValue: unknown

  get x() {
    return this.#x
  }
  set x(val: number) {
    this.moveTo(val, this.#y)
  }

  get y() {
    return this.#y
  }
  set y(val: number) {
    this.moveTo(this.#x, val)
  }

  get axonNodeType() {
    return this.getAttribute('data-node-type') || ''
  }
  set axonNodeType(v) {
    this.setAttribute('data-node-type', v)
  }

  static get observedAttributes() {
    return ['x', 'y', 'data-node-type', 'data-static', 'static']
  }

  connectedCallback() {
    this.setAttribute('data-axon-node', 'true')

    if (this.hasAttribute('x')) {
      this.#x = parseFloat(this.getAttribute('x') || '0') || this.#x
    }
    if (this.hasAttribute('y')) {
      this.#y = parseFloat(this.getAttribute('y') || '0') || this.#y
    }

    const isExplicitlyStatic =
      this.getAttribute('static') === 'true' ||
      this.getAttribute('data-static') === 'true' ||
      this.hasAttribute('static')

    if (isExplicitlyStatic) {
      this.style.position = 'relative'
      this.style.top = 'auto'
      this.style.left = 'auto'
      this.style.transform = 'none'
      return
    }

    this.style.position = 'absolute'
    this.style.top = '0'
    this.style.left = '0'
    this.style.transform = `translate(${this.#x}px, ${this.#y}px)`
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return
    const isExplicitlyStatic =
      this.getAttribute('static') === 'true' ||
      this.getAttribute('data-static') === 'true' ||
      this.hasAttribute('static')

    if (isExplicitlyStatic) {
      this.style.position = 'relative'
      this.style.top = 'auto'
      this.style.left = 'auto'
      this.style.transform = 'none'
      return
    }

    if (name === 'x') {
      this.#x = parseFloat(newValue) || 0
      this.style.transform = `translate(${this.#x}px, ${this.#y}px)`
    }
    if (name === 'y') {
      this.#y = parseFloat(newValue) || 0
      this.style.transform = `translate(${this.#x}px, ${this.#y}px)`
    }
  }

  disconnectedCallback() {
    this.cancelLerpAnimation()
  }

  private cancelLerpAnimation() {
    if (this.#currentLerpAnimationCleanup) {
      this.#currentLerpAnimationCleanup()
      this.#currentLerpAnimationCleanup = null
    }
  }

  moveTo(x: number = this.#x, y: number = this.#y) {
    this.#x = x
    this.#y = y
    this.style.position = 'absolute'
    this.style.top = '0'
    this.style.left = '0'
    this.style.transform = `translate(${this.#x}px, ${this.#y}px)`
    this.dispatchEvent(new CustomEvent('node-move', { bubbles: true }))
  }

  lerpTo(targetX: number, targetY: number, duration: number = 500) {
    this.cancelLerpAnimation()

    const startX = this.#x
    const startY = this.#y
    let elapsed = 0

    if (startY === targetY) {
      return this.moveTo(targetX, targetY)
    }

    const tickListener: TickListener = {
      callback: (deltaTime) => {
        elapsed += deltaTime
        const t = Math.min(1, elapsed / duration)
        const ease = 1 - Math.pow(1 - t, 3)
        const currentX = startX + (targetX - startX) * ease
        const currentY = startY + (targetY - startY) * ease
        this.moveTo(currentX, currentY)
      },
      duration,
    }

    this.#currentLerpAnimationCleanup = this.#tickEngine.addTickCallback(tickListener)
  }
}

if (!customElements.get(TAG_NAMES.AXON_BOX)) {
  customElements.define(TAG_NAMES.AXON_BOX, AxonBox)
}
