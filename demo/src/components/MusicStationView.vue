<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  AudioDriverManager,
  createAudioClockNode,
  createSequenceNode,
  createParallelNode,
  createPolySynthNode,
  createDrumSamplerNode,
  createDelayNode,
  createMasterOutputNode,
  type AudioClockNodeEngine,
  type SequenceNodeEngine,
  type ParallelNodeEngine,
  type PolySynthNodeEngine,
  type DrumSamplerNodeEngine,
  type DelayNodeEngine,
  type MasterOutputNodeEngine,
} from '@collidor/axon'
import { telemetry } from '../services/telemetry'

const bpm = ref(104)
const isPlaying = ref(false)
const currentThemeName = ref('Imperial March')

// Lead melody notes (Sequence)
const leadNotes = ref('G3 G3 G3 Eb3 Bb3 G3 Eb3 Bb3 G3')
// Bass line notes (Sequence)
const bassNotes = ref('G2 G2 G2 G2 Eb2 Bb2 G2 Eb2')
// March percussion cadence
const drumNotes = ref('bd bd bd sd sd sd bd sd')

const synthWave = ref<'sawtooth' | 'square' | 'triangle' | 'sine'>('sawtooth')
const delayTime = ref(0.28)
const delayFeedback = ref(0.25)
const delayMix = ref(0.2)

const currentStep = ref(0)
const cycleDisplay = ref('000.0.0')

// Axon Audio Node Pipeline engines
let clockNode: AudioClockNodeEngine | null = null
let leadSeqNode: SequenceNodeEngine | null = null
let bassSeqNode: SequenceNodeEngine | null = null
let drumSeqNode: SequenceNodeEngine | null = null
let parallelNode: ParallelNodeEngine | null = null
let leadSynthNode: PolySynthNodeEngine | null = null
let bassSynthNode: PolySynthNodeEngine | null = null
let drumSamplerNode: DrumSamplerNodeEngine | null = null
let delayNode: DelayNodeEngine | null = null
let masterOutputNode: MasterOutputNodeEngine | null = null

function initAudioGraph() {
  if (clockNode) return

  // 1. Audio Clock
  clockNode = createAudioClockNode({
    initialData: { bpm: bpm.value, beatsPerCycle: 4, run: false },
  })

  // 2. Pure Sequence nodes
  leadSeqNode = createSequenceNode({
    initialData: { notes: leadNotes.value.split(/\s+/), velocity: 0.9, durationRatio: 0.85 },
  })
  bassSeqNode = createSequenceNode({
    initialData: { notes: bassNotes.value.split(/\s+/), velocity: 0.85, durationRatio: 0.8 },
  })
  drumSeqNode = createSequenceNode({
    initialData: { notes: drumNotes.value.split(/\s+/), velocity: 0.8, durationRatio: 0.75 },
  })

  // 3. Parallel stack node
  parallelNode = createParallelNode()

  // 4. Audio Synthesis & Percussion nodes
  leadSynthNode = createPolySynthNode({
    initialData: {
      waveform: synthWave.value,
      cutoff: 3200,
      resonance: 3.0,
      attack: 0.02,
      decay: 0.2,
      sustain: 0.5,
      release: 0.2,
    },
  })
  bassSynthNode = createPolySynthNode({
    initialData: {
      waveform: 'square',
      cutoff: 1400,
      resonance: 4.0,
      attack: 0.01,
      decay: 0.15,
      sustain: 0.4,
      release: 0.18,
    },
  })
  drumSamplerNode = createDrumSamplerNode({
    initialData: { volume: 0.85 },
  })

  // 5. FX and Master Output
  delayNode = createDelayNode({
    initialData: { time: delayTime.value, feedback: delayFeedback.value, mix: delayMix.value },
  })
  masterOutputNode = createMasterOutputNode({
    initialData: { volume: 0.85, mute: false },
  })

  // Connect Audio Node Graph to Master Output
  // leadSynth -> delay -> masterOutput
  // bassSynth -> masterOutput
  // drumSampler -> masterOutput
  const leadOut = leadSynthNode.getOutputNode()
  const delayIn = delayNode.getInputNode()
  const delayOut = delayNode.getOutputNode()
  const bassOut = bassSynthNode.getOutputNode()
  const drumOut = drumSamplerNode.getOutputNode()
  const masterIn = masterOutputNode.getInputNode()

  if (leadOut && delayIn) leadOut.connect(delayIn)
  if (delayOut && masterIn) delayOut.connect(masterIn)
  if (bassOut && masterIn) bassOut.connect(masterIn)
  if (drumOut && masterIn) drumOut.connect(masterIn)

  // Wire node event outputs to synthesize audio in real-time
  leadSeqNode.on('outputChange', (name, val) => {
    if (name === 'events' && Array.isArray(val) && leadSynthNode) {
      leadSynthNode.setInput('events', val)
    }
  })
  bassSeqNode.on('outputChange', (name, val) => {
    if (name === 'events' && Array.isArray(val) && bassSynthNode) {
      bassSynthNode.setInput('events', val)
    }
  })
  drumSeqNode.on('outputChange', (name, val) => {
    if (name === 'events' && Array.isArray(val) && drumSamplerNode) {
      drumSamplerNode.setInput('events', val)
    }
  })

  // Clock arc triggers sequence generators and updates step UI
  clockNode.on('outputChange', (name, val) => {
    if (name === 'arc' && val) {
      leadSeqNode?.setInput('arc', val)
      bassSeqNode?.setInput('arc', val)
      drumSeqNode?.setInput('arc', val)
    } else if (name === 'phase' && typeof val === 'number') {
      currentStep.value = Math.floor(val * 16) % 16
    } else if (name === 'cycle' && typeof val === 'number') {
      const stepInMeasure = currentStep.value % 4
      cycleDisplay.value = `00${val}.${stepInMeasure}.0`
    }
  })
}

