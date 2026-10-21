import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createDrumSamplerNode,
  type DrumSamplerNodeEngine,
} from '../../../nodes/audio/drumSampler.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-drum-sampler-node>
 * 808 Synthesized Drum Machine & Sampler visual node.
 * Features:
 * - 5 clickable trigger pads (BD, SD, HH, CP, CB)
 * - Visual flash feedback on active triggers
 * - Volume control slider
 */
export class AxonDrumSamplerNode extends AxonBaseNodeElement<DrumSamplerNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): DrumSamplerNodeEngine {
    return createDrumSamplerNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.DRUM_SAMPLER
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.DRUM_SAMPLER)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const vol = Number(this.engine.getInput('volume') ?? this.engine.data.volume ?? 0.85)
    const lastTrig = String(this.engine.getOutput('lastTrigger') ?? '-')

    if (!this.querySelector('.node-body')) {
      this.innerHTML = `
        <div class="node-header">
          <h3>🥁 Drum Sampler (808)</h3>
        </div>
        <div class="node-body">
          <div class="audio-node-faceplate">
            <div class="audio-control-row">
              <span class="audio-control-label">Trigger Pads</span>
              <span class="audio-control-val last-trigger-val">${lastTrig}</span>
            </div>

            <!-- 5 Percussion Pads -->
            <div class="drum-pad-grid">
              <button type="button" class="drum-pad-btn" data-sound="bd" title="Bass Drum (Kick)">BD</button>
              <button type="button" class="drum-pad-btn" data-sound="sd" title="Snare Drum">SD</button>
              <button type="button" class="drum-pad-btn" data-sound="hh" title="Closed Hi-Hat">HH</button>
              <button type="button" class="drum-pad-btn" data-sound="cp" title="Handclap">CP</button>
              <button type="button" class="drum-pad-btn" data-sound="cb" title="Cowbell">CB</button>
            </div>

            <div class="audio-control-row" style="margin-top: 4px;">
              <span class="audio-control-label">Volume: <span class="drum-vol-val">${Math.round(vol * 100)}%</span></span>
              <input
                type="range"
                class="drum-volume-slider"
                min="0"
                max="1"
                step="0.05"
                value="${vol}"
                style="flex: 1; accent-color: #ef4444;"
              />
            </div>
          </div>

          <div class="port-grid">
            <!-- Events Input -->
            <axon-port-in
              id="${this.engine.getPortId('events')}"
              data-type="array"
              class="port input"
              style="--port-color: #f59e0b;"
            >
              <span class="port-label">Events</span>
            </axon-port-in>

            <!-- Sound Trigger Name -->
            <axon-port-in
              id="${this.engine.getPortId('sound')}"
              data-type="string"
              class="port input"
              style="--port-color: #ec4899;"
            >
              <span class="port-label">Sound</span>
            </axon-port-in>

            <!-- Audio Out -->
            <axon-port-out
              id="${this.engine.getPortId('audioOut')}"
              data-type="string"
              class="port output"
              style="--port-color: #10b981;"
            >
              <span class="port-label">Audio Out</span>
            </axon-port-out>

            <!-- Last Trigger Out -->
            <axon-port-out
              id="${this.engine.getPortId('lastTrigger')}"
              data-type="string"
              class="port output"
              style="--port-color: #38bdf8;"
            >
              <span class="port-label">Last Trig</span>
            </axon-port-out>
          </div>
        </div>
      `

      // Pad clicks trigger sound
      const padGrid = this.querySelector('.drum-pad-grid')
      padGrid?.addEventListener('click', (e: Event) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.drum-pad-btn')
        if (!btn || !this.engine) return
        const sound = btn.getAttribute('data-sound')
        if (sound) {
          this.engine.triggerSound(sound)
          this.flashPad(sound)
        }
      })

      const volSlider = this.querySelector<HTMLInputElement>('.drum-volume-slider')
      volSlider?.addEventListener('input', (e: Event) => {
        const val = Number((e.target as HTMLInputElement).value)
        this.setInput('volume', val)
        if (this.engine) this.engine.data.volume = val
        const label = this.querySelector('.drum-vol-val')
        if (label) label.textContent = `${Math.round(val * 100)}%`
      })
    }

    const lastValEl = this.querySelector('.last-trigger-val')
    if (lastValEl) {
      lastValEl.textContent = lastTrig
    }

    if (lastTrig && lastTrig !== '-') {
      this.flashPad(lastTrig)
    }
  }

  private flashPad(soundId: string) {
    const s = soundId.toLowerCase().trim()
    const pad = this.querySelector<HTMLButtonElement>(`.drum-pad-btn[data-sound="${s}"]`)
    if (pad) {
      pad.classList.add('is-active-trigger')
      setTimeout(() => pad.classList.remove('is-active-trigger'), 120)
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_DRUM_SAMPLER_NODE)) {
  customElements.define(TAG_NAMES.AXON_DRUM_SAMPLER_NODE, AxonDrumSamplerNode)
}
