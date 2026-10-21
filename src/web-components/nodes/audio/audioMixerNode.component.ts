import { AxonBaseNodeElement } from '../baseNodeElement'
import { TAG_NAMES } from '../../constants'
import {
  createAudioMixerNode,
  type AudioMixerNodeEngine,
} from '../../../nodes/audio/fx/audioMixer.engine'
import { AUDIO_NODE_TYPES } from '../../../nodes/audio/audioNodes.constants'

/**
 * <axon-audio-mixer-node>
 * 4-Channel Audio Mixer / Combiner visual node.
 * Features:
 * - 4 dedicated audio channel strips with integrated input sockets (In 1 - In 4)
 * - Individual channel gain faders with color-coded accents
 * - Master summing level fader
 * - Summed Audio Out socket
 * - Double-click fader to reset to 100%
 */
export class AxonAudioMixerNode extends AxonBaseNodeElement<AudioMixerNodeEngine> {
  // oxlint-disable-next-line typescript/no-explicit-any
  createEngine(options?: { id?: string; initialData?: any }): AudioMixerNodeEngine {
    return createAudioMixerNode(options)
  }

  connectedCallback() {
    this.axonNodeType = AUDIO_NODE_TYPES.AUDIO_MIXER
    this.setAttribute('data-node-type', AUDIO_NODE_TYPES.AUDIO_MIXER)
    super.connectedCallback()
  }