function togglePlay() {
  initAudioGraph()
  isPlaying.value = !isPlaying.value

  const driver = AudioDriverManager.get()
  void driver.resume()

  if (isPlaying.value) {
    telemetry.log('audio', 'Transport: START', 'MusicStation', {
      bpm: bpm.value,
      leadNotes: leadNotes.value,
    })
    clockNode?.start()
  } else {
    telemetry.log('audio', 'Transport: STOP', 'MusicStation', {})
    clockNode?.stop()
    currentStep.value = 0
    cycleDisplay.value = '000.0.0'
  }
}

function updateBpm(newBpm: number) {
  bpm.value = newBpm
  if (clockNode) {
    clockNode.setBpm(newBpm)
  }
}

function onLeadNotesChange() {
  if (leadSeqNode) {
    leadSeqNode.setNotes(leadNotes.value.split(/\s+/).filter(Boolean))
  }
}

function onBassNotesChange() {
  if (bassSeqNode) {
    bassSeqNode.setNotes(bassNotes.value.split(/\s+/).filter(Boolean))
  }
}

function onDrumNotesChange() {
  if (drumSeqNode) {
    drumSeqNode.setNotes(drumNotes.value.split(/\s+/).filter(Boolean))
  }
}

function onWaveChange() {
  if (leadSynthNode) {
    leadSynthNode.setData({ waveform: synthWave.value })
  }
}

function onDelayChange() {
  if (delayNode) {
    delayNode.setData({
      time: delayTime.value,
      feedback: delayFeedback.value,
      mix: delayMix.value,
    })
  }
}

function loadImperialMarch() {
  currentThemeName.value = 'Imperial March'
  bpm.value = 104
  leadNotes.value = 'G3 G3 G3 Eb3 Bb3 G3 Eb3 Bb3 G3'
  bassNotes.value = 'G2 G2 G2 G2 Eb2 Bb2 G2 Eb2'
  drumNotes.value = 'bd bd bd sd sd sd bd sd'
  synthWave.value = 'sawtooth'
  onLeadNotesChange()
  onBassNotesChange()
  onDrumNotesChange()
  onWaveChange()
  updateBpm(104)
}

function loadCyberpunkGroove() {
  currentThemeName.value = 'Cyberpunk Groove'
  bpm.value = 126
  leadNotes.value = 'C3 Eb3 G3 Bb3 F3 Ab3 C4 Eb4 G3 Bb3 D4 F4'
  bassNotes.value = 'C2 F2 G2 Ab2'
  drumNotes.value = 'bd rest bd sd cp hh hh'
  synthWave.value = 'square'
  onLeadNotesChange()
  onBassNotesChange()
  onDrumNotesChange()
  onWaveChange()
  updateBpm(126)
}

function loadAmbientSpace() {
  currentThemeName.value = 'Ambient Space'
  bpm.value = 75
  leadNotes.value = 'E3 B3 G4 A3 E4 C5 D3 A3 F4 C3 G3 E4'
  bassNotes.value = 'E2 A2 D2 C2'
  drumNotes.value = 'bd rest sd rest'
  synthWave.value = 'triangle'
  onLeadNotesChange()
  onBassNotesChange()
  onDrumNotesChange()
  onWaveChange()
  updateBpm(75)
}

