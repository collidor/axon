/**
 * Canonical port identifier utilities for Axon graphs.
 * Formatted as `${nodeId}:${portName}`.
 */

export interface ParsedPortId {
  nodeId: string
  portName: string
}

/**
 * Parses a compound port endpoint (e.g. 'node-1:result') into its constituent parts.
 */
export function parsePortId(portId: string): ParsedPortId {
  if (!portId) {
    return { nodeId: '', portName: 'default' }
  }
  const colonIndex = portId.indexOf(':')
  if (colonIndex === -1) {
    return { nodeId: portId, portName: 'default' }
  }
  return {
    nodeId: portId.slice(0, colonIndex),
    portName: portId.slice(colonIndex + 1),
  }
}

/**
 * Formats a node ID and port name into a canonical port ID string.
 */
export function formatPortId(nodeId: string, portName: string): string {
  return `${nodeId}:${portName}`
}

/**
 * Extracts just the node ID from an endpoint string.
 */
export function getNodeIdFromPortId(portId: string): string {
  const colonIndex = portId.indexOf(':')
  return colonIndex === -1 ? portId : portId.slice(0, colonIndex)
}

/**
 * Extracts just the port name from an endpoint string.
 */
export function getPortNameFromPortId(portId: string): string {
  const colonIndex = portId.indexOf(':')
  return colonIndex === -1 ? 'default' : portId.slice(colonIndex + 1)
}
