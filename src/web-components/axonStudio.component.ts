import { TAG_NAMES } from './constants'
import type { AxonGraph } from './axonGraph.component'
import './axonBreadcrumbs.component'
import type { AxonBreadcrumbs } from './axonBreadcrumbs.component'
import { CommandHistoryManager } from '@collidor/command'
import { AddNodeCommand, RemoveNodeCommand } from '../commands/graphCommands'
import type { SerializedGraph } from '../core/serialization'
import { registerCoreNodes } from '../nodes/nodeLibrary'
import { compileToSource, type CompileOptions } from '../compiler/index'
import { AudioDriverManager } from '../nodes/audio/driver/audioDriver'
import { AUDIO_NODE_TYPES } from '../nodes/audio/audioNodes.constants'
import {
  type NodePaletteItem,
  NODE_PALETTE_CATEGORIES,
  PRESET_GRAPHS,
  StudioAudioTransportController,
  StudioQuickAddController,
  StudioSubgraphController,
} from './studio/index'

// Re-export palette categories and preset graphs for backward compatibility
export { type NodePaletteItem, NODE_PALETTE_CATEGORIES, PRESET_GRAPHS }

/**
 * <axon-studio>
 * Interactive Graph Studio Playground and IDE Shell.
 *
 * Orchestrates:
 * - Top action toolbar (New, Presets, Import/Export JSON, Undo/Redo, DAG Layout, Pan/Select, Zoom, Simulation)
 * - Collapsible categorised node palette with live search filtering
 * - Center infinite <axon-graph> canvas with magnetic snapping and edge routing
 * - Floating quick-add search palette on right-click or Ctrl+Space
 * - Self-contained inline controls on all node cards
 * - Bottom status bar showing node count, edge count, selection, zoom level, and simulation state
 * - Audio transport synchronization, BPM tempo management, and tap tempo (Ticket 014)
 * - Subgraph drilldown with hierarchical visual breadcrumbs (Ticket 006)
 */
export class AxonStudio extends HTMLElement {
  #graphEl: AxonGraph | null = null
  #paletteEl: HTMLElement | null = null
  #paletteSearchInput: HTMLInputElement | null = null
  #historyManager: CommandHistoryManager = new CommandHistoryManager()
  #isRunning = true

  #statusNodesEl: HTMLElement | null = null
  #statusEdgesEl: HTMLElement | null = null
  #statusSelectedEl: HTMLElement | null = null
  #statusZoomEl: HTMLElement | null = null
  #statusStateEl: HTMLElement | null = null
  #presetSelectEl: HTMLSelectElement | null = null
  #btnUndo: HTMLButtonElement | null = null
  #btnRedo: HTMLButtonElement | null = null
  #btnRunPause: HTMLButtonElement | null = null
  #unsubs: (() => void)[] = []

  public audioTransportController!: StudioAudioTransportController
  public quickAddController!: StudioQuickAddController
  public subgraphController!: StudioSubgraphController

  constructor() {
    super()
    this.audioTransportController = new StudioAudioTransportController(this)
    this.quickAddController = new StudioQuickAddController(this)
    this.subgraphController = new StudioSubgraphController(this)
  }

  connectedCallback(): void {
    registerCoreNodes()
    this.render()
    this.#setupElements()
    this.#setupGraph()
    this.#setupShortcuts()
    this.updateStatus()
  }

  disconnectedCallback(): void {
    this.quickAddController.close()
    this.stopAudio()
    this.#unsubs.forEach((unsub) => unsub())
    this.#unsubs = []
  }

  public get graph(): AxonGraph | null {
    return this.#graphEl
  }

  public get breadcrumbs(): AxonBreadcrumbs | null {
    return this.querySelector<AxonBreadcrumbs>('#studio-breadcrumbs')
  }

  public get navDepth(): number {
    return this.subgraphController ? this.subgraphController.depth : 0
  }

  public get historyManager(): CommandHistoryManager {
    return this.#historyManager
  }

