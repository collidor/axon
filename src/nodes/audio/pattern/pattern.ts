// oxlint-disable typescript/no-explicit-any

export interface Hap<T = any> {
  whole: [number, number]
  part: [number, number]
  value: T
}

export type QueryArcFn<T> = (begin: number, end: number) => Hap<T>[]

export class Pattern<T = any> {
  constructor(public readonly queryArc: QueryArcFn<T>) {}

  public fast(factor: number): Pattern<T> {
    if (factor <= 0) return this
    return new Pattern((begin, end) => {
      const innerHaps = this.queryArc(begin * factor, end * factor)
      return innerHaps.map((h) => ({
        whole: [h.whole[0] / factor, h.whole[1] / factor],
        part: [h.part[0] / factor, h.part[1] / factor],
        value: h.value,
      }))
    })
  }

  public slow(factor: number): Pattern<T> {
    if (factor <= 0) return this
    return this.fast(1 / factor)
  }

  public late(offset: number): Pattern<T> {
    return new Pattern((begin, end) => {
      const innerHaps = this.queryArc(begin - offset, end - offset)
      return innerHaps.map((h) => ({
        whole: [h.whole[0] + offset, h.whole[1] + offset],
        part: [h.part[0] + offset, h.part[1] + offset],
        value: h.value,
      }))
    })
  }

  public rev(): Pattern<T> {
    return new Pattern((begin, end) => {
      const minCycle = Math.floor(begin)
      const maxCycle = Math.ceil(end)
      const results: Hap<T>[] = []

      for (let c = minCycle; c < maxCycle; c++) {
        // Invert arc relative to cycle c: [c + (1 - (end - c)), c + (1 - (begin - c))]
        const qBegin = Math.max(begin, c)
        const qEnd = Math.min(end, c + 1)
        if (qBegin >= qEnd) continue

        const invBegin = c + (1 - (qEnd - c))
        const invEnd = c + (1 - (qBegin - c))

        const haps = this.queryArc(invBegin, invEnd)
        for (const h of haps) {
          const w0 = c + (1 - (h.whole[1] - c))
          const w1 = c + (1 - (h.whole[0] - c))
          const p0 = c + (1 - (h.part[1] - c))
          const p1 = c + (1 - (h.part[0] - c))
          results.push({
            whole: [w0, w1],
            part: [p0, p1],
            value: h.value,
          })
        }
      }
      return results.sort((a, b) => a.whole[0] - b.whole[0])
    })
  }

  public degrade(probability: number = 0.5): Pattern<T> {
    return new Pattern((begin, end) => {
      const haps = this.queryArc(begin, end)
      return haps.filter((h) => {
        // Deterministic pseudo-hash based on event start time to prevent re-rolling within the same cycle
        const seed = Math.sin(h.whole[0] * 12.9898) * 43758.5453
        const rand = seed - Math.floor(seed)
        return rand >= probability
      })
    })
  }

  public map<U>(fn: (val: T, hap: Hap<T>) => U): Pattern<U> {
    return new Pattern((begin, end) => {
      const haps = this.queryArc(begin, end)
      return haps.map((h) => ({
        whole: h.whole,
        part: h.part,
        value: fn(h.value, h),
      }))
    })
  }
}

/**
 * Creates a pattern that repeats a single value every cycle [0, 1].
 */
export function pure<T>(value: T): Pattern<T> {
  return new Pattern((begin, end) => {
    const minCycle = Math.floor(begin)
    const maxCycle = Math.ceil(end)
    const haps: Hap<T>[] = []

    for (let c = minCycle; c < maxCycle; c++) {
      const whole: [number, number] = [c, c + 1]
      const partStart = Math.max(begin, c)
      const partEnd = Math.min(end, c + 1)
      if (partStart < partEnd) {
        haps.push({
          whole,
          part: [partStart, partEnd],
          value,
        })
      }
    }
    return haps
  })
}

/**
 * Empty pattern producing no events.
 */
export function silence<T = any>(): Pattern<T> {
  return new Pattern(() => [])
}

/**
 * Sequentially subdivides a cycle [0, 1] into N equal slices, one for each pattern.
 */
