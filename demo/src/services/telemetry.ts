import { ref } from 'vue'

export interface TelemetryEntry {
  id: string
  timestamp: number
  category: 'event' | 'command' | 'audio' | 'graph'
  action: string
  source: string
  payload?: any
}

class TelemetryService {
  #logs = ref<TelemetryEntry[]>([])
  #listeners = new Set<(entry: TelemetryEntry) => void>()

  public log(category: TelemetryEntry['category'], action: string, source: string, payload?: any): void {
    const entry: TelemetryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      category,
      action,
      source,
      payload,
    }

    this.#logs.value = [entry, ...this.#logs.value.slice(0, 199)]
    this.#listeners.forEach((fn) => fn(entry))
  }

  public getLogs(): TelemetryEntry[] {
    return this.#logs.value
  }

  public clear(): void {
    this.#logs.value = []
  }

  public subscribe(listener: (entry: TelemetryEntry) => void): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }
}

export const telemetry = new TelemetryService()
