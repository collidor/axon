import { describe, it, expect } from 'vitest'
import { PolySynthNodeEngine } from '../polySynth.engine'
import { AudioDriverManager } from '../driver/audioDriver'
import { AudioMixerNodeEngine } from '../fx/audioMixer.engine'
import { BaseNode } from '../../../core/base.node'
import '../../../web-components/nodes/audio/synthNode.component'

describe('Audio Lifecycle & Memory Leak Fixes (Ticket 030)', () => {
  it('unregisters audio bus and disconnects voices when PolySynthNodeEngine is destroyed', () => {
    const driver = AudioDriverManager.get()
    const synth = new PolySynthNodeEngine({ id: 'test-synth-lifecycle' })

    const busId = `audio-bus-test-synth-lifecycle`
    expect(driver.getBus(busId)).toBeDefined()

    synth.destroy()

    // Bus should be unregistered
    expect(driver.getBus(busId)).toBeUndefined()
  })

  it('unregisters audio bus when AudioMixerNodeEngine is destroyed', () => {
    const driver = AudioDriverManager.get()
    const mixer = new AudioMixerNodeEngine({ id: 'test-mixer-lifecycle' })

    const busId = `audio-mixer-test-mixer-lifecycle`
    expect(driver.getBus(busId)).toBeDefined()

    mixer.destroy()

    expect(driver.getBus(busId)).toBeUndefined()
  })

  it('BaseNode.destroy clears statusListeners and settleDependencies', () => {
    const node = new BaseNode({
      nodeType: 'custom',
      inputs: {},
      outputs: {},
    })

    let statusUpdateCount = 0
    node.subscribeStatus(() => {
      statusUpdateCount++
    })

    node.setStatus('running', 50)
    expect(statusUpdateCount).toBe(1)

    node.destroy()

    // Setting status after destroy should not invoke listener
    node.setStatus('resolved', 100)
    expect(statusUpdateCount).toBe(1)
  })

  it('AxonBaseNodeElement destroys its engine and unregisters bus on disconnectedCallback', () => {
    const driver = AudioDriverManager.get()
    const element = document.createElement('axon-synth-node') as any
    element.id = 'dom-synth-lifecycle'
    document.body.appendChild(element)

    const busId = `audio-bus-dom-synth-lifecycle`
    expect(driver.getBus(busId)).toBeDefined()

    // Remove from DOM
    element.remove()

    // After element removal, disconnectedCallback destroyed the engine and unregistered the bus
    expect(driver.getBus(busId)).toBeUndefined()
  })
})
