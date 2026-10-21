/* oxlint-disable typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import '../axonGraph.component'
import { TAG_NAMES } from '../constants'

describe('AxonGraph Component Lifecycle', () => {
  it('should clean up resources on disconnection', () => {
    const graph = document.createElement(TAG_NAMES.AXON_GRAPH) as any
    document.body.appendChild(graph)

    graph.requestDraw()

    const observerDisconnectSpy = vi.spyOn(MutationObserver.prototype, 'disconnect')

    document.body.removeChild(graph)

    expect(observerDisconnectSpy).toHaveBeenCalled()
    expect(graph.isConnected).toBe(false)
  })

  it('should stop requestDraw loop when disconnected', async () => {
    const graph = document.createElement(TAG_NAMES.AXON_GRAPH) as any
    document.body.appendChild(graph)

    let frames = 0
    const originalDraw = graph.draw
    graph.draw = () => {
      frames++
      originalDraw.call(graph)
    }

    graph.requestDraw()
    await new Promise((r) => requestAnimationFrame(r))
    const framesBefore = frames

    document.body.removeChild(graph)

    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => requestAnimationFrame(r))

    expect(frames).toBe(framesBefore)
  })
})

describe('AxonGraph Drag Mode and Cursor Classes', () => {
  it('defaults to pan dragMode', () => {
    const graph = document.createElement(TAG_NAMES.AXON_GRAPH) as any
    document.body.appendChild(graph)

    expect(graph.dragMode).toBe('pan')
    expect(graph.boxSelectMode).toBe(false)

    graph.dragMode = 'box-select'
    expect(graph.dragMode).toBe('box-select')
    expect(graph.boxSelectMode).toBe(true)

    graph.setAttribute('dragmode', 'pan')
    expect(graph.dragMode).toBe('pan')

    document.body.removeChild(graph)
  })

  it('adds is-panning class during canvas pan and cleans up on pointerup', () => {
    const graph = document.createElement(TAG_NAMES.AXON_GRAPH) as any
    document.body.appendChild(graph)

    expect(graph.classList.contains('is-panning')).toBe(false)

    // Simulate left click down on empty canvas
    graph.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, bubbles: true }),
    )
    expect(graph.classList.contains('is-panning')).toBe(true)
    expect(graph.classList.contains('is-interacting')).toBe(true)

    // Move
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 150 }))

    // Up
    window.dispatchEvent(new PointerEvent('pointerup'))
    expect(graph.classList.contains('is-panning')).toBe(false)
    expect(graph.classList.contains('is-interacting')).toBe(false)

    document.body.removeChild(graph)
  })

  it('adds is-connecting class during connection and removes on pointerup', () => {
    const graph = document.createElement(TAG_NAMES.AXON_GRAPH) as any
    document.body.appendChild(graph)

    const mockPort = document.createElement('axon-port') as any
    mockPort.id = 'node1:out'
    mockPort.setAttribute('type', 'out')

    graph.handleConnectionStart(mockPort)
    expect(graph.classList.contains('is-connecting')).toBe(true)

    window.dispatchEvent(new PointerEvent('pointerup'))
    expect(graph.classList.contains('is-connecting')).toBe(false)

    document.body.removeChild(graph)
  })
})
