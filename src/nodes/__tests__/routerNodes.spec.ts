// oxlint-disable typescript/no-explicit-any
import { describe, it, expect } from 'vitest'
import {
  createRouteMatchNode,
  createRouteGuardNode,
  createRouteRenderNode,
  createNavigateNode,
  createRoutePushNode,
  createRoutePopNode,
  createRouteRewriteNode,
  createChangePageNode,
  createSetQueryParamNode,
  createSetQueryParamsNode,
} from '../routing/router.engine'

describe('Router Node Engines', () => {
  it('RouteMatchNode matches parameterized route paths and emits extracted params', () => {
    const node = createRouteMatchNode({
      initialData: {
        path: '/characters/:characterId',
        name: 'CharacterDetails',
      },
    })

    node.setInput('incomingPath', '/characters/42')

    expect(node.getOutput('matched')).toBe(true)
    expect(node.getOutput('characterId')).toBe('42')
    expect(node.getOutput('params')).toEqual({ characterId: '42' })
  })

  it('RouteGuardNode validates permissions and emits allow or redirect', () => {
    const guard = createRouteGuardNode({
      initialData: {
        requiredRole: 'admin',
        redirectTo: '/login',
      },
    })

    // Fail case: role is player
    guard.setInput('userRole', 'player')
    guard.setInput('trigger', true)

    expect(guard.getOutput('allow')).toBe(false)
    expect(guard.getOutput('redirect')).toBe(true)
    expect(guard.getOutput('redirectPath')).toBe('/login')

    // Pass case: role is admin
    guard.setInput('userRole', 'admin')
    guard.setInput('trigger', true)

    expect(guard.getOutput('allow')).toBe(true)
    expect(guard.getOutput('redirect')).toBe(false)
  })

  it('RouteRenderNode renders screen with bound data', () => {
    const renderNode = createRouteRenderNode({
      initialData: {
        layout: 'sidebar',
        screenTitle: 'Character Details View',
      },
    })

    renderNode.setInput('record', { name: 'Valeros', level: 5 })

    expect(renderNode.getOutput('rendered')).toBe(true)
    expect(renderNode.getOutput('activeLayout')).toBe('sidebar')
    expect(renderNode.getOutput('boundData')).toEqual({ name: 'Valeros', level: 5 })
  })

  it('NavigateNode invokes runtime.navigateTo on trigger', () => {
    let navigatedTo: string | null = null
    const mockRuntime = {
      navigateTo: (p: string) => {
        navigatedTo = p
        return true
      },
    }

    const navNode = createNavigateNode(
      {
        initialData: {
          targetPath: '/inventory',
        },
      },
      { runtime: mockRuntime },
    )

    navNode.setInput('trigger', true)

    expect(navigatedTo).toBe('/inventory')
    expect(navNode.getOutput('completed')).toBe(true)
  })

  it('RoutePushNode invokes runtime.push with path, params and query', () => {
    let pushTarget: string | null = null
    let pushOptions: any = null
    const mockRuntime = {
      push: (p: string, opts: any) => {
        pushTarget = p
        pushOptions = opts
        return true
      },
    }

    const pushNode = createRoutePushNode(
      {
        initialData: {
          targetPath: '/spells',
        },
      },
      { runtime: mockRuntime },
    )

    pushNode.setInput('path', '/spells/fireball')
    pushNode.setInput('params', { spellId: 'fireball' })
    pushNode.setInput('query', { level: 3 })
    pushNode.setInput('trigger', true)

    expect(pushTarget).toBe('/spells/fireball')
    expect(pushOptions).toEqual({ params: { spellId: 'fireball' }, query: { level: 3 } })
    expect(pushNode.getOutput('destination')).toBe('/spells/fireball')
    expect(pushNode.getOutput('completed')).toBe(true)
  })

  it('RoutePopNode invokes runtime.pop with delta and emits currentPath', () => {
    let poppedDelta: number | null = null
    const mockRuntime = {
      currentRoutePath: '/characters',
      pop: (d: number) => {
        poppedDelta = d
        return true
      },
    }

    const popNode = createRoutePopNode({}, { runtime: mockRuntime })
    popNode.setInput('delta', -2)
    popNode.setInput('trigger', true)

    expect(poppedDelta).toBe(-2)
    expect(popNode.getOutput('delta')).toBe(-2)
    expect(popNode.getOutput('currentPath')).toBe('/characters')
    expect(popNode.getOutput('completed')).toBe(true)
  })

  it('RouteRewriteNode invokes runtime.rewrite with path, params and query', () => {
    let rewriteTarget: string | null = null
    let rewriteOptions: any = null
    const mockRuntime = {
      rewrite: (p: string, opts: any) => {
        rewriteTarget = p
        rewriteOptions = opts
        return true
      },
    }

    const rewriteNode = createRouteRewriteNode(
      {
        initialData: {
          targetPath: '/characters/1',
        },
      },
      { runtime: mockRuntime },
    )

    rewriteNode.setInput('trigger', true)

    expect(rewriteTarget).toBe('/characters/1')
    expect(rewriteOptions).toEqual({ params: {}, query: {} })
    expect(rewriteNode.getOutput('destination')).toBe('/characters/1')
    expect(rewriteNode.getOutput('completed')).toBe(true)
  })

  it('ChangePageNode updates page number and calls runtime.navigateTo', () => {
    let currentQueryState: Record<string, any> = { page: '2', filter: 'undead' }
    let targetPath: string | null = null
    let targetOptions: any = null
    const mockRuntime = {
      currentRoutePath: '/monsters',
      getCurrentRouteMatch: () => ({
        query: currentQueryState,
      }),
      navigateTo: (path: string, opts: any) => {
        targetPath = path
        targetOptions = opts
        if (opts.query) {
          currentQueryState = { ...opts.query }
        }
        return true
      },
    }

    const pageNode = createChangePageNode(
      {
        initialData: {
          paramName: 'page',
        },
      },
      { runtime: mockRuntime },
    )

    // Direct jump to page 5
    pageNode.setInput('page', 5)
    pageNode.setInput('trigger', true)

    expect(targetPath).toBe('/monsters')
    expect(targetOptions).toEqual({
      query: { page: 5, filter: 'undead' },
      replace: false,
    })
    expect(pageNode.getOutput('page')).toBe(5)
    expect(pageNode.getOutput('query')).toEqual({ page: 5, filter: 'undead' })
    expect(pageNode.getOutput('completed')).toBe(true)

    // Relative delta jump (+1 from 5 -> 6)
    pageNode.disconnectInput('page')
    pageNode.setInput('delta', 1)
    pageNode.setInput('trigger', false)
    pageNode.setInput('trigger', true)

    expect(targetOptions.query.page).toBe(6)
    expect(pageNode.getOutput('page')).toBe(6)

    // Negative delta clamped to minimum 1
    pageNode.setInput('delta', -10)
    pageNode.setInput('trigger', false)
    pageNode.setInput('trigger', true)

    expect(targetOptions.query.page).toBe(1)
    expect(pageNode.getOutput('page')).toBe(1)
  })

  it('SetQueryParamNode updates or deletes query param and calls runtime.navigateTo', () => {
    let currentQueryState: Record<string, any> = { school: 'evocation', level: '3' }
    let targetPath: string | null = null
    let targetOptions: any = null
    const mockRuntime = {
      currentRoutePath: '/spells',
      getCurrentRouteMatch: () => ({
        query: currentQueryState,
      }),
      navigateTo: (path: string, opts: any) => {
        targetPath = path
        targetOptions = opts
        if (opts.query) {
          currentQueryState = { ...opts.query }
        }
        return true
      },
    }

    const setParamNode = createSetQueryParamNode(
      {
        initialData: {
          paramName: 'search',
          replace: true,
        },
      },
      { runtime: mockRuntime },
    )

    // Set search='fire'
    setParamNode.setInput('name', 'search')
    setParamNode.setInput('value', 'fire')
    setParamNode.setInput('trigger', true)

    expect(targetPath).toBe('/spells')
    expect(targetOptions).toEqual({
      query: { school: 'evocation', level: '3', search: 'fire' },
      replace: true,
    })
    expect(setParamNode.getOutput('name')).toBe('search')
    expect(setParamNode.getOutput('value')).toBe('fire')
    expect(setParamNode.getOutput('completed')).toBe(true)

    // Clear level parameter (value = '')
    setParamNode.setInput('name', 'level')
    setParamNode.setInput('value', '')
    setParamNode.setInput('trigger', false)
    setParamNode.setInput('trigger', true)

    expect(targetOptions.query).toEqual({ school: 'evocation', search: 'fire' })
    expect(targetOptions.query.level).toBeUndefined()
  })

  it('SetQueryParamsNode batch merges query parameters', () => {
    let targetPath: string | null = null
    let targetOptions: any = null
    const mockRuntime = {
      currentRoutePath: '/inventory',
      getCurrentRouteMatch: () => ({
        query: { tab: 'weapons' },
      }),
      navigateTo: (path: string, opts: any) => {
        targetPath = path
        targetOptions = opts
        return true
      },
    }

    const batchNode = createSetQueryParamsNode(
      {
        initialData: { replace: false },
      },
      { runtime: mockRuntime },
    )

    batchNode.setInput('query', { sort: 'name', order: 'asc', tab: 'armor' })
    batchNode.setInput('trigger', true)

    expect(targetPath).toBe('/inventory')
    expect(targetOptions).toEqual({
      query: { sort: 'name', order: 'asc', tab: 'armor' },
      replace: false,
    })
    expect(batchNode.getOutput('queryParams')).toEqual({
      sort: 'name',
      order: 'asc',
      tab: 'armor',
    })
    expect(batchNode.getOutput('completed')).toBe(true)
  })
})