  public get isRunning(): boolean {
    return this.#isRunning
  }

  public get audioBpm(): number {
    return this.audioTransportController ? this.audioTransportController.currentBpm : 120
  }

  public get isAudioPlaying(): boolean {
    return this.audioTransportController ? this.audioTransportController.isPlaying : false
  }

  render(): void {
    this.innerHTML = `
      <div class="axon-studio-shell">
        <!-- TOP TOOLBAR -->
        <header class="axon-studio-toolbar">
          <div class="studio-toolbar-left">
            <div class="studio-brand">
              <span class="studio-logo">⬡ AXON</span>
              <span class="studio-badge">STUDIO</span>
            </div>

            <div class="studio-divider"></div>

            <axon-breadcrumbs id="studio-breadcrumbs"></axon-breadcrumbs>
            <button id="studio-btn-up" class="studio-btn studio-btn-ghost is-hidden" title="Exit Subgraph (Up one level)">⤣ Up</button>

            <div class="studio-divider"></div>

            <label class="studio-label" for="studio-preset-select">Preset:</label>
            <select id="studio-preset-select" class="studio-select" title="Load predefined pipeline">
              <option value="imperial-march">Imperial March (Star Wars Theme)</option>
              <option value="oscillator">Oscillator Pipeline (Math + Clock)</option>
              <option value="rhythm-stack">Algorithmic Beat (Clock + Drums + Synth + FX)</option>
              <option value="subgraph">Nested Subgraph Pipeline (Inner Graph)</option>
              <option value="feedback">Feedback Accumulator (Cycle Loop Z⁻¹)</option>
              <option value="combat">Entity Combat Pipeline (Commands & Events)</option>
              <option value="transform">Data Transform Pipeline (Compare & Gate)</option>
              <option value="blank">Blank Graph</option>
            </select>

            <button id="studio-btn-new" class="studio-btn studio-btn-ghost" title="New Blank Graph">New</button>
            <button id="studio-btn-clear" class="studio-btn studio-btn-ghost" title="Clear Canvas">Clear</button>
            <button id="studio-btn-import" class="studio-btn studio-btn-ghost" title="Import Graph JSON">Import</button>
            <button id="studio-btn-export" class="studio-btn studio-btn-ghost" title="Export Graph JSON">Export</button>
            <button id="studio-btn-compile" class="studio-btn studio-btn-ghost" title="Compile to Pure TypeScript">⚡ Compile</button>
          </div>

          <div class="studio-toolbar-center">
            <button id="studio-btn-undo" class="studio-btn studio-btn-icon" title="Undo (Ctrl+Z)">↶</button>
            <button id="studio-btn-redo" class="studio-btn studio-btn-icon" title="Redo (Ctrl+Y)">↷</button>

            <div class="studio-divider"></div>

            <button id="studio-btn-layout" class="studio-btn" title="Auto-layout DAG columns">☵ Layout DAG</button>
            <button id="studio-btn-mode" class="studio-btn" title="Toggle Drag Mode (Pan / Box-Select)">Pan Mode</button>

            <div class="studio-divider"></div>

            <button id="studio-btn-zoom-out" class="studio-btn studio-btn-icon" title="Zoom Out">−</button>
            <button id="studio-btn-zoom-in" class="studio-btn studio-btn-icon" title="Zoom In">+</button>
            <button id="studio-btn-zoom-fit" class="studio-btn" title="Fit to View">⛶ Fit</button>

            <div class="studio-divider"></div>

            <!-- AUDIO TRANSPORT BAR (Ticket 014) -->
            <div id="studio-audio-transport" class="studio-transport-group" title="Audio Engine Transport Controls">
              <button id="studio-btn-audio-play" class="studio-btn studio-btn-accent" title="Play/Pause Audio Engine (Space)">▶ Audio</button>
              <button id="studio-btn-audio-stop" class="studio-btn studio-btn-icon" title="Stop & Reset Audio Clocks">■</button>
              <div class="studio-tempo-control" title="Tempo (BPM)">
                <input id="studio-audio-bpm" type="number" class="studio-number-input" min="20" max="300" value="120" />
                <span class="studio-unit">BPM</span>
              </div>
              <button id="studio-btn-audio-tap" class="studio-btn studio-btn-icon" title="Tap Tempo">TAP</button>
              <span id="studio-audio-cycle" class="studio-cycle-display" title="Musical Bar.Beat.Step">001.1.1</span>
              <button id="studio-btn-audio-unlock" class="studio-badge-audio" title="Audio Context Status (Click to Resume)">● Audio Active</button>
            </div>
          </div>

          <div class="studio-toolbar-right">
            <button id="studio-btn-toggle-palette" class="studio-btn studio-btn-active" title="Toggle Node Palette">Node Library</button>
            <button id="studio-btn-run-pause" class="studio-btn studio-btn-primary" title="Run / Pause Simulation">⏸ Pause</button>
            <button id="studio-btn-step" class="studio-btn studio-btn-icon" title="Step Simulation Single Cycle">⏭</button>
          </div>
        </header>

        <!-- MAIN WORKSPACE BODY -->
        <div class="axon-studio-body">
          <!-- LEFT COLLAPSIBLE NODE PALETTE -->
          <aside id="studio-palette" class="axon-studio-palette">
            <div class="studio-palette-header">
              <input
                id="studio-palette-search"
                type="text"
                class="studio-search-input"
                placeholder="Search nodes... (e.g. math, synth, event)"
              />
            </div>
            <div id="studio-palette-list" class="studio-palette-list">
              <!-- Dynamically populated categories -->
            </div>
          </aside>

          <!-- CENTER CANVAS CONTAINER -->
          <main id="studio-canvas-container" class="axon-studio-canvas-container axon-studio-canvas">
            <axon-graph id="studio-graph" autosort="true" snapenabled="true"></axon-graph>

            <!-- FLOATING QUICK ADD POPUP -->
            <div id="studio-quick-add" class="studio-quick-add-modal axon-quick-add-modal" style="display: none;">
              <input
                id="studio-quick-add-search"
                type="text"
                class="quick-add-input"
                placeholder="Quick Add Node..."
              />
              <div id="studio-quick-add-results" class="quick-add-results"></div>
            </div>
          </main>
        </div>

        <!-- BOTTOM STATUS BAR -->
        <footer class="axon-studio-statusbar">
          <div class="studio-status-left">
            <span id="studio-status-nodes">Nodes: 0</span>
            <span class="studio-status-sep">|</span>
            <span id="studio-status-edges">Edges: 0</span>
            <span class="studio-status-sep">|</span>
            <span id="studio-status-selected">Selected: 0</span>
          </div>
          <div class="studio-status-right">
            <span id="studio-status-zoom">Zoom: 100%</span>
            <span class="studio-status-sep">|</span>
            <span id="studio-status-state" class="studio-status-badge badge-running">Running</span>
          </div>
        </footer>
      </div>
    `
  }

