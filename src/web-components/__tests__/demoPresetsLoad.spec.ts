import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '../../index'
import { PRESET_DEMOS } from '../../../demo/src/presets'
import { AxonStudio } from '../axonStudio.component'

describe('Demo Presets Loading Test', () => {
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

  for (const preset of PRESET_DEMOS) {
    it(`loads preset: ${preset.id} (${preset.name}) without errors`, async () => {
      expect(() => {
        studio.importJSON(preset.graph)
      }).not.toThrow()

      const graphEl = studio.graph
      expect(graphEl).toBeDefined()

      await graphEl!.engine.settle()

      // Ensure nodes in the preset are mounted as child elements
      for (const node of preset.graph.nodes) {
        const domEl = graphEl!.querySelector(`#${node.id}`)
        expect(domEl, `DOM element for node ${node.id} should exist`).not.toBeNull()
      }

      // Ensure edges in the preset are mounted as axon-edge elements
      const edges = graphEl!.querySelectorAll('axon-edge')
      expect(edges.length).toBe(preset.graph.edges.length)
    })
  }
})