  render() {
    if (!this.engine) return

    const data = this.engine.data
    const g1 = Number(this.engine.getInput('gain1') ?? data.gain1 ?? 1.0)
    const g2 = Number(this.engine.getInput('gain2') ?? data.gain2 ?? 1.0)
    const g3 = Number(this.engine.getInput('gain3') ?? data.gain3 ?? 1.0)
    const g4 = Number(this.engine.getInput('gain4') ?? data.gain4 ?? 1.0)
    const master = Number(this.engine.getInput('master') ?? data.master ?? 1.0)

    if (!this.querySelector('.node-header')) {
      this.innerHTML = `
        <div class="node-header" data-drag-handle>
          <span class="node-title">🎛️ Audio Mixer</span>
          <span class="node-badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b;">Mixer</span>
        </div>

        <div class="audio-node-faceplate" style="padding: 6px 10px; gap: 3px;">
          <!-- Channel 1 -->
          <div class="data-node-row port-row-input mixer-channel-row" style="display: flex; align-items: center; gap: 6px; min-height: 24px;">
            <axon-port-in
              id="${this.engine.getPortId('in1')}"
              data-type="string"
              class="port input"
              style="--port-color: #3b82f6; width: auto; flex-shrink: 0; min-width: 44px; padding-right: 2px;"
            >
              <span class="port-label" style="font-weight: 700; color: #60a5fa; font-size: 10px;">In 1</span>
            </axon-port-in>
            <div style="flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0;">
              <input type="range" class="mixer-slider mixer-slider-ch1" min="0" max="1.5" step="0.02" value="${g1}" style="--thumb-color: #3b82f6; flex: 1; accent-color: #3b82f6;" title="Double-click to reset (100%)" />
              <span class="mixer-val mixer-ch1-val">${Math.round(g1 * 100)}%</span>
            </div>
          </div>

          <!-- Channel 2 -->
          <div class="data-node-row port-row-input mixer-channel-row" style="display: flex; align-items: center; gap: 6px; min-height: 24px;">
            <axon-port-in
              id="${this.engine.getPortId('in2')}"
              data-type="string"
              class="port input"
              style="--port-color: #8b5cf6; width: auto; flex-shrink: 0; min-width: 44px; padding-right: 2px;"
            >
              <span class="port-label" style="font-weight: 700; color: #a78bfa; font-size: 10px;">In 2</span>
            </axon-port-in>
            <div style="flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0;">
              <input type="range" class="mixer-slider mixer-slider-ch2" min="0" max="1.5" step="0.02" value="${g2}" style="--thumb-color: #8b5cf6; flex: 1; accent-color: #8b5cf6;" title="Double-click to reset (100%)" />
              <span class="mixer-val mixer-ch2-val">${Math.round(g2 * 100)}%</span>
            </div>
          </div>

          <!-- Channel 3 -->
          <div class="data-node-row port-row-input mixer-channel-row" style="display: flex; align-items: center; gap: 6px; min-height: 24px;">
            <axon-port-in
              id="${this.engine.getPortId('in3')}"
              data-type="string"
              class="port input"
              style="--port-color: #ec4899; width: auto; flex-shrink: 0; min-width: 44px; padding-right: 2px;"
            >
              <span class="port-label" style="font-weight: 700; color: #f472b6; font-size: 10px;">In 3</span>
            </axon-port-in>
            <div style="flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0;">
              <input type="range" class="mixer-slider mixer-slider-ch3" min="0" max="1.5" step="0.02" value="${g3}" style="--thumb-color: #ec4899; flex: 1; accent-color: #ec4899;" title="Double-click to reset (100%)" />
              <span class="mixer-val mixer-ch3-val">${Math.round(g3 * 100)}%</span>
            </div>
          </div>

          <!-- Channel 4 -->
          <div class="data-node-row port-row-input mixer-channel-row" style="display: flex; align-items: center; gap: 6px; min-height: 24px;">
            <axon-port-in
              id="${this.engine.getPortId('in4')}"
              data-type="string"
              class="port input"
              style="--port-color: #10b981; width: auto; flex-shrink: 0; min-width: 44px; padding-right: 2px;"
            >
              <span class="port-label" style="font-weight: 700; color: #34d399; font-size: 10px;">In 4</span>
            </axon-port-in>
            <div style="flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0;">
              <input type="range" class="mixer-slider mixer-slider-ch4" min="0" max="1.5" step="0.02" value="${g4}" style="--thumb-color: #10b981; flex: 1; accent-color: #10b981;" title="Double-click to reset (100%)" />
              <span class="mixer-val mixer-ch4-val">${Math.round(g4 * 100)}%</span>
            </div>
          </div>

          <!-- Master Level Row -->
          <div class="audio-control-row" style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <span class="audio-control-label" style="color: #f59e0b; font-size: 9px; min-width: 42px;">Master</span>
            <input type="range" class="mixer-slider mixer-slider-master" min="0" max="1.5" step="0.02" value="${master}" style="--thumb-color: #f59e0b; flex: 1; accent-color: #f59e0b;" title="Double-click to reset (100%)" />
            <span class="mixer-val mixer-master-val" style="color: #f59e0b; font-weight: 700;">${Math.round(master * 100)}%</span>
          </div>
        </div>

        <!-- Output Row (Bottom) -->
        <div class="data-node-body" style="padding: 3px 0 3px 0;">
          <div class="data-node-row port-row-pair" style="display: flex; align-items: center; justify-content: space-between; padding: 0 10px 0 14px;">
            <span style="font-size: 9px; font-weight: 700; color: #64748b; font-family: var(--ui-font-mono, monospace); letter-spacing: 0.05em;">SUMMED BUS</span>
            <axon-port-out
              id="${this.engine.getPortId('audioOut')}"
              data-type="string"
              class="port output"
              style="--port-color: #f59e0b; width: auto; flex-shrink: 0;"
            >
              <span class="port-label" style="font-weight: 700; color: #f59e0b; font-size: 11px;">Audio Out</span>
            </axon-port-out>
          </div>
        </div>
      `

      const attachSlider = (
        selector: string,
        labelSelector: string,
        paramName: 'master' | 'gain1' | 'gain2' | 'gain3' | 'gain4',
      ) => {
        const slider = this.querySelector<HTMLInputElement>(selector)
        if (!slider) return
        slider.addEventListener('pointerdown', (e) => e.stopPropagation())
        slider.addEventListener('mousedown', (e) => e.stopPropagation())
        slider.addEventListener('dblclick', (e) => {
          e.stopPropagation()
          slider.value = '1.0'
          this.setInput(paramName, 1.0)
          if (this.engine) this.engine.data[paramName] = 1.0
          const lbl = this.querySelector(labelSelector)
          if (lbl) lbl.textContent = '100%'
        })
        slider.addEventListener('input', (e: Event) => {
          const val = Number((e.target as HTMLInputElement).value)
          this.setInput(paramName, val)
          if (this.engine) this.engine.data[paramName] = val
          const lbl = this.querySelector(labelSelector)
          if (lbl) lbl.textContent = `${Math.round(val * 100)}%`
        })
      }

      attachSlider('.mixer-slider-master', '.mixer-master-val', 'master')
      attachSlider('.mixer-slider-ch1', '.mixer-ch1-val', 'gain1')
      attachSlider('.mixer-slider-ch2', '.mixer-ch2-val', 'gain2')
      attachSlider('.mixer-slider-ch3', '.mixer-ch3-val', 'gain3')
      attachSlider('.mixer-slider-ch4', '.mixer-ch4-val', 'gain4')
    } else {
      const updateVal = (sliderSelector: string, labelSelector: string, val: number) => {
        const slider = this.querySelector<HTMLInputElement>(sliderSelector)
        if (slider && document.activeElement !== slider) {
          slider.value = String(val)
        }
        const lbl = this.querySelector(labelSelector)
        if (lbl) lbl.textContent = `${Math.round(val * 100)}%`
      }
      updateVal('.mixer-slider-master', '.mixer-master-val', master)
      updateVal('.mixer-slider-ch1', '.mixer-ch1-val', g1)
      updateVal('.mixer-slider-ch2', '.mixer-ch2-val', g2)
      updateVal('.mixer-slider-ch3', '.mixer-ch3-val', g3)
      updateVal('.mixer-slider-ch4', '.mixer-ch4-val', g4)
    }
  }
}

if (!customElements.get(TAG_NAMES.AXON_AUDIO_MIXER_NODE)) {
  customElements.define(TAG_NAMES.AXON_AUDIO_MIXER_NODE, AxonAudioMixerNode)
}