  #setupElements(): void {
    this.#graphEl = this.querySelector<AxonGraph>('#studio-graph')
    this.#paletteEl = this.querySelector<HTMLElement>('#studio-palette')
    this.#paletteSearchInput = this.querySelector<HTMLInputElement>('#studio-palette-search')

    const quickAddModal = this.querySelector<HTMLElement>('#studio-quick-add')
    const quickAddSearchInput = this.querySelector<HTMLInputElement>('#studio-quick-add-search')
    const quickAddResults = this.querySelector<HTMLElement>('#studio-quick-add-results')

    this.quickAddController.bindElements({
      modal: quickAddModal,
      searchInput: quickAddSearchInput,
      resultsContainer: quickAddResults,
    })

    this.#statusNodesEl = this.querySelector<HTMLElement>('#studio-status-nodes')
    this.#statusEdgesEl = this.querySelector<HTMLElement>('#studio-status-edges')
    this.#statusSelectedEl = this.querySelector<HTMLElement>('#studio-status-selected')
    this.#statusZoomEl = this.querySelector<HTMLElement>('#studio-status-zoom')
    this.#statusStateEl = this.querySelector<HTMLElement>('#studio-status-state')

    this.#btnUndo = this.querySelector<HTMLButtonElement>('#studio-btn-undo')
    this.#btnRedo = this.querySelector<HTMLButtonElement>('#studio-btn-redo')
    this.#btnRunPause = this.querySelector<HTMLButtonElement>('#studio-btn-run-pause')

