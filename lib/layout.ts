import { MindNode } from './types'

export const NODE_W = 210
export const NODE_H = 46
export const H_GAP = 80
export const V_GAP = 14

export interface NodePos { x: number; y: number }

function slotH(nodes: Record<string, MindNode>, id: string): number {
  const n = nodes[id]
  if (!n || n.children.length === 0) return NODE_H + V_GAP
  return n.children.reduce((s, c) => s + slotH(nodes, c), 0)
}

function place(
  nodes: Record<string, MindNode>,
  pos: Record<string, NodePos>,
  id: string,
  x: number,
  cy: number,
) {
  pos[id] = { x, y: cy - NODE_H / 2 }
  const n = nodes[id]
  if (!n || n.children.length === 0) return
  const total = n.children.reduce((s, c) => s + slotH(nodes, c), 0)
  let y = cy - total / 2
  for (const c of n.children) {
    const sh = slotH(nodes, c)
    place(nodes, pos, c, x + NODE_W + H_GAP, y + sh / 2)
    y += sh
  }
}

export function calcLayout(
  nodes: Record<string, MindNode>,
  rootId: string,
): Record<string, NodePos> {
  const pos: Record<string, NodePos> = {}
  const rootSlot = slotH(nodes, rootId)
  place(nodes, pos, rootId, 80, Math.max(rootSlot / 2, 400))
  return pos
}