onMounted(() => {
  initAudioGraph()
})

onUnmounted(() => {
  if (clockNode) {
    clockNode.stop()
  }
  isPlaying.value = false
})
</script>

<template>
  <div class="music-station-container">
    <header class="music-header">
      <div class="header-left">
        <h2>Pure Node Music Station</h2>
        <p>Real-time visual node graph audio engine with Sequence and Parallel nodes, polyphonic synthesis, and 808 percussion.</p>
      </div>

      <div class="transport-bar">
        <button :class="['play-btn', { playing: isPlaying }]" @click="togglePlay">
          {{ isPlaying ? '⏸ Stop Audio' : '▶ Play Theme' }}
        </button>
        <div class="bpm-control">
          <label>BPM:</label>
          <input
            type="number"
            :value="bpm"
            min="50"
            max="220"
            @input="updateBpm(Number(($event.target as HTMLInputElement).value))"
            class="bpm-input"
          />
        </div>
        <div class="cycle-pill">{{ cycleDisplay }}</div>
      </div>
    </header>

    <!-- Theme presets bar -->
    <div class="preset-theme-bar">
      <span class="preset-label">Theme Presets:</span>
      <button
        :class="['preset-theme-btn', { active: currentThemeName === 'Imperial March' }]"
        @click="loadImperialMarch"
      >
        ⚔️ Star Wars: Imperial March
      </button>
      <button
        :class="['preset-theme-btn', { active: currentThemeName === 'Cyberpunk Groove' }]"
        @click="loadCyberpunkGroove"
      >
        🌆 Cyberpunk Groove
      </button>
      <button
        :class="['preset-theme-btn', { active: currentThemeName === 'Ambient Space' }]"
        @click="loadAmbientSpace"
      >
        🌌 Ambient Space
      </button>
    </div>

    <div class="music-grid">
      <!-- 1. Lead Melody Channel -->
      <section class="channel-card">
        <div class="channel-header">
          <h3>🎹 Lead Synth (Main Melody)</h3>
          <span class="channel-badge">Sequence + PolySynth 1</span>
        </div>
        <div class="channel-body">
          <label class="pattern-label">Step Sequence Notes (Space-separated):</label>
          <input
            v-model="leadNotes"
            type="text"
            class="pattern-input"
            @input="onLeadNotesChange"
            placeholder="G3 G3 G3 Eb3 Bb3 G3..."
          />
          <div class="synth-params">
            <div class="param-row">
              <label>Lead Waveform:</label>
              <select v-model="synthWave" class="param-select" @change="onWaveChange">
                <option value="sawtooth">Sawtooth (Brass / Heroic)</option>
                <option value="square">Square (Chiptune / Hollow)</option>
                <option value="triangle">Triangle (Warm Flute)</option>
                <option value="sine">Sine (Pure / Soft)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Bass & Timpani Channel -->
      <section class="channel-card">
        <div class="channel-header">
          <h3>🎻 Bass & Low Brass Line</h3>
          <span class="channel-badge">Sequence + PolySynth 2</span>
        </div>
        <div class="channel-body">
          <label class="pattern-label">Bass Sequence Notes:</label>
          <input
            v-model="bassNotes"
            type="text"
            class="pattern-input"
            @input="onBassNotesChange"
            placeholder="G2 G2 G2 G2 Eb2 Bb2..."
          />
        </div>
      </section>

      <!-- 3. March Cadence / 808 Drums -->
      <section class="channel-card">
        <div class="channel-header">
          <h3>🥁 March Cadence & Drums</h3>
          <span class="channel-badge">Sequence + Drum Sampler</span>
        </div>
        <div class="channel-body">
          <label class="pattern-label">Drum Trigger Sequence (bd, sd, cp, hh, rest):</label>
          <input
            v-model="drumNotes"
            type="text"
            class="pattern-input"
            @input="onDrumNotesChange"
            placeholder="bd bd bd sd sd sd bd sd"
          />

          <!-- 16-step visual LED indicator -->
          <div class="step-indicator">
            <span
              v-for="i in 16"
              :key="i"
              :class="['step-box', { active: currentStep === i - 1, beat: (i - 1) % 4 === 0 }]"
            ></span>
          </div>
        </div>
      </section>

      <!-- 4. Delay & Spatial Master FX -->
      <section class="channel-card fx-card">
        <div class="channel-header">
          <h3>🎛 Master Effects Rack</h3>
          <span class="channel-badge">Stereo FX & Master</span>
        </div>
        <div class="channel-body fx-body">
          <div class="fx-param">
            <label>Delay Time (s):</label>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              v-model.number="delayTime"
              @input="onDelayChange"
            />
            <span>{{ delayTime }}s</span>
          </div>
          <div class="fx-param">
            <label>Delay Feedback:</label>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              v-model.number="delayFeedback"
              @input="onDelayChange"
            />
            <span>{{ (delayFeedback * 100).toFixed(0) }}%</span>
          </div>
          <div class="fx-param">
            <label>Delay Wet/Dry:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              v-model.number="delayMix"
              @input="onDelayChange"
            />
            <span>{{ (delayMix * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.music-station-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 2.618em 2em 6em 2em;
  box-sizing: border-box;
  overflow-y: auto;
}

.music-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5em;
  gap: 1em;
  flex-wrap: wrap;
}

.header-left h2 {
  margin: 0 0 0.4em 0;
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--ui-color-text, #ffffff);
}

.header-left p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
}