    // Bind Audio transport controller
    const btnAudioPlay = this.querySelector<HTMLButtonElement>('#studio-btn-audio-play')
    const btnAudioStop = this.querySelector<HTMLButtonElement>('#studio-btn-audio-stop')
    const inputAudioBpm = this.querySelector<HTMLInputElement>('#studio-audio-bpm')
    const btnAudioTap = this.querySelector<HTMLButtonElement>('#studio-btn-audio-tap')
    const labelAudioCycle = this.querySelector<HTMLElement>('#studio-audio-cycle')
    const badgeAudioUnlock = this.querySelector<HTMLButtonElement>('#studio-btn-audio-unlock')

    this.audioTransportController.bindElements({
      playButton: btnAudioPlay,
      bpmInput: inputAudioBpm,
      cycleLabel: labelAudioCycle,
      unlockBadge: badgeAudioUnlock,
    })

    const breadcrumbsElement = this.querySelector<AxonBreadcrumbs>('#studio-breadcrumbs')
    const btnUp = this.querySelector<HTMLButtonElement>('#studio-btn-up')

    this.subgraphController.bindElements({
      upButton: btnUp,
    })

    breadcrumbsElement?.addEventListener('breadcrumb-select', (e: Event) => {
      const { index } = (e as CustomEvent).detail
      this.navigateUpTo(index)
    })

    btnUp?.addEventListener('click', () => {
      this.exitCurrentSubgraph()
    })

    // Populate palette list
    this.#renderPaletteItems('')

