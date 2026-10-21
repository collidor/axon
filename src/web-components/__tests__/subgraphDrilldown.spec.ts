// oxlint-disable typescript/no-explicit-any
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@collidor/ui'
import '../axonGraph.component'
import '../axonStudio.component'
import '../axonBreadcrumbs.component'
import '../nodes/subgraphNode.component'
import { AxonStudio } from '../axonStudio.component'
import { AxonBreadcrumbs } from '../axonBreadcrumbs.component'
import { TAG_NAMES } from '../constants'
import { registerCoreNodes } from '../../nodes/nodeLibrary'

describe('Subgraph Drill-Down and Visual Breadcrumbs (Ticket 006)', () => {
  let studio: AxonStudio

  beforeEach(() => {
    registerCoreNodes()
    document.body.innerHTML = ''
    studio = document.createElement(TAG_NAMES.AXON_STUDIO) as AxonStudio
    document.body.appendChild(studio)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders AxonBreadcrumbs initialized with Root Graph', () => {
    const breadcrumbs = studio.querySelector<AxonBreadcrumbs>('#studio-breadcrumbs')
    expect(breadcrumbs).not.toBeNull()
    expect(breadcrumbs?.depth).toBe(0)
    expect(breadcrumbs?.currentCrumb.label).toBe('Root Graph')
  })

  it('drills down into nested subgraph when double-clicking axon-subgraph-node', async () => {
    // 1. Load the subgraph preset
    studio.loadPreset('subgraph')
    await new Promise((r) => setTimeout(r, 60))

    const subBox = studio.graph?.querySelector('#sub-calc')
    expect(subBox).not.toBeNull()

    // 2. Double-click the subgraph node
    subBox?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    await new Promise((r) => setTimeout(r, 60))

    // 3. Verify drill-down occurred
    expect(studio.navDepth).toBe(1)
    expect(studio.breadcrumbs?.depth).toBe(1)
    expect(studio.breadcrumbs?.currentCrumb.label).toBe('Oscillator Scaler')

    // 4. Verify canvas displays inner graph nodes
    const innerMath = studio.graph?.querySelector('#math-inner')
    const innerIn = studio.graph?.querySelector('#in-tick')
    const innerOut = studio.graph?.querySelector('#out-scaled')
    expect(innerMath).not.toBeNull()
    expect(innerIn).not.toBeNull()
    expect(innerOut).not.toBeNull()

    // Outer node #sub-calc is not on the inner canvas
    expect(studio.graph?.querySelector('#sub-calc')).toBeNull()
  })

  it('navigates back to root graph when clicking Root breadcrumb link', async () => {
    studio.loadPreset('subgraph')
    await new Promise((r) => setTimeout(r, 60))

    // Drill down
    const subBox = studio.graph?.querySelector('#sub-calc')
    subBox?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    await new Promise((r) => setTimeout(r, 60))
    expect(studio.navDepth).toBe(1)

    // Click Root Graph in breadcrumbs
    const rootLink = studio.breadcrumbs?.querySelector<HTMLButtonElement>('.breadcrumb-link')
    expect(rootLink).not.toBeNull()
    expect(rootLink?.textContent).toContain('Root Graph')
    rootLink?.click()
    await new Promise((r) => setTimeout(r, 60))

    // Verify back at root
    expect(studio.navDepth).toBe(0)
    expect(studio.breadcrumbs?.depth).toBe(0)
    expect(studio.breadcrumbs?.currentCrumb.label).toBe('Root Graph')

    // Outer nodes restored on canvas
    expect(studio.graph?.querySelector('#clk-1')).not.toBeNull()
    expect(studio.graph?.querySelector('#sub-calc')).not.toBeNull()
    expect(studio.graph?.querySelector('#disp-sub')).not.toBeNull()
  })

  it('navigates back using exitCurrentSubgraph / Up button', async () => {
    studio.loadPreset('subgraph')
    await new Promise((r) => setTimeout(r, 60))

    // Drill down
    studio.drillDownIntoSubgraph('sub-calc')
    await new Promise((r) => setTimeout(r, 60))
    expect(studio.navDepth).toBe(1)

    // Click Up button
    const btnUp = studio.querySelector<HTMLButtonElement>('#studio-btn-up')
    expect(btnUp).not.toBeNull()
    btnUp?.click()
    await new Promise((r) => setTimeout(r, 60))

    expect(studio.navDepth).toBe(0)
    expect(studio.graph?.querySelector('#sub-calc')).not.toBeNull()
  })

  it('supports multi-level nested subgraph drill-down (root -> sub1 -> sub2)', async () => {
    studio.loadPreset('blank')

    // 1. Create sub1 containing sub2
    studio.graph?.loadGraph({
      nodes: [
        {
          id: 'sub-level-1',
          type: 'subgraph',
          x: 100,
          y: 100,
          data: {
            name: 'Layer 1',
            graph: {
              nodes: [
                {
                  id: 'sub-level-2',
                  type: 'subgraph',
                  x: 150,
                  y: 150,
                  data: {
                    name: 'Layer 2',
                    graph: {
                      nodes: [
                        { id: 'math-deep', type: 'math', x: 200, y: 200, data: { a: 99 } },
                      ],
                      edges: [],
                    },
                  },
                },
              ],
              edges: [],
            },
          },
        },
      ],
      edges: [],
    })

    await new Promise((r) => setTimeout(r, 60))

    // Drill down to Layer 1
    studio.drillDownIntoSubgraph('sub-level-1')
    await new Promise((r) => setTimeout(r, 60))
    expect(studio.navDepth).toBe(1)
    expect(studio.breadcrumbs?.currentCrumb.label).toBe('Layer 1')

    // Drill down to Layer 2
    studio.drillDownIntoSubgraph('sub-level-2')
    await new Promise((r) => setTimeout(r, 60))
    expect(studio.navDepth).toBe(2)
    expect(studio.breadcrumbs?.currentCrumb.label).toBe('Layer 2')
    expect(studio.graph?.querySelector('#math-deep')).not.toBeNull()

    // Navigate straight back to Root Graph (index 0)
    studio.navigateUpTo(0)
    await new Promise((r) => setTimeout(r, 60))
    expect(studio.navDepth).toBe(0)
    expect(studio.breadcrumbs?.depth).toBe(0)
    expect(studio.graph?.querySelector('#sub-level-1')).not.toBeNull()
  })
})
