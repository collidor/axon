import { describe, it, expect } from 'vitest'
import '@collidor/ui'
import '../../index'
import '../../web-components/nodes/dataGraphNodes.component'
import { AxonUmlTableNode } from '../nodes/umlTableNode.component'
import { AxonCommandDispatchNode } from '../nodes/actions/commandDispatchNode.component'

describe('Web Component Node Cards (Visual Elements)', () => {
  describe('AxonFeedbackNode Web Component', () => {
    it('renders monitor values and responds to step and reset button clicks', () => {
      const el = document.createElement('axon-feedback-node') as any
      el.nodeData = { initial: 7 }
      document.body.appendChild(el)

      expect(el.engine).not.toBeNull()
      expect(el.engine.getOutput('output')).toBe(7)

      const curVal = el.querySelector('.feedback-cur-val')
      expect(curVal?.textContent).toBe('7.00')

      // Set input
      el.engine.setInput('input', 25)
      el.render()

      const nextVal = el.querySelector('.feedback-next-val')
      expect(nextVal?.textContent).toBe('25.00')

      // Click step button
      const stepBtn = el.querySelector('.feedback-btn-step')
      stepBtn?.click()

      expect(el.engine.getOutput('output')).toBe(25)
      expect(el.querySelector('.feedback-cur-val')?.textContent).toBe('25.00')

      // Click reset button
      const resetBtn = el.querySelector('.feedback-btn-reset')
      resetBtn?.click()

      expect(el.engine.getOutput('output')).toBe(7)
      expect(el.querySelector('.feedback-cur-val')?.textContent).toBe('7.00')

      el.remove()
    })

    it('updates DOM attributes data-status and is-streaming when status changes', () => {
      const el = document.createElement('axon-feedback-node') as any
      document.body.appendChild(el)

      expect(el.getAttribute('data-status')).toBeNull()

      el.engine.setStatus('running', 30)
      expect(el.getAttribute('data-status')).toBe('running')
      expect(el.classList.contains('status-running')).toBe(true)
      expect(el.classList.contains('is-streaming')).toBe(true)

      el.engine.setStatus('resolved', 100)
      expect(el.getAttribute('data-status')).toBe('resolved')
      expect(el.classList.contains('status-resolved')).toBe(true)
      expect(el.classList.contains('is-streaming')).toBe(false)

      el.remove()
    })
  })

  describe('AxonTypeConvertNode Web Component', () => {
    it('renders convert node card with target type select and number fallback for integer', () => {
      const el = document.createElement('axon-type-convert-node') as HTMLElement & {
        nodeData: Record<string, unknown>
      }
      el.id = 'tc_1'
      el.nodeData = { targetType: 'integer', fallback: 10 }
      document.body.appendChild(el)

      expect(el.innerHTML).toContain('Convert')
      expect(el.innerHTML).toContain('tc_1')

      const targetSelect = el.querySelector<HTMLElement>('.axon-convert-target-select')
      expect((targetSelect as any)?.value ?? targetSelect?.getAttribute('value')).toBe('integer')

      const fallbackInput = el.querySelector<HTMLInputElement>('.axon-fallback-input')
      expect(fallbackInput?.type).toBe('number')
      expect(fallbackInput?.value).toBe('10')

      el.remove()
    })

    it('renders boolean fallback select when targetType is boolean', () => {
      const el = document.createElement('axon-type-convert-node') as HTMLElement & {
        nodeData: Record<string, unknown>
      }
      el.id = 'tc_2'
      el.nodeData = { targetType: 'boolean', fallback: true }
      document.body.appendChild(el)

      const fallbackSelect = el.querySelector<HTMLElement>('.axon-fallback-select')
      expect(fallbackSelect).not.toBeNull()
      expect((fallbackSelect as any)?.value ?? fallbackSelect?.getAttribute('value')).toBe('true')

      el.remove()
    })
  })

  describe('AxonUmlTableNode Web Component', () => {
    it('renders columns and updates on nodeData change', () => {
      const el = new AxonUmlTableNode()
      el.id = 'table_monsters'
      el.nodeData = {
        tableName: 'monsters',
        displayName: 'Bestiary Monsters',
        storageClass: 'sqlite_table',
        columns: [
          { name: 'id', type: 'string', isPrimary: true, isNullable: false },
          { name: 'name', type: 'string', isNullable: false },
        ],
      }

      document.body.appendChild(el)

      expect(el.innerHTML).toContain('Bestiary Monsters')
      expect(el.innerHTML).toContain('monsters')
      expect(el.innerHTML).toContain('id')
      expect(el.innerHTML).toContain('name')
      expect(el.innerHTML).not.toContain('hit_points')

      // Add a new column to nodeData
      el.nodeData = {
        tableName: 'monsters',
        displayName: 'Bestiary Monsters',
        storageClass: 'sqlite_table',
        columns: [
          { name: 'id', type: 'string', isPrimary: true, isNullable: false },
          { name: 'name', type: 'string', isNullable: false },
          { name: 'hit_points', type: 'integer', defaultValue: 30 },
        ],
      }

      expect(el.innerHTML).toContain('hit_points')
      expect(el.innerHTML).toContain('3 cols')

      document.body.removeChild(el)
    })
  })

  describe('AxonCommandDispatchNode Web Component', () => {
    it('shows trigger button when not connected and hides it when connected', () => {
      const el = document.createElement('axon-command-dispatch-node') as AxonCommandDispatchNode
      el.id = 'dispatch_test'
      el.nodeData = { commandName: 'DealDamageCommand' }
      document.body.appendChild(el)

      // 1. By default, trigger port is not connected -> button is displayed
      const triggerSlot = el.querySelector<HTMLElement>('.command-trigger-slot')
      expect(triggerSlot).not.toBeNull()
      expect(triggerSlot?.style.display).not.toBe('none')

      const triggerBtn = el.querySelector<HTMLButtonElement>('.command-trigger-btn')
      expect(triggerBtn).not.toBeNull()
      expect(triggerBtn?.textContent).toContain('Exec')

      // 2. Connect trigger port -> button slot is hidden
      el.connectedPorts.add('dispatch_test:trigger')
      el.render()
      expect(triggerSlot?.style.display).toBe('none')

      // 3. Disconnect trigger port -> button slot is displayed again
      el.connectedPorts.delete('dispatch_test:trigger')
      el.render()
      expect(triggerSlot?.style.display).toBe('inline-flex')

      el.remove()
    })

    it('clicking the Exec button executes the command on the command bus', () => {
      const el = document.createElement('axon-command-dispatch-node') as AxonCommandDispatchNode
      el.id = 'dispatch_exec'
      el.nodeData = { commandName: 'DealDamageCommand' }
      document.body.appendChild(el)

      let commandDispatched = false
      const mockBus = {
        execute: () => {
          commandDispatched = true
          return { damage: 15, target: 'Dragon' }
        },
      }
      ;(el.engine as any).globalData = { commandBus: mockBus }

      const triggerBtn = el.querySelector<HTMLButtonElement>('.command-trigger-btn')
      expect(triggerBtn).not.toBeNull()

      triggerBtn?.click()

      expect(commandDispatched).toBe(true)
      expect(el.engine?.getOutput('success')).toBe(true)
      expect(el.engine?.getOutput('result')).toEqual({ damage: 15, target: 'Dragon' })

      el.remove()
    })
  })
})