    // Palette search filter
    this.#paletteSearchInput?.addEventListener('input', () => {
      this.#renderPaletteItems(this.#paletteSearchInput?.value.toLowerCase() || '')
    })

    // Preset selection
    this.#presetSelectEl = this.querySelector<HTMLSelectElement>('#studio-preset-select')
    this.#presetSelectEl?.addEventListener('change', () => {
      if (this.#presetSelectEl) {
        this.loadPreset(this.#presetSelectEl.value as any)
      }
    })

    // Toolbar Action buttons
    this.querySelector('#studio-btn-new')?.addEventListener('click', () => this.newGraph())
    this.querySelector('#studio-btn-clear')?.addEventListener('click', () => this.clear())
    this.querySelector('#studio-btn-import')?.addEventListener('click', () => this.#promptImportJSON())
    this.querySelector('#studio-btn-export')?.addEventListener('click', () => this.#triggerExportJSON())
    this.querySelector('#studio-btn-compile')?.addEventListener('click', () => this.#triggerCompile())
    this.#btnUndo?.addEventListener('click', () => this.undo())
    this.#btnRedo?.addEventListener('click', () => this.redo())
    this.querySelector('#studio-btn-layout')?.addEventListener('click', () => this.layout())
    this.querySelector('#studio-btn-mode')?.addEventListener('click', (e) =>
      this.#toggleDragMode(e.target as HTMLButtonElement),
    )
    this.querySelector('#studio-btn-zoom-out')?.addEventListener('click', () => this.#graphEl?.zoom?.(0.85))
    this.querySelector('#studio-btn-zoom-in')?.addEventListener('click', () => this.#graphEl?.zoom?.(1.15))
    this.querySelector('#studio-btn-zoom-fit')?.addEventListener('click', () => this.#graphEl?.zoomToFit?.())

    this.querySelector('#studio-btn-toggle-palette')?.addEventListener('click', (e) => {
      this.#paletteEl?.classList.toggle('is-hidden')
      ;(e.target as HTMLElement).classList.toggle(
        'studio-btn-active',
        !this.#paletteEl?.classList.contains('is-hidden'),
      )
    })

    this.#btnRunPause?.addEventListener('click', () => this.toggleRun())
    this.querySelector('#studio-btn-step')?.addEventListener('click', () => this.step())

    // Audio transport event listeners
    btnAudioPlay?.addEventListener('click', () => this.toggleAudioPlay())
    btnAudioStop?.addEventListener('click', () => this.stopAudio())
    inputAudioBpm?.addEventListener('change', () => {
      this.setAudioBpm(Number(inputAudioBpm?.value))
    })
    btnAudioTap?.addEventListener('click', () => this.tapAudioTempo())
    badgeAudioUnlock?.addEventListener('click', async () => {
      await AudioDriverManager.get().resume()
      this.audioTransportController.updateUnlockBadge()
    })

    // Drag and drop nodes from sidebar palette into canvas
    const canvasContainer = this.querySelector<HTMLElement>('#studio-canvas-container')
    if (canvasContainer) {
      canvasContainer.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy'
        }
        canvasContainer.classList.add('is-drag-over')
      })

      canvasContainer.addEventListener('dragleave', (e: DragEvent) => {
        if (e.relatedTarget && canvasContainer.contains(e.relatedTarget as Node)) return
        canvasContainer.classList.remove('is-drag-over')
      })

      canvasContainer.addEventListener('drop', (e: DragEvent) => {
        canvasContainer.classList.remove('is-drag-over')
        if (e.defaultPrevented) return
        if (!e.dataTransfer || !this.#graphEl) return

        let nodeType = ''
        let initialData: Record<string, unknown> = {}

        const json = e.dataTransfer.getData('application/json')
        if (json) {
          try {
            const parsed = JSON.parse(json)
            nodeType = parsed.type
            initialData = parsed.initialData || {}
          } catch {
            // fallback to plain text
          }
        }

        if (!nodeType) {
          nodeType = e.dataTransfer.getData('text/plain')
        }

        if (!nodeType) return

        e.preventDefault()

        const graphRect = this.#graphEl.getBoundingClientRect()
        const mouseRelX = e.clientX - graphRect.left
        const mouseRelY = e.clientY - graphRect.top

        const worldPos = this.#graphEl.viewportTransform
          ? this.#graphEl.viewportTransform.toWorld(mouseRelX, mouseRelY)
          : { x: mouseRelX, y: mouseRelY }

        let finalX = Math.round(worldPos.x - 40)
        let finalY = Math.round(worldPos.y - 20)

        if (this.#graphEl.snapEnabled) {
          const gridSize = 20
          finalX = Math.round(finalX / gridSize) * gridSize
          finalY = Math.round(finalY / gridSize) * gridSize
        }

        this.spawnNode(nodeType, finalX, finalY, initialData)
      })
    }
  }

  #setupGraph(): void {
    if (!this.#graphEl) return
    this.#graphEl.historyManager = this.#historyManager

    // Load initial preset
    this.loadPreset('imperial-march')

    // Track mutations to update status bar
    const observer = new MutationObserver(() => this.updateStatus())
    observer.observe(this.#graphEl, { childList: true, subtree: true })
    this.#unsubs.push(() => observer.disconnect())

    // Track selection changes
    const onSelectionChange = () => this.updateStatus()
    this.#graphEl.addEventListener('selection-change', onSelectionChange)
    this.#unsubs.push(() => this.#graphEl?.removeEventListener('selection-change', onSelectionChange))

    // Subgraph double-click drill-down
    const onOpenSubgraph = (e: Event) => {
      const nodeId = (e as CustomEvent).detail
      this.drillDownIntoSubgraph(nodeId)
    }
    this.#graphEl.addEventListener('open-subgraph', onOpenSubgraph)
    this.#unsubs.push(() => this.#graphEl?.removeEventListener('open-subgraph', onOpenSubgraph))

    // Canvas context menu (Right click) to open quick add
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      this.quickAddController.open(e.clientX, e.clientY)
    }
    this.#graphEl.addEventListener('contextmenu', onContextMenu)
    this.#unsubs.push(() => this.#graphEl?.removeEventListener('contextmenu', onContextMenu))

    // Audio transport cycle tracking interval
    const cycleLabelElement = this.querySelector<HTMLElement>('#studio-audio-cycle')
    const audioSyncTimer = setInterval(() => {
      if (cycleLabelElement && this.#graphEl) {
        const clockEl = this.#graphEl.querySelector<any>(TAG_NAMES.AXON_AUDIO_CLOCK_NODE)
        if (clockEl?.engine) {
          const cyc = Number(clockEl.engine.getOutput('cycle') ?? 0)
          const intPart = Math.floor(cyc)
          const frac = cyc - intPart
          const beat = Math.floor(frac * 4) + 1
          const step = (Math.floor(frac * 16) % 4) + 1
          cycleLabelElement.textContent = `${String(intPart + 1).padStart(3, '0')}.${beat}.${step}`
        }
      }
      this.audioTransportController.updateUnlockBadge()
    }, 120)
    this.#unsubs.push(() => clearInterval(audioSyncTimer))
  }

  #setupShortcuts(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          Boolean(
            target.closest?.(
              'input, textarea, select, [contenteditable="true"], ui-input, ui-select, ui-switch',
            ),
          ))
      if (isInput) {
        if (e.key === 'Escape') {
          this.quickAddController.close()
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          this.redo()
        } else {
          this.undo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        this.redo()
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        this.quickAddController.open(window.innerWidth / 2, window.innerHeight / 2)
      } else if (e.code === 'Space') {
        e.preventDefault()
        this.toggleAudioPlay()
      } else if (e.key === 'Escape') {
        this.quickAddController.close()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = this.#graphEl?.selectionManager?.selectedIds ?? []
        if (selected.length > 0) {
          e.preventDefault()
          selected.forEach((nodeId) => {
            this.#graphEl?.deleteNode(nodeId, true)
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    this.#unsubs.push(() => window.removeEventListener('keydown', handleKeyDown))
  }

  #renderPaletteItems(query: string): void {
    const list = this.querySelector<HTMLElement>('#studio-palette-list')
    if (!list) return
    list.innerHTML = ''

    NODE_PALETTE_CATEGORIES.forEach((cat) => {
      const filtered = cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)),
      )
      if (filtered.length === 0) return

      const catEl = document.createElement('div')
      catEl.className = 'palette-category'

      const catHeader = document.createElement('div')
      catHeader.className = 'palette-category-title'
      catHeader.textContent = cat.name
      catEl.appendChild(catHeader)

      filtered.forEach((item) => {
        const itemEl = document.createElement('div')
        itemEl.className = 'palette-item'
        itemEl.setAttribute('draggable', 'true')
        itemEl.setAttribute('data-node-type', item.type)
        itemEl.title = item.description ?? item.label
        itemEl.innerHTML = `
          <span class="palette-item-icon">${item.icon}</span>
          <div class="palette-item-info">
            <span class="palette-item-label">${item.label}</span>
            <span class="palette-item-desc">${item.type}</span>
          </div>
        `

        itemEl.addEventListener('dragstart', (e: DragEvent) => {
          if (!e.dataTransfer) return
          const payload = {
            type: item.type,
            initialData: item.initialData || {},
          }
          e.dataTransfer.setData('application/json', JSON.stringify(payload))
          e.dataTransfer.setData('text/plain', item.type)
          e.dataTransfer.effectAllowed = 'copy'
          itemEl.classList.add('is-dragging')
        })

        itemEl.addEventListener('dragend', () => {
          itemEl.classList.remove('is-dragging')
        })

        itemEl.addEventListener('click', () => {
          this.#spawnAtCenter(item.type, item.initialData)
        })

        catEl.appendChild(itemEl)
      })

      list.appendChild(catEl)
    })
  }

  #spawnAtCenter(type: string, initialData?: Record<string, unknown>): void {
    if (!this.#graphEl) return
    const container = this.querySelector('#studio-canvas-container')
    const rect = container?.getBoundingClientRect() ?? { width: 800, height: 600 }
    const centerWorld = this.#graphEl.viewportTransform
      ? this.#graphEl.viewportTransform.toWorld(rect.width / 2, rect.height / 2)
      : { x: 300, y: 200 }
    this.spawnNode(type, centerWorld.x, centerWorld.y, initialData)
  }

  public spawnNode(
    type: string,
    x = 200,
    y = 200,
    data: Record<string, unknown> = {},
  ): string {
    if (!this.#graphEl) return ''
    return this.#graphEl.spawnNode(type, x, y, data, true)
  }

  public undo(): void {
    if (this.#historyManager.canUndo) {
      this.#historyManager.undo({ bus: this.#graphEl?.commandBus })
      this.updateStatus()
    }
  }

  public redo(): void {
    if (this.#historyManager.canRedo) {
      this.#historyManager.redo({ bus: this.#graphEl?.commandBus })
      this.updateStatus()
    }
  }

  public newGraph(): void {
    const presetSelect = this.querySelector<HTMLSelectElement>('#studio-preset-select')
    if (presetSelect) presetSelect.value = 'blank'
    this.loadPreset('blank')
  }

  public clear(): void {
    if (this.#graphEl) {
      this.subgraphController.reset()
      this.#graphEl.clear(true)
      this.updateStatus()
    }
  }

  public layout(): void {
    if (this.#graphEl) {
      this.#graphEl.syncEngineLayout(true, true)
      this.#graphEl.zoomToFit?.()
    }
  }

  public drillDownIntoSubgraph(nodeId: string): boolean {
    return this.subgraphController.drillDown(nodeId)
  }

  public navigateUpTo(targetDepthIndex: number): boolean {
    return this.subgraphController.navigateUpTo(targetDepthIndex)
  }

  public exitCurrentSubgraph(): boolean {
    return this.subgraphController.exitCurrentSubgraph()
  }

  public loadPreset(
    name:
      | 'oscillator'
      | 'subgraph'
      | 'feedback'
      | 'combat'
      | 'transform'
      | 'blank'
      | 'rhythm-stack'
      | 'strudel'
      | 'imperial-march',
  ): void {
    if (this.#presetSelectEl && this.#presetSelectEl.value !== name) {
      this.#presetSelectEl.value = name
    }
    const resolvedName = name === 'strudel' ? 'rhythm-stack' : name
    const preset = PRESET_GRAPHS[resolvedName] || PRESET_GRAPHS[name]
    if (preset && this.#graphEl) {
      this.subgraphController.reset()
      this.#graphEl.loadGraph(preset, true)
      if (name === 'imperial-march') {
        this.setAudioBpm(104)
        this.stopAudio()
      } else if (name === 'rhythm-stack' || name === 'strudel') {
        this.setAudioBpm(120)
        this.stopAudio()
      }
      setTimeout(() => {
        this.#graphEl?.zoomToFit?.()
        this.updateStatus()
      }, 50)
    }
  }

  public toggleAudioPlay(play?: boolean): void {
    this.audioTransportController.togglePlay(play)
  }

  public stopAudio(): void {
    this.audioTransportController.stop()
  }

  public setAudioBpm(bpm: number): void {
    this.audioTransportController.setBpm(bpm)
  }

  public tapAudioTempo(): void {
    this.audioTransportController.tapTempo()
  }

  public exportJSON(): string {
    if (!this.#graphEl) return '{}'
    return JSON.stringify(this.#graphEl.serialize(), null, 2)
  }

  public importJSON(json: string | SerializedGraph): void {
    if (!this.#graphEl) return
    const graphData = typeof json === 'string' ? JSON.parse(json) : json
    this.#graphEl.loadGraph(graphData, true)

    const clockNode = graphData.nodes?.find(
      (n: any) => n.type === 'audio-clock' || n.type === AUDIO_NODE_TYPES.AUDIO_CLOCK,
    )
    if (clockNode) {
      if (typeof clockNode.data?.bpm === 'number') {
        this.setAudioBpm(clockNode.data.bpm)
      }
      this.stopAudio()
    }

    setTimeout(() => {
      this.#graphEl?.zoomToFit?.()
      this.updateStatus()
    }, 50)
  }

  #promptImportJSON(): void {
    const val = prompt('Paste Axon Graph JSON:')
    if (val) {
      try {
        this.importJSON(val)
      } catch (err) {
        alert('Invalid graph JSON: ' + (err as Error).message)
      }
    }
  }

  #triggerExportJSON(): void {
    const json = this.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `axon-graph-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  public compileGraph(options?: CompileOptions): string {
    const graphData = this.#graphEl?.engine ?? this.#graphEl?.serialize()
    if (!graphData) return ''
    return compileToSource(graphData, { typescript: true, ...options })
  }

  #triggerCompile(): void {
    const code = this.compileGraph()
    this.dispatchEvent(
      new CustomEvent('axon-graph-compiled', {
        bubbles: true,
        composed: true,
        detail: { code },
      }),
    )
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {})
    }
  }

  #toggleDragMode(btn: HTMLButtonElement): void {
    if (!this.#graphEl) return
    if (this.#graphEl.dragMode === 'pan') {
      this.#graphEl.dragMode = 'box-select'
      btn.textContent = 'Select Mode'
      btn.classList.add('studio-btn-active')
    } else {
      this.#graphEl.dragMode = 'pan'
      btn.textContent = 'Pan Mode'
      btn.classList.remove('studio-btn-active')
    }
  }

  public toggleRun(): void {
    this.#isRunning = !this.#isRunning
    if (this.#btnRunPause) {
      this.#btnRunPause.textContent = this.#isRunning ? '⏸ Pause' : '▶ Run'
      this.#btnRunPause.classList.toggle('studio-btn-primary', this.#isRunning)
    }
    if (this.#statusStateEl) {
      this.#statusStateEl.textContent = this.#isRunning ? 'Running' : 'Paused'
      this.#statusStateEl.className = `studio-status-badge ${this.#isRunning ? 'badge-running' : 'badge-paused'}`
    }
  }

  public step(): void {
    if (this.#graphEl) {
      this.#graphEl.engine.step()
      void this.#graphEl.engine.settle()
      this.updateStatus()
    }
  }

  public updateStatus(): void {
    if (!this.#graphEl) return
    const nodeCount = this.#graphEl.querySelectorAll(
      '[data-axon-node], .graph-node-box, axon-box, [id*="-node"], axon-math-node, axon-constant-node, axon-display-node, axon-clock-node, axon-event-node, axon-command-dispatch-node',
    ).length
    const edgeCount = this.#graphEl.querySelectorAll(TAG_NAMES.AXON_EDGE).length
    const selectedCount = this.#graphEl.selectionManager?.selectedIds?.length ?? 0
    const zoom = Math.round((this.#graphEl.viewportTransform?.k ?? 1) * 100)

    if (this.#statusNodesEl) this.#statusNodesEl.textContent = `Nodes: ${nodeCount}`
    if (this.#statusEdgesEl) this.#statusEdgesEl.textContent = `Edges: ${edgeCount}`
    if (this.#statusSelectedEl) this.#statusSelectedEl.textContent = `Selected: ${selectedCount}`
    if (this.#statusZoomEl) this.#statusZoomEl.textContent = `Zoom: ${zoom}%`

    if (this.#btnUndo) this.#btnUndo.disabled = !this.#historyManager.canUndo
    if (this.#btnRedo) this.#btnRedo.disabled = !this.#historyManager.canRedo
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAMES.AXON_STUDIO)) {
  customElements.define(TAG_NAMES.AXON_STUDIO, AxonStudio)
}
