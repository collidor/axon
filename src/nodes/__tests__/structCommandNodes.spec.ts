// oxlint-disable typescript/no-explicit-any
import { describe, it, expect, beforeEach } from 'vitest'
import { CommandBus } from '@collidor/command'
import { EventBus } from '@collidor/toolkit'
import { s, StandardComponents } from '@collidor/struct'
import { createStructCommand, requires } from '@collidor/struct-command'
import { createStructEvent, requires as eventRequires } from '@collidor/struct-event'
import { BaseGraph } from '../../core/base.graph'
import {
  CommandHandlerNodeEngine,
  createCommandHandlerNode,
} from '../commandHandler.node'
import {
  CommandDispatchNodeEngine,
  createCommandDispatchNode,
} from '../commandDispatch.node'
import {
  EventNodeEngine,
  createEventNode,
} from '../event.node'
import { CommandRegistry } from '../../commands/commandRegistry'
import { EventRegistry } from '../../events/index'
import { createMathNode } from '../math.node'
import { registerCoreNodes } from '../nodeLibrary'

describe('Axon Struct-Command and Struct-Event Unification with Odin Capabilities', () => {
  let commandBus: CommandBus
  let eventBus: EventBus
  let commandRegistry: CommandRegistry
  let eventRegistry: EventRegistry

  const Position = StandardComponents.Position
  const Health = StandardComponents.Health

  beforeEach(() => {
    commandBus = new CommandBus()
    eventBus = new EventBus()
    commandRegistry = new CommandRegistry()
    eventRegistry = new EventRegistry()
    registerCoreNodes()
  })

  describe('StructCommand with Single Component Requirement (requires(Position))', () => {
    const MoveEntityCommand = createStructCommand(
      'MoveEntityCommand',
      requires(Position),
      s.struct({ success: s.boolean(), newX: s.number(), newY: s.number() }),
    )

    beforeEach(() => {
      commandRegistry.register({
        name: 'MoveEntityCommand',
        commandClass: MoveEntityCommand,
      })
    })

    it('CommandHandlerNode derives ports with component and its subfields, and unrolls payload', () => {
      const handlerNode = createCommandHandlerNode(
        {
          initialData: { commandName: 'MoveEntityCommand' },
        },
        { commandBus, commandRegistry },
      )

      const outputSchemas = handlerNode.getOutputsSchema()
      expect(outputSchemas).toHaveProperty('position')
      expect(outputSchemas).toHaveProperty('x')
      expect(outputSchemas).toHaveProperty('y')
      expect(outputSchemas).toHaveProperty('trigger')
      expect(outputSchemas).toHaveProperty('data')

      let receivedX = 0
      let receivedY = 0
      let receivedPos: any = null

      handlerNode.subscribe((port, val) => {
        if (port === 'x') receivedX = val as number
        if (port === 'y') receivedY = val as number
        if (port === 'position') receivedPos = val
      })

      const entity = {
        id: 'orc_champion',
        name: 'Grom',
        position: { x: 120, y: 340 },
      }

      const res = commandBus.execute(new MoveEntityCommand(entity))

      expect(receivedX).toBe(120)
      expect(receivedY).toBe(340)
      expect(receivedPos).toEqual({ x: 120, y: 340 })
      // Handler without result input returns the unrolled data
      expect(res).toEqual({ x: 120, y: 340 })

      handlerNode.destroy()
    })

    it('CommandDispatchNode can dispatch using a raw entity holder object', () => {
      commandBus.register(MoveEntityCommand, (cmd) => {
        return {
          success: true,
          newX: (cmd.data as any).x + 10,
          newY: (cmd.data as any).y + 20,
        }
      })

      const dispatchNode = createCommandDispatchNode(
        {
          initialData: { commandName: 'MoveEntityCommand' },
        },
        { commandBus, commandRegistry },
      )

      expect(dispatchNode.getInputsSchema()).toHaveProperty('entity')
      expect(dispatchNode.getInputsSchema()).toHaveProperty('position')
      expect(dispatchNode.getInputsSchema()).toHaveProperty('x')
      expect(dispatchNode.getInputsSchema()).toHaveProperty('y')

      let resultCaptured: any = null
      let successCaptured = false

      dispatchNode.subscribe((port, val) => {
        if (port === 'result') resultCaptured = val
        if (port === 'success') successCaptured = Boolean(val)
      })

      const entity = {
        id: 'archer_3',
        position: { x: 50, y: 80 },
      }

      dispatchNode.setInput('entity', entity)
      dispatchNode.setInput('trigger', true)

      expect(successCaptured).toBe(true)
      expect(resultCaptured).toEqual({
        success: true,
        newX: 60,
        newY: 100,
      })
    })

    it('CommandDispatchNode can dispatch using individual component property ports (x, y)', () => {
      commandBus.register(MoveEntityCommand, (cmd) => {
        return {
          success: true,
          newX: (cmd.data as any).x * 2,
          newY: (cmd.data as any).y * 2,
        }
      })

      const dispatchNode = createCommandDispatchNode(
        {
          initialData: { commandName: 'MoveEntityCommand' },
        },
        { commandBus, commandRegistry },
      )

      let resultCaptured: any = null
      dispatchNode.subscribe((port, val) => {
        if (port === 'result') resultCaptured = val
      })

      dispatchNode.setInput('x', 25)
      dispatchNode.setInput('y', 40)
      dispatchNode.setInput('trigger', true)

      expect(resultCaptured).toEqual({
        success: true,
        newX: 50,
        newY: 80,
      })
    })
  })

  describe('StructCommand with Multiple Component Requirements (requires(Position, Health))', () => {
    const DamageAtPositionCommand = createStructCommand(
      'DamageAtPositionCommand',
      requires(Position, Health),
      s.number(),
    )

    beforeEach(() => {
      commandRegistry.register({
        name: 'DamageAtPositionCommand',
        commandClass: DamageAtPositionCommand,
      })
    })

    it('derives ports for both components and handles multi-component entity', () => {
      const handlerNode = createCommandHandlerNode(
        {
          initialData: { commandName: 'DamageAtPositionCommand' },
        },
        { commandBus, commandRegistry },
      )

      expect(handlerNode.getOutputsSchema()).toHaveProperty('position')
      expect(handlerNode.getOutputsSchema()).toHaveProperty('health')
      expect(handlerNode.getOutputsSchema()).toHaveProperty('position_x')
      expect(handlerNode.getOutputsSchema()).toHaveProperty('health_hp')

      let capturedData: any = null
      let capturedHp = 0

      handlerNode.subscribe((port, val) => {
        if (port === 'data') capturedData = val
        if (port === 'health_hp') capturedHp = val as number
      })

      const hero = {
        id: 'paladin_1',
        position: { x: 10, y: 20 },
        health: { hp: 95 },
      }

      commandBus.execute(new DamageAtPositionCommand(hero))

      expect(capturedData).toEqual({
        position: { x: 10, y: 20 },
        health: { hp: 95 },
      })
      expect(capturedHp).toBe(95)

      handlerNode.destroy()
    })
  })

  describe('StructEvent with Component Requirements (requires(Position))', () => {
    const EntityMovedEvent = createStructEvent('EntityMovedEvent', eventRequires(Position))

    beforeEach(() => {
      eventRegistry.register({
        name: 'EntityMovedEvent',
        eventClass: EntityMovedEvent,
      })
    })

    it('EventNode in listen mode receives StructEvent and emits unrolled component fields', () => {
      const listenNode = createEventNode(
        {
          initialData: { eventName: 'EntityMovedEvent', mode: 'listen' },
        },
        { eventBus, eventRegistry },
      )

      expect(listenNode.getOutputsSchema()).toHaveProperty('position')
      expect(listenNode.getOutputsSchema()).toHaveProperty('x')
      expect(listenNode.getOutputsSchema()).toHaveProperty('y')

      let capturedX = 0
      let capturedY = 0

      listenNode.subscribe((port, val) => {
        if (port === 'x') capturedX = val as number
        if (port === 'y') capturedY = val as number
      })

      eventBus.emitByName('EntityMovedEvent', { x: 88, y: 99 })

      expect(capturedX).toBe(88)
      expect(capturedY).toBe(99)

      listenNode.destroy()
    })

    it('EventNode in emit mode constructs and publishes StructEvent', () => {
      const emitNode = createEventNode(
        {
          initialData: { eventName: 'EntityMovedEvent', mode: 'emit' },
        },
        { eventBus, eventRegistry },
      )

      let busCaptured: any = null
      eventBus.on(EntityMovedEvent as any, (payload) => {
        busCaptured = payload
      })

      emitNode.setInput('entity', { position: { x: 42, y: 77 } })
      emitNode.setInput('trigger', true)

      expect(emitNode.getOutput('success')).toBe(true)
      expect(busCaptured).toEqual({ x: 42, y: 77 })

      emitNode.destroy()
    })
  })

  describe('End-to-End BaseGraph Pipeline', () => {
    it('executes a complete visual graph with Math nodes feeding into CommandDispatch and returning from CommandHandler', () => {
      const MoveCommand = createStructCommand(
        'MoveCommand',
        requires(Position),
        s.number(),
      )

      commandRegistry.register({
        name: 'MoveCommand',
        commandClass: MoveCommand,
      })

      // Setup Server/Graph 1: Command Handler pipeline
      const handlerGraph = new BaseGraph()
      const handler = new CommandHandlerNodeEngine(
        { id: 'handler', initialData: { commandName: 'MoveCommand' } },
        { commandBus, commandRegistry },
      )
      const math = createMathNode({ id: 'math_calc' })
      math.data.operator = 'ADD'
      math.data.b = 50 // Adds 50 to X position

      handlerGraph.addNode(handler)
      handlerGraph.addNode(math)

      handlerGraph.addEdge('handler:x', 'math_calc:a')
      handlerGraph.addEdge('math_calc:result', 'handler:result')

      // Setup Client/Graph 2: Command Dispatch pipeline
      const dispatchGraph = new BaseGraph()
      const dispatch = new CommandDispatchNodeEngine(
        { id: 'dispatch', initialData: { commandName: 'MoveCommand' } },
        { commandBus, commandRegistry },
      )
      dispatchGraph.addNode(dispatch)

      // Feed Goblin position { x: 30, y: 100 } into dispatch node
      dispatch.setInput('entity', {
        id: 'goblin_runner',
        position: { x: 30, y: 100 },
      })
      dispatch.setInput('trigger', true)

      // Handler graph processed the command: x (30) + 50 = 80
      expect(dispatch.getOutput('success')).toBe(true)
      expect(dispatch.getOutput('result')).toBe(80)

      handler.destroy()
    })
  })
})