.transport-bar {
  display: flex;
  align-items: center;
  gap: 1em;
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 0.6em 1em;
}

.play-btn {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
  border: none;
  border-radius: var(--ui-radius-sm, 6px);
  padding: 0.5em 1.2em;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.play-btn.playing {
  background: oklch(0.65 0.22 25);
}

.bpm-control {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-size: 0.85rem;
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
}

.bpm-input {
  width: 55px;
  padding: 0.3em 0.5em;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 4px);
  color: #ffffff;
  font-size: 0.85rem;
  outline: none;
}

.cycle-pill {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ui-color-accent, oklch(0.75 0.22 150));
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  padding: 0.3em 0.7em;
  border-radius: 6px;
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
}

.preset-theme-bar {
  display: flex;
  align-items: center;
  gap: 0.8em;
  margin-bottom: 2em;
  flex-wrap: wrap;
}

.preset-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ui-color-text-muted, oklch(0.75 0.02 260));
}

.preset-theme-btn {
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
  padding: 0.4em 0.8em;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-theme-btn:hover {
  border-color: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
}

.preset-theme-btn.active {
  background: var(--ui-color-primary, oklch(0.65 0.22 260));
  color: #ffffff;
  border-color: var(--ui-color-primary, oklch(0.65 0.22 260));
}

.music-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.618em;
}

.channel-card {
  background: var(--ui-color-surface-elevated, oklch(0.16 0.025 260));
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  border-radius: var(--ui-radius-md, 8px);
  padding: 1.618em;
}

.channel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.236em;
  border-bottom: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
  padding-bottom: 0.6em;
}

.channel-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--ui-color-text, #ffffff);
}

.channel-badge {
  font-size: 0.72rem;
  padding: 0.2em 0.6em;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border-radius: 12px;
  color: var(--ui-color-text-muted, oklch(0.7 0.02 260));
}

.pattern-label {
  display: block;
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--ui-color-text-muted, oklch(0.8 0.02 260));
  margin-bottom: 0.4em;
}

.pattern-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6em 0.8em;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: var(--ui-color-accent, oklch(0.75 0.22 150));
  font-family: ui-monospace, monospace;
  font-size: 0.95rem;
  outline: none;
  margin-bottom: 0.8em;
}

.step-indicator {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 0.3em;
  margin-top: 1em;
}

.step-box {
  height: 12px;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border-radius: 2px;
  border: 1px solid var(--ui-color-border, oklch(0.25 0.02 260));
}

.step-box.beat {
  border-color: var(--ui-color-primary, oklch(0.65 0.22 260));
}

.step-box.active {
  background: var(--ui-color-accent, oklch(0.75 0.22 150));
  box-shadow: 0 0 8px var(--ui-color-accent, oklch(0.75 0.22 150));
}

.synth-params {
  display: flex;
  gap: 1.5em;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 0.6em;
  font-size: 0.85rem;
}

.param-select {
  padding: 0.4em 0.6em;
  background: var(--ui-color-surface, oklch(0.12 0.02 260));
  border: 1px solid var(--ui-color-border, oklch(0.28 0.02 260));
  border-radius: var(--ui-radius-sm, 6px);
  color: #ffffff;
  font-size: 0.85rem;
  outline: none;
}

.fx-body {
  display: flex;
  gap: 2em;
  flex-wrap: wrap;
}

.fx-param {
  display: flex;
  align-items: center;
  gap: 0.8em;
  font-size: 0.85rem;
}
</style>