export function sequence<T>(patterns: Pattern<T>[]): Pattern<T> {
  if (patterns.length === 0) return silence()
  if (patterns.length === 1) return patterns[0]

  const n = patterns.length
  return new Pattern((begin, end) => {
    const minCycle = Math.floor(begin)
    const maxCycle = Math.ceil(end)
    const results: Hap<T>[] = []

    for (let c = minCycle; c < maxCycle; c++) {
      for (let i = 0; i < n; i++) {
        const slotStart = c + i / n
        const slotEnd = c + (i + 1) / n

        const overlapStart = Math.max(begin, slotStart)
        const overlapEnd = Math.min(end, slotEnd)
        if (overlapStart >= overlapEnd) continue

        // Convert overlap into child pattern's [0, 1] cycle coordinates
        const localBegin = (overlapStart - slotStart) * n
        const localEnd = (overlapEnd - slotStart) * n

        const childHaps = patterns[i].queryArc(localBegin, localEnd)
        for (const h of childHaps) {
          const globalWholeStart = slotStart + h.whole[0] / n
          const globalWholeEnd = slotStart + h.whole[1] / n
          const globalPartStart = Math.max(begin, slotStart + h.part[0] / n)
          const globalPartEnd = Math.min(end, slotStart + h.part[1] / n)

          if (globalPartStart < globalPartEnd) {
            results.push({
              whole: [globalWholeStart, globalWholeEnd],
              part: [globalPartStart, globalPartEnd],
              value: h.value,
            })
          }
        }
      }
    }
    return results
  })
}

/**
 * Plays multiple patterns in parallel (polyphony / stack).
 */
export function stack<T>(patterns: Pattern<T>[]): Pattern<T> {
  if (patterns.length === 0) return silence()
  if (patterns.length === 1) return patterns[0]

  return new Pattern((begin, end) => {
    const results: Hap<T>[] = []
    for (const pat of patterns) {
      results.push(...pat.queryArc(begin, end))
    }
    return results
  })
}

/**
 * Steps through one pattern per cycle (<pat1 pat2 pat3>).
 */
export function alternate<T>(patterns: Pattern<T>[]): Pattern<T> {
  if (patterns.length === 0) return silence()
  if (patterns.length === 1) return patterns[0]

  const n = patterns.length
  return new Pattern((begin, end) => {
    const minCycle = Math.floor(begin)
    const maxCycle = Math.ceil(end)
    const results: Hap<T>[] = []

    for (let c = minCycle; c < maxCycle; c++) {
      const idx = ((c % n) + n) % n
      const activePat = patterns[idx]

      const cBegin = Math.max(begin, c)
      const cEnd = Math.min(end, c + 1)
      if (cBegin >= cEnd) continue

      // Query active pattern for cycle 0..1
      const localBegin = cBegin - c
      const localEnd = cEnd - c
      const haps = activePat.queryArc(localBegin, localEnd)
      for (const h of haps) {
        results.push({
          whole: [c + h.whole[0], c + h.whole[1]],
          part: [c + h.part[0], c + h.part[1]],
          value: h.value,
        })
      }
    }
    return results
  })
}

/**
 * Distributes `hits` pulses evenly across `steps` subdivisions using Bjorklund's algorithm.
 */
export function euclidean<T>(hits: number, steps: number, pattern: Pattern<T>): Pattern<T> {
  if (steps <= 0) return silence()
  if (hits <= 0) return silence()
  if (hits >= steps) return sequence(new Array(steps).fill(pattern))

  const mask = bjorklund(hits, steps)
  const elements = mask.map((isHit) => (isHit ? pattern : silence<T>()))
  return sequence(elements)
}

/**
 * Standard Bjorklund algorithm for Euclidean rhythms.
 */
export function bjorklund(hits: number, steps: number): boolean[] {
  if (steps <= 0) return []
  if (hits >= steps) return new Array(steps).fill(true)
  if (hits <= 0) return new Array(steps).fill(false)

  let pattern: number[][] = []
  for (let i = 0; i < steps; i++) {
    pattern.push(i < hits ? [1] : [0])
  }

  while (true) {
    const zeroes = pattern.filter((p) => p[0] === 0)
    const ones = pattern.filter((p) => p[0] === 1)
    if (zeroes.length === 0 || ones.length === 0) break

    const minLen = Math.min(zeroes.length, ones.length)
    const newPattern: number[][] = []
    for (let i = 0; i < minLen; i++) {
      newPattern.push([...ones[i], ...zeroes[i]])
    }
    const remainder = ones.length > zeroes.length ? ones.slice(minLen) : zeroes.slice(minLen)
    pattern = [...newPattern, ...remainder]
    if (remainder.length <= 1) break
  }

  return pattern.flat().map((v) => v === 1)
}
