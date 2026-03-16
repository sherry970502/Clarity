import { MindNode, NodeTypeDef } from './types'

export const NODE_W = 210
export const NODE_H = 46       // 普通节点高度
export const NODE_H_TALL = 70  // wrapTitle 节点高度（可显示 2 行标题）
export const H_GAP = 80
export const V_GAP = 14

export interface NodePos { x: number; y: number }

// 可用标题宽度 = NODE_W - 左色条(5) - 左右padding(16) - 右侧指示器预留(22) - 缓冲(12)
const TITLE_AVAILABLE_W = NODE_W - 55

// 粗略估算标题渲染宽度（13px 字体）
function estimateTitleWidth(title: string): number {
  let w = 0
  for (const ch of title) {
    const code = ch.charCodeAt(0)
    if (code >= 0x4E00 && code <= 0x9FFF) w += 13      // 中文字符
    else if (code >= 0x3000 && code < 0x4E00) w += 13   // 日文/标点
    else if (ch === ' ') w += 4
    else w += 8                                          // 拉丁字母 / 数字
  }
  return w
}

export function getNodeH(node: MindNode | undefined, customTypes: NodeTypeDef[]): number {
  if (!node) return NODE_H
  const typeDef = customTypes.find(t => t.id === node.type)
  if (!typeDef?.wrapTitle) return NODE_H
  // 只有标题实际会换行时才增高
  return estimateTitleWidth(node.title) > TITLE_AVAILABLE_W ? NODE_H_TALL : NODE_H
}

function slotH(nodes: Record<string, MindNode>, id: string, collapsed: Set<string>, customTypes: NodeTypeDef[]): number {
  const n = nodes[id]
  if (!n || n.children.length === 0 || collapsed.has(id)) return getNodeH(n, customTypes) + V_GAP
  return n.children.reduce((s, c) => s + slotH(nodes, c, collapsed, customTypes), 0)
}

function place(
  nodes: Record<string, MindNode>,
  pos: Record<string, NodePos>,
  id: string,
  x: number,
  cy: number,
  collapsed: Set<string>,
  customTypes: NodeTypeDef[],
) {
  const nodeH = getNodeH(nodes[id], customTypes)
  pos[id] = { x, y: cy - nodeH / 2 }
  const n = nodes[id]
  if (!n || n.children.length === 0 || collapsed.has(id)) return
  const total = n.children.reduce((s, c) => s + slotH(nodes, c, collapsed, customTypes), 0)
  let y = cy - total / 2
  for (const c of n.children) {
    const sh = slotH(nodes, c, collapsed, customTypes)
    place(nodes, pos, c, x + NODE_W + H_GAP, y + sh / 2, collapsed, customTypes)
    y += sh
  }
}

export function calcLayout(
  nodes: Record<string, MindNode>,
  rootId: string,
  collapsedIds: string[] = [],
  customTypes: NodeTypeDef[] = [],
): Record<string, NodePos> {
  const collapsed = new Set(collapsedIds)
  const pos: Record<string, NodePos> = {}
  const rootSlot = slotH(nodes, rootId, collapsed, customTypes)
  place(nodes, pos, rootId, 80, Math.max(rootSlot / 2, 400), collapsed, customTypes)
  return pos
}
