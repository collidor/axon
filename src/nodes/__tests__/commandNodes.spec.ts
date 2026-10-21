// oxlint-disable typescript/no-explicit-any
import { describe, it, expect, beforeEach } from 'vitest'
import { CommandBus, CommandHistoryManager } from '@collidor/command'
import { s } from '@collidor/struct'
import { BaseGraph } from '../../core/base.graph'
import {
  CommandHandlerNodeEngine,
  createCommandHandlerNode,
  registerGraphAsCommandHandler,
} from '../commandHandler.node'
import { createCommandDispatchNode } from '../commandDispatch.node'
import {
  defaultCommandRegistry,
  createAppCommand,
  DealDamageCommand,
  HealTargetCommand,
} from '../../commands/commandRegistry'
import { createMathNode } from '../math.node'
import { NODE_TYPES } from '../nodes.constants'
import type { SerializedGraph } from '../../core/serialization'
import { registerCoreNodes } from '../nodeLibrary'

describe('Axon App-Level Command Integration: Handler & Dispatch Nodes', () => {
  let bus: CommandBus

  beforeEach(() => {
    bus = new CommandBus()
    registerCoreNodes()
  })

  it('CommandHandlerNode registers handler on creation, receives struct data, and unregisters on disposal', () => {
    const handlerNode = createCommandHandlerNode(
      {
        initialData: { commandName: 'DealDamageCommand' },
      },
      { commandBus: bus, commandRegistry: defaultCommandRegistry },
    )

    // Verify handler is registered on bus
    expect(bus.handlers.has('DealDamageCommand')).toBe(true)

    let capturedTrigger = false
    let capturedData: any = null
    let capturedAmount: number | undefined
    let capturedTargetId: string | undefined

    handlerNode.subscribe((name, val) => {
      if (name === 'trigger') capturedTrigger = Boolean(val)
      if (name === 'data') capturedData = val
      if (name === 'amount') capturedAmount = val as number
      if (name === 'targetId') capturedTargetId = val as string
    })

    // Execute app-level DealDamageCommand on bus
    const cmd = new DealDamageCommand({
      attackerId: 'hero_1',
      targetId: 'goblin_4',
      amount: 45,
      damageType: 'FIRE',
    })
    const res = bus.execute(cmd)

    expect(capturedTrigger).toBe(true)
    expect(capturedData.attackerId).toBe('hero_1')
    expect(capturedAmount).toBe(45)
    expect(capturedTargetId).toBe('goblin_4')
    expect(res).toEqual(cmd.data)

    // Destroy node -> automatically unregisters from bus
    handlerNode.destroy()
    expect(bus.handlers.has('DealDamageCommand')).toBe(false)
  })

  it('CommandHandlerNode returns result from downstream graph nodes when result input is supplied', () => {
    const graph = new BaseGraph()

    const handler = new CommandHandlerNodeEngine(
      { id: 'cmd_handler', initialData: { commandName: 'DealDamageCommand' } },
      { commandBus: bus, commandRegistry: defaultCommandRegistry },
    )
    const math = createMathNode({ id: 'math_mult' })
    math.data.operator = 'MULTIPLY'
    math.data.b = 2 // Double damage

    graph.addNode(handler)
    graph.addNode(math)

    // Connect handler:amount -> math:a
    graph.addEdge('cmd_handler:amount', 'math_mult:a')
    // Connect math:result -> handler:result
    graph.addEdge('math_mult:result', 'cmd_handler:result')

    const cmd = new DealDamageCommand({
      attackerId: 'mage_1',
      targetId: 'boss_1',
      amount: 30,
      damageType: 'LIGHTNING',
    })
    const res = bus.execute(cmd)

    // math doubled 30 to 60, fed into handler result
    expect(res).toBe(60)

    // Clean up
    handler.destroy()
    expect(bus.handlers.has('DealDamageCommand')).toBe(false)
  })

  it('CommandDispatchNode dispatches app-level commands to CommandBus and captures output results', () => {
    // Register app-level HealTargetCommand handler
    bus.register(HealTargetCommand, (cmd) => {
      return {
        healed: cmd.data.amount,
        remainingHp: 100 + cmd.data.amount,
      }
    })

    const dispatchNode = createCommandDispatchNode(
      {
        initialData: {
          commandName: 'HealTargetCommand',
          payload: { targetId: 'cleric_1' },
        },
      },
      { commandBus: bus, commandRegistry: defaultCommandRegistry },
    )

    let capturedResult: any = null
    let capturedSuccess = false

    dispatchNode.subscribe((name, res) => {
      if (name === 'result') capturedResult = res
      if (name === 'success') capturedSuccess = Boolean(res)
    })

    // Trigger dispatch with amount 25
    dispatchNode.setInput('amount', 25)
    dispatchNode.setInput('trigger', true)

    expect(capturedSuccess).toBe(true)
    expect(capturedResult).toEqual({
      healed: 25,
      remainingHp: 125,
    })
  })

  it('CommandDispatchNode supports history tracking with CommandHistoryManager', () => {
    const historyManager = new CommandHistoryManager()
    historyManager.registerBus(bus, 'dispatch-test-bus')

    bus.register(DealDamageCommand, (cmd) => cmd.data.amount * 10)

    const dispatchNode = createCommandDispatchNode(
      {
        initialData: {
          commandName: 'DealDamageCommand',
          payload: {
            attackerId: 'warrior_1',
            targetId: 'orc_1',
            amount: 7,
            damageType: 'PHYSICAL',
          },
          useHistory: true,
        },
      },
      { commandBus: bus, commandRegistry: defaultCommandRegistry, historyManager },
    )

    dispatchNode.setInput('trigger', true)

    expect(dispatchNode.getOutput('result')).toBe(70)
    expect(historyManager.canUndo).toBe(true)
    expect(historyManager.undoCount).toBe(1)
  })

  it('Supports custom app-level commands defined with createAppCommand and structs', () => {
    const { commandClass, definition } = createAppCommand(
      'CraftItemCommand',
      s.struct({
        crafterId: s.string(),
        recipeId: s.string(),
        materialCount: s.integer().default(5),
      }),
      { label: 'Craft Item' },
    )

    defaultCommandRegistry.register(definition)

    const handlerNode = createCommandHandlerNode(
      {
        initialData: { commandName: 'CraftItemCommand' },
      },
      { commandBus: bus, commandRegistry: defaultCommandRegistry },
    )

    expect(handlerNode.getOutputsSchema()).toHaveProperty('recipeId')
    expect(handlerNode.getOutputsSchema()).toHaveProperty('materialCount')

    const cmd = new commandClass({
      crafterId: 'blacksmith_1',
      recipeId: 'iron_sword',
      materialCount: 3,
    })
    const res = bus.execute(cmd)

    expect(res.recipeId).toBe('iron_sword')
    expect(res.materialCount).toBe(3)

    handlerNode.destroy()
    defaultCommandRegistry.unregister('CraftItemCommand')
  })

  it('registerGraphAsCommandHandler allows an entire SerializedGraph to handle an app-level command', async () => {
    const serialized: SerializedGraph = {
      nodes: [
        {
          id: 'calc_math',
          type: NODE_TYPES.MATH,
          x: 100,
          y: 100,
          data: { b: 15, operator: 'ADD' },
        },
      ],
      edges: [],
    }

    const unbind = registerGraphAsCommandHandler(bus, DealDamageCommand, serialized, {
      inputNodeId: 'calc_math',
      inputMapping: { amount: 'a' },
      resultPort: 'calc_math:result',
    })

    const res = bus.execute(
      new DealDamageCommand({
        attackerId: 'archer_1',
        targetId: 'boss_2',
        amount: 20,
        damageType: 'PHYSICAL',
      }),
    )
    expect(res).toBe(35) // 20 + 15

    unbind()
    expect(bus.handlers.has('DealDamageCommand')).toBe(false)
  })
})
