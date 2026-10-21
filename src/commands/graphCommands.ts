// oxlint-disable typescript/no-explicit-any
import { Command } from '@collidor/command'
import type { SerializedGraph, SerializedNode, SerializedEdge } from '../core/serialization'

export class AddNodeCommand extends Command<
  { node: SerializedNode; edges?: SerializedEdge[] },
  SerializedNode
> {}

export class RemoveNodeCommand extends Command<
  { nodeId: string; nodeSnapshot?: SerializedNode; edgeSnapshots?: SerializedEdge[] },
  boolean
> {}

export class MoveNodeCommand extends Command<
  { nodeId: string; fromX: number; fromY: number; toX: number; toY: number },
  boolean
> {}

export class UpdateNodeDataCommand extends Command<
  { nodeId: string; data: Record<string, any>; prevData: Record<string, any> },
  boolean
> {}

export class AddEdgeCommand extends Command<
  { edge: SerializedEdge; displacedEdge?: SerializedEdge },
  SerializedEdge
> {}

export class RemoveEdgeCommand extends Command<{ edge: SerializedEdge }, boolean> {}

export class DuplicateNodeCommand extends Command<
  { originalId: string; clonedNode: SerializedNode },
  SerializedNode
> {}

export class SetGraphCommand extends Command<
  { graph: SerializedGraph; prevGraph?: SerializedGraph },
  boolean
> {}
