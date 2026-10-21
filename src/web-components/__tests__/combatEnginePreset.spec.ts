import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '../../index'
import { PRESET_DEMOS } from '../../../demo/src/presets'
import { AxonStudio } from '../axonStudio.component'

describe('Preset: combat-engine (Entity Combat Pipeline)', () => {
  let studio: AxonStudio

  beforeEach(() => {
    document.body.innerHTML = ''
    studio = document.createElement('axon-studio') as AxonStudio
    document.body.appendChild(studio)
  })

  afterEach(() => {
    studio.remove()
    document.body.innerHTML = ''
  })

  it('imports combat-engine preset without freezing or dropping ports', async () => {
    const preset = PRESET_DEMOS.find((p) => p.id === 'combat-engine')!
    expect(preset).toBeDefined()

    studio.importJSON(preset.graph)

    const graphEl = studio.graph
    expect(graphEl).toBeDefined()

    await graphEl!.engine.settle()

    // Verify nodes are present and initialized
    const nodeIds = graphEl!.engine.nodes.map((n) => n.id)
    expect(nodeIds).toContain('atk-node')
    expect(nodeIds).toContain('def-node')
    expect(nodeIds).toContain('dmg-calc')
    expect(nodeIds).toContain('gate-node')
    expect(nodeIds).toContain('display-dmg')

    // Verify computed damage value: 85 + 15 = 100; 40 * 0.5 = 20; 100 - 20 = 80
    const dmgCalc = graphEl!.engine.getNode('dmg-calc')
    expect(dmgCalc?.getOutput('result')).toBe(80)

    // Verify gate node (Compare node > 0) evaluates to true
    const gateNode = graphEl!.engine.getNode('gate-node')
    expect(gateNode?.getOutput('result')).toBe(true)

    // Verify display node received the calculated value
    const displayNode = graphEl!.engine.getNode('display-dmg')
    expect(displayNode?.getInput('value')).toBe(80)

    // Verify DOM ports remain mounted and registered
    const cmpInPort = graphEl!.querySelector('#gate-node\\:a')
    const cmpOutPort = graphEl!.querySelector('#gate-node\\:result')
    expect(cmpInPort).not.toBeNull()
    expect(cmpOutPort).not.toBeNull()
  })

  it('compiles combat-engine graph to valid TypeScript without runtime dependencies', () => {
    const preset = PRESET_DEMOS.find((p) => p.id === 'combat-engine')!
    studio.importJSON(preset.graph)

    const code = studio.compileGraph({ typescript: true })
    expect(code).toBeDefined()
    expect(code).toContain('export function executeCompiledGraph')
    expect(code).toContain('_dmg_calc_result')
    expect(code).toContain('_gate_node_result')
  })
})
