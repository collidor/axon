export type TickCallback = (deltaTime: number) => void
export type TickListener = {
  callback: TickCallback
  duration?: number
  startTime?: number
}

export class TickEngine {
  static instance: TickEngine | null = null

  lastTimestamp = 0
  simulationTime = 0
  timeScale = 1.0

  tickRate = 60
  tickInterval = 1000 / this.tickRate
  accumulatedTime = 0
  isRunning = false

  protected callbacks: Set<TickListener> = new Set()
  #timerId: ReturnType<typeof setTimeout> | null = null

  constructor() {
    if (TickEngine.instance) {
      return TickEngine.instance
    }
    TickEngine.instance = this
  }

  addTickCallback(tickListener: TickListener): () => void {
    this.callbacks.add(tickListener)
    this.start()
    return () => {
      this.callbacks.delete(tickListener)
      if (this.callbacks.size === 0) {
        this.stop()
      }
    }
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTimestamp = performance.now()
    this.scheduleNext()
  }

  stop() {
    this.isRunning = false
    const g =
      typeof globalThis !== 'undefined'
        ? (globalThis as unknown as {
            cancelAnimationFrame?: typeof cancelAnimationFrame
            requestAnimationFrame?: typeof requestAnimationFrame
          })
        : undefined

    if (this.#timerId !== null) {
      if (g && typeof g.cancelAnimationFrame === 'function' && typeof this.#timerId === 'number') {
        g.cancelAnimationFrame(this.#timerId)
      } else {
        clearTimeout(this.#timerId)
      }
      this.#timerId = null
    }
  }

  private scheduleNext() {
    if (!this.isRunning || this.callbacks.size === 0) {
      this.isRunning = false
      return
    }

    const isVitest =
      typeof globalThis !== 'undefined' &&
      Boolean(
        (globalThis as unknown as { process?: { env?: { VITEST?: string } } }).process?.env?.VITEST,
      )

    const g =
      typeof globalThis !== 'undefined'
        ? (globalThis as unknown as {
            requestAnimationFrame?: typeof requestAnimationFrame
          })
        : undefined

    const isBrowserRaf = Boolean(g && typeof g.requestAnimationFrame === 'function' && !isVitest)

    if (isBrowserRaf && g?.requestAnimationFrame) {
      this.#timerId = g.requestAnimationFrame(this.tick) as unknown as ReturnType<
        typeof setTimeout
      >
    } else {
      this.#timerId = setTimeout(() => {
        this.tick(performance.now())
      }, 16)
    }
  }

  private tick = (currentTimestamp: number) => {
    if (this.callbacks.size === 0) {
      this.isRunning = false
      return
    }

    const actualDeltaTime = Math.max(0, currentTimestamp - this.lastTimestamp)
    this.lastTimestamp = currentTimestamp

    const scaledDeltaTime = actualDeltaTime * this.timeScale
    const subSteps = this.timeScale > 0 ? Math.max(1, Math.round(1 / this.timeScale)) : 1
    const stepDelta = scaledDeltaTime / subSteps

    for (let step = 0; step < subSteps; step++) {
      this.simulationTime += stepDelta

      for (const listener of Array.from(this.callbacks)) {
        if (listener.duration !== undefined) {
          if (listener.startTime === undefined) {
            listener.startTime = this.simulationTime
          }
          const elapsedTime = this.simulationTime - listener.startTime
          if (elapsedTime >= listener.duration) {
            listener.callback(stepDelta)
            this.callbacks.delete(listener)
            continue
          }
        }
        listener.callback(stepDelta)
      }
    }

    if (this.callbacks.size > 0) {
      this.scheduleNext()
    } else {
      this.isRunning = false
    }
  }
}
