// oxlint-disable typescript/no-explicit-any
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@collidor/ui'
import '../axonGraph.component'
import '../axonStudio.component'
import '../nodes'
import { TAG_NAMES } from '../constants'
import { registerCoreNodes } from '../../nodes/nodeLibrary'
import { registerWebComponentNodes } from '../nodes/registerWebComponentNodes'
import { AxonStudio } from '../axonStudio.component'
import { AxonAudioClockNode } from '../nodes/audio/audioClockNode.component'
import { AxonSequenceNode } from '../nodes/audio/sequenceNode.component'
import { AxonParallelNode } from '../nodes/audio/parallelNode.component'
import { AxonStepSequencerNode } from '../nodes/audio/stepSequencerNode.component'
import { AxonSynthNode } from '../nodes/audio/synthNode.component'
import { AxonDrumSamplerNode } from '../nodes/audio/drumSamplerNode.component'
import { AxonMasterOutputNode } from '../nodes/audio/masterOutputNode.component'

describe('Interactive Audio Web Components & Studio Transport (Ticket 014)', () => {
  beforeEach(() => {
    registerCoreNodes()
    registerWebComponentNodes()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('AxonAudioClockNode renders BPM controls, tap tempo, and cycle counter', () => {
    const clockEl = document.createElement(TAG_NAMES.AXON_AUDIO_CLOCK_NODE) as AxonAudioClockNode
    document.body.appendChild(clockEl)

    expect(clockEl.engine).not.toBeNull()
    const bpmInput = clockEl.querySelector<HTMLInputElement>('.audio-clock-bpm-input')
    expect(bpmInput).not.toBeNull()
    expect(bpmInput?.value).toBe('120')

    // Change BPM
    if (bpmInput) {
      bpmInput.value = '140'
      bpmInput.dispatchEvent(new Event('input'))
      expect(clockEl.engine?.getInput('bpm')).toBe(140)
    }

    // Toggle Play / Pause
    const runBtn = clockEl.querySelector<HTMLButtonElement>('.clock-run-btn')
    expect(runBtn).not.toBeNull()
    runBtn?.click()
    expect(clockEl.engine?.getInput('run')).toBe(false)
  })

  it('AxonSequenceNode renders sequence notes input and updates on text change', () => {
    const seqEl = document.createElement(TAG_NAMES.AXON_SEQUENCE_NODE) as AxonSequenceNode
    document.body.appendChild(seqEl)

    expect(seqEl.engine).not.toBeNull()
    const input = seqEl.querySelector<HTMLInputElement>('.sequence-notes-input')
    expect(input).not.toBeNull()
    expect(input?.value).toBe('C4 E4 G4 B4')

    // Edit sequence notes
    if (input) {
      input.value = 'G3 Eb3 Bb3 G3'
      input.dispatchEvent(new Event('input'))
      expect(seqEl.engine?.getNotes()).toEqual(['G3', 'Eb3', 'Bb3', 'G3'])
    }

    // Query an arc to simulate clock scheduling
    seqEl.engine?.setInput('arc', {
      start: 0,
      end: 0.5,
      cycle: 0,
      phase: 0,
      time: 0,
      duration: 0.5,
    })

    const events = seqEl.engine?.getOutput('events') as any[]
    expect(Array.isArray(events)).toBe(true)
    expect(events.length).toBeGreaterThan(0)
  })

  it('AxonStepSequencerNode renders 16 interactive step buttons and toggles steps on click', () => {
    const seqEl = document.createElement(TAG_NAMES.AXON_STEP_SEQUENCER_NODE) as AxonStepSequencerNode
    document.body.appendChild(seqEl)

    expect(seqEl.engine).not.toBeNull()
    const stepButtons = seqEl.querySelectorAll<HTMLButtonElement>('.step-led-btn')
    expect(stepButtons.length).toBe(16)

    // Check step 1 default active
    expect(stepButtons[0].classList.contains('is-active')).toBe(true)

    // Click step 2 to activate it
    const step2 = stepButtons[1]
    expect(step2.classList.contains('is-active')).toBe(false)
    step2.click()
    expect(step2.classList.contains('is-active')).toBe(true)
    expect(seqEl.engine?.getSteps()[1].active).toBe(true)

    // Advance clock to move playhead sweep
    seqEl.engine?.advanceStep()
    seqEl.render()
    expect(stepButtons[1].classList.contains('is-current-step')).toBe(true)
  })

  it('AxonSynthNode renders interactive ADSR envelope SVG and filter sliders', () => {
    const synthEl = document.createElement(TAG_NAMES.AXON_SYNTH_NODE) as AxonSynthNode
    document.body.appendChild(synthEl)

    expect(synthEl.engine).not.toBeNull()
    const svgLine = synthEl.querySelector<SVGPathElement>('.adsr-line-path')
    expect(svgLine).not.toBeNull()
    const initialD = svgLine?.getAttribute('d')
    expect(initialD).toContain('M')

    // Adjust attack slider
    const attackSlider = synthEl.querySelector<HTMLInputElement>('.slider-attack')
    expect(attackSlider).not.toBeNull()
    if (attackSlider) {
      attackSlider.value = '0.8'
      attackSlider.dispatchEvent(new Event('input'))
      expect(synthEl.engine?.getInput('attack')).toBe(0.8)
      expect(svgLine?.getAttribute('d')).not.toBe(initialD)
    }

    // Adjust cutoff slider
    const cutoffSlider = synthEl.querySelector<HTMLInputElement>('.slider-cutoff')
    if (cutoffSlider) {
      cutoffSlider.value = '4000'
      cutoffSlider.dispatchEvent(new Event('input'))
      expect(synthEl.engine?.getInput('cutoff')).toBe(4000)
    }
  })

  it('AxonDrumSamplerNode renders 5 trigger pads and triggers percussion on click', () => {
    const drumEl = document.createElement(TAG_NAMES.AXON_DRUM_SAMPLER_NODE) as AxonDrumSamplerNode
    document.body.appendChild(drumEl)

    expect(drumEl.engine).not.toBeNull()
    const pads = drumEl.querySelectorAll<HTMLButtonElement>('.drum-pad-btn')
    expect(pads.length).toBe(5)

    const kickPad = drumEl.querySelector<HTMLButtonElement>('.drum-pad-btn[data-sound="bd"]')
    expect(kickPad).not.toBeNull()

    // Click pad
    kickPad?.click()
    expect(drumEl.engine?.getOutput('lastTrigger')).toBe('bd')
    expect(kickPad?.classList.contains('is-active-trigger')).toBe(true)

    // Adjust volume
    const volSlider = drumEl.querySelector<HTMLInputElement>('.drum-volume-slider')
    if (volSlider) {
      volSlider.value = '0.5'
      volSlider.dispatchEvent(new Event('input'))
      expect(drumEl.engine?.getInput('volume')).toBe(0.5)
    }
  })

  it('AxonMasterOutputNode renders oscilloscope canvas, VU meter, and mute controls', () => {
    const masterEl = document.createElement(TAG_NAMES.AXON_MASTER_OUTPUT_NODE) as AxonMasterOutputNode
    document.body.appendChild(masterEl)

    expect(masterEl.engine).not.toBeNull()
    expect(masterEl.querySelector('.master-oscilloscope-canvas')).not.toBeNull()
    expect(masterEl.querySelector('.master-vu-bar')).not.toBeNull()

    // Mute toggle
    const muteBtn = masterEl.querySelector<HTMLButtonElement>('.master-mute-btn')
    expect(muteBtn).not.toBeNull()
    muteBtn?.click()
    expect(masterEl.engine?.getInput('mute')).toBe(true)
    muteBtn?.click()
    expect(masterEl.engine?.getInput('mute')).toBe(false)
  })

  it('AxonStudio integrates the Audio Transport bar and loads the Strudel preset demo', async () => {
    const studio = document.createElement(TAG_NAMES.AXON_STUDIO) as AxonStudio
    document.body.appendChild(studio)

    // Check Audio Transport Toolbar exists
    expect(studio.querySelector('#studio-audio-transport')).not.toBeNull()
    expect(studio.querySelector('#studio-btn-audio-play')).not.toBeNull()
    expect(studio.querySelector('#studio-btn-audio-stop')).not.toBeNull()
    expect(studio.querySelector('#studio-audio-bpm')).not.toBeNull()
    expect(studio.querySelector('#studio-audio-cycle')).not.toBeNull()
    expect(studio.querySelector('#studio-btn-audio-unlock')).not.toBeNull()

    // Test Audio BPM & Transport controls
    studio.setAudioBpm(135)
    expect(studio.audioBpm).toBe(135)

    studio.toggleAudioPlay(false)
    expect(studio.isAudioPlaying).toBe(false)

    studio.toggleAudioPlay(true)
    expect(studio.isAudioPlaying).toBe(true)

    // Load Rhythm Stack Demo Preset
    studio.loadPreset('rhythm-stack')
    expect(studio.graph).not.toBeNull()
    const serialized = studio.graph!.serialize()

    // Verify Rhythm Stack nodes are loaded
    expect(serialized.nodes.some((n) => n.id === 'audio-clock-1')).toBe(true)
    expect(serialized.nodes.some((n) => n.id === 'drum-seq-1')).toBe(true)
    expect(serialized.nodes.some((n) => n.id === 'drum-sampler-1')).toBe(true)
    expect(serialized.nodes.some((n) => n.id === 'synth-bass-1')).toBe(true)
    expect(serialized.nodes.some((n) => n.id === 'master-out-1')).toBe(true)

    // Verify audio routing edges through audio mixer
    expect(serialized.edges.length).toBeGreaterThanOrEqual(6)
    expect(
      serialized.edges.some(
        (e) => e.from === 'drum-sampler-1:audioOut' && e.to === 'audio-mixer-1:in1',
      ),
    ).toBe(true)
    expect(
      serialized.edges.some(
        (e) => e.from === 'audio-mixer-1:audioOut' && e.to === 'master-out-1:audioIn',
      ),
    ).toBe(true)
    // Load Imperial March Demo Preset (loads in paused state, waiting for user action)
    studio.loadPreset('imperial-march')
    expect(studio.audioBpm).toBe(104)
    expect(studio.isAudioPlaying).toBe(false)
    studio.toggleAudioPlay(true)
    expect(studio.isAudioPlaying).toBe(true)
    const imperialSerialized = studio.graph!.serialize()
    expect(imperialSerialized.nodes.some((n) => n.id === 'lead-seq-1')).toBe(true)
    expect(imperialSerialized.nodes.some((n) => n.id === 'bass-seq-1')).toBe(true)
    expect(imperialSerialized.nodes.some((n) => n.id === 'lead-synth-1')).toBe(true)
    expect(imperialSerialized.nodes.some((n) => n.id === 'bass-synth-1')).toBe(true)
    expect(imperialSerialized.nodes.some((n) => n.id === 'delay-fx-1')).toBe(true)
    expect(imperialSerialized.nodes.some((n) => n.id === 'audio-mixer-1')).toBe(true)
    expect(imperialSerialized.edges.length).toBe(11)

    // Verify visual node Web Components and ports exist in DOM
    const leadSynthEl = studio.graph!.querySelector('#lead-synth-1')
    expect(leadSynthEl).not.toBeNull()
    expect(leadSynthEl?.querySelector('axon-port-in[id="lead-synth-1:events"]')).not.toBeNull()

    const delayEl = studio.graph!.querySelector('#delay-fx-1')
    expect(delayEl).not.toBeNull()
    expect(delayEl?.querySelector('axon-port-in[id="delay-fx-1:audioIn"]')).not.toBeNull()

    const mixerEl = studio.graph!.querySelector('#audio-mixer-1')
    expect(mixerEl).not.toBeNull()
    expect(mixerEl?.querySelector('axon-port-in[id="audio-mixer-1:in1"]')).not.toBeNull()

    const masterEl = studio.graph!.querySelector('#master-out-1')
    expect(masterEl).not.toBeNull()
    expect(masterEl?.querySelector('axon-port-in[id="master-out-1:audioIn"]')).not.toBeNull()

    // Verify all 11 edges exist in DOM
    const edgeEls = studio.graph!.querySelectorAll('axon-edge')
    expect(edgeEls.length).toBe(11)

    // Wait for microtask queue to flush
    await new Promise((r) => setTimeout(r, 60))

    // Check engines and audio routing
    const mixerEngine = (mixerEl as any)?.engine
    const masterEngine = (masterEl as any)?.engine
    const delayEngine = (delayEl as any)?.engine
    const leadSynthEngine = (leadSynthEl as any)?.engine

    expect(mixerEngine).toBeDefined()
    expect(masterEngine).toBeDefined()
    expect(mixerEngine?.getInput('in1')).toBe('audio-delay-delay-fx-1')
    expect(mixerEngine?.getInput('in2')).toBe('audio-bus-bass-synth-1')
    expect(mixerEngine?.getInput('in3')).toBe('audio-bus-drums-drum-sampler-1')
    expect(mixerEngine?.getOutputs()?.activeChannels).toBe(3)
    expect(masterEngine?.getInput('audioIn')).toBe('audio-mixer-audio-mixer-1')
    expect(delayEngine?.getInput('audioIn')).toBe('audio-bus-lead-synth-1')
    expect(delayEngine?.getOutputs()?.audioOut).toBe('audio-delay-delay-fx-1')

    const clockEl = studio.graph!.querySelector('#audio-clock-1') as any
    expect(clockEl?.engine).toBeDefined()
    clockEl.engine.advance(0.25)
    expect(['G3', 'Eb3']).toContain(leadSynthEngine?.getOutputs()?.lastEvent?.note)

    // Disconnect delay -> mixer:in1
    const delayToMixerEdge = Array.from(studio.graph!.querySelectorAll('axon-edge')).find(
      (e) => e.getAttribute('from') === 'delay-fx-1:audioOut' && e.getAttribute('to') === 'audio-mixer-1:in1',
    )
    expect(delayToMixerEdge).toBeDefined()
    delayToMixerEdge?.remove()
    await new Promise((r) => setTimeout(r, 60))

    expect(mixerEngine?.getInput('in1')).toBeUndefined()
    expect(mixerEngine?.getOutputs()?.activeChannels).toBe(2)

    // Reconnect delay -> mixer:in1
    const newEdge = document.createElement('axon-edge')
    newEdge.setAttribute('from', 'delay-fx-1:audioOut')
    newEdge.setAttribute('to', 'audio-mixer-1:in1')
    studio.graph!.appendChild(newEdge)
    await new Promise((r) => setTimeout(r, 60))

    expect(mixerEngine?.getInput('in1')).toBe('audio-delay-delay-fx-1')
    expect(mixerEngine?.getOutputs()?.activeChannels).toBe(3)
  })
})
