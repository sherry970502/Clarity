import { MindNode, NodeType, NodeTypeDef, Priority, Status, ViewMode } from './types'
import { TEMPLATES } from './templates'

const DEFAULT_CUSTOM_TYPES: NodeTypeDef[] = TEMPLATES[0].types

const gid = () => `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

function node(id: string, title: string, type: NodeType, parentId: string | null, children: string[] = [], priority: Priority | null = null): MindNode {
  return { id, title, description: '', type, priority, children, parentId }
}

const ROOT = 'root'
const [d1, d2, d3] = [gid(), gid(), gid()]
const [g1, g2, g3] = [gid(), gid(), gid()]
const [t1, t2, t3, t4] = [gid(), gid(), gid(), gid()]
const [i1, i2] = [gid(), gid()]
const [p1] = [gid()]

export const INITIAL_NODES: Record<string, MindNode> = {
  [ROOT]: node(ROOT, 'Clarity 战略图', 'dimension', null, [d1, d2, d3]),
  [d1]:   node(d1,  '教育业务',   'dimension', ROOT, [g1, i1], null),
  [d2]:   node(d2,  '游戏业务',   'dimension', ROOT, [g2, p1], null),
  [d3]:   node(d3,  '公司管理',   'dimension', ROOT, [g3, i2], null),
  [g1]:   node(g1,  '上线 MVP',   'goal',      d1,   [t1, t2], 'high'),
  [g2]:   node(g2,  '游戏立项',   'goal',      d2,   [t3],     'medium'),
  [g3]:   node(g3,  '团队扩张',   'goal',      d3,   [t4],     'high'),
  [t1]:   node(t1,  '完成产品设计', 'task',    g1,   [],       'high'),
  [t2]:   node(t2,  '开发注册流程', 'task',    g1,   [],       'medium'),
  [t3]:   node(t3,  '市场调研',   'task',      g2,   [],       'medium'),
  [t4]:   node(t4,  '发布招聘 JD', 'task',    g3,   [],       'low'),
  [i1]:   node(i1,  '用户增长策略', 'issue',   d1,   [],       'medium'),
  [i2]:   node(i2,  '融资节奏规划', 'issue',   d3,   [],       'high'),
  [p1]:   node(p1,  '版权采购评估', 'pending', d2,   [],       'low'),
}

export interface ContextMenu { x: number; y: number; nodeId: string }

export interface AppState {
  nodes: Record<string, MindNode>
  rootId: string
  selectedId: string | null
  selectedIds: string[]
  view: ViewMode
  ctx: ContextMenu | null
  panX: number
  panY: number
  scale: number
  dragId: string | null
  dropId: string | null
  newNodeId: string | null
  collapsedIds: string[]
  customTypes: NodeTypeDef[]
}

export const initialState: AppState = {
  nodes: INITIAL_NODES,
  rootId: ROOT,
  selectedId: null,
  selectedIds: [],
  view: 'mindmap',
  ctx: null,
  panX: 0,
  panY: 0,
  scale: 1,
  dragId: null,
  dropId: null,
  newNodeId: null,
  collapsedIds: [],
  customTypes: DEFAULT_CUSTOM_TYPES,
}

export type Action =
  | { type: 'SELECT'; id: string | null }
  | { type: 'MULTI_SELECT'; id: string }
  | { type: 'BOX_SELECT'; ids: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'ZOOM'; scale: number; panX: number; panY: number }
  | { type: 'ADD_CHILD'; parentId: string }
  | { type: 'ADD_SIBLING'; nodeId: string }
  | { type: 'DELETE'; nodeId: string }
  | { type: 'DELETE_MULTI'; ids: string[] }
  | { type: 'UPDATE'; nodeId: string; patch: Partial<Pick<MindNode, 'title' | 'description' | 'type' | 'priority' | 'status' | 'url' | 'mapLink'>> }
  | { type: 'ADD_CUSTOM_TYPE'; typeDef: NodeTypeDef }
  | { type: 'UPDATE_MULTI'; ids: string[]; patch: Partial<Pick<MindNode, 'type' | 'priority'>> }
  | { type: 'MOVE_UP'; nodeId: string }
  | { type: 'MOVE_DOWN'; nodeId: string }
  | { type: 'SET_VIEW'; view: ViewMode }
  | { type: 'OPEN_CTX'; x: number; y: number; nodeId: string }
  | { type: 'CLOSE_CTX' }
  | { type: 'SET_PAN'; dx: number; dy: number }
  | { type: 'DRAG_START'; nodeId: string }
  | { type: 'DRAG_OVER'; nodeId: string | null }
  | { type: 'DRAG_END' }
  | { type: 'REPARENT'; nodeId: string; newParentId: string }
  | { type: 'CLEAR_NEW' }
  | { type: 'TOGGLE_COLLAPSE'; nodeId: string }

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'SELECT':
      return { ...s, selectedId: a.id, selectedIds: a.id ? [a.id] : [], ctx: null }

    case 'MULTI_SELECT': {
      const already = s.selectedIds.includes(a.id)
      const selectedIds = already
        ? s.selectedIds.filter(id => id !== a.id)
        : [...s.selectedIds, a.id]
      const selectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null
      return { ...s, selectedId, selectedIds, ctx: null }
    }

    case 'BOX_SELECT': {
      const selectedId = a.ids.length > 0 ? a.ids[a.ids.length - 1] : null
      return { ...s, selectedIds: a.ids, selectedId, ctx: null }
    }

    case 'CLEAR_SELECTION':
      return { ...s, selectedId: null, selectedIds: [], ctx: null }

    case 'ZOOM':
      return { ...s, scale: a.scale, panX: a.panX, panY: a.panY }

    case 'ADD_CHILD': {
      const id = gid()
      const parent = s.nodes[a.parentId]
      if (!parent) return s
      return {
        ...s,
        nodes: {
          ...s.nodes,
          [id]: node(id, '新节点', '', a.parentId),
          [a.parentId]: { ...parent, children: [...parent.children, id] },
        },
        selectedId: id,
        selectedIds: [id],
        newNodeId: id,
        ctx: null,
      }
    }

    case 'ADD_SIBLING': {
      const n = s.nodes[a.nodeId]
      if (!n || !n.parentId) return s
      const id = gid()
      const parent = s.nodes[n.parentId]
      const idx = parent.children.indexOf(a.nodeId)
      const children = [...parent.children]
      children.splice(idx + 1, 0, id)
      return {
        ...s,
        nodes: {
          ...s.nodes,
          [id]: node(id, '新节点', '', n.parentId),
          [n.parentId]: { ...parent, children },
        },
        selectedId: id,
        selectedIds: [id],
        newNodeId: id,
        ctx: null,
      }
    }

    case 'DELETE': {
      const n = s.nodes[a.nodeId]
      if (!n || !n.parentId) return s
      const toDelete = new Set<string>()
      const collect = (id: string) => {
        toDelete.add(id)
        s.nodes[id]?.children.forEach(collect)
      }
      collect(a.nodeId)
      const newNodes = { ...s.nodes }
      toDelete.forEach(id => delete newNodes[id])
      const parent = newNodes[n.parentId]
      if (parent) newNodes[n.parentId] = { ...parent, children: parent.children.filter(c => c !== a.nodeId) }
      return {
        ...s,
        nodes: newNodes,
        selectedId: toDelete.has(s.selectedId ?? '') ? null : s.selectedId,
        selectedIds: s.selectedIds.filter(id => !toDelete.has(id)),
        ctx: null,
      }
    }

    case 'DELETE_MULTI': {
      const toDelete = new Set<string>()
      const collect = (id: string) => {
        toDelete.add(id)
        s.nodes[id]?.children.forEach(collect)
      }
      // Only delete non-root nodes
      a.ids.filter(id => s.nodes[id]?.parentId).forEach(collect)
      const newNodes = { ...s.nodes }
      toDelete.forEach(id => {
        const n = newNodes[id]
        if (n?.parentId && newNodes[n.parentId]) {
          newNodes[n.parentId] = { ...newNodes[n.parentId], children: newNodes[n.parentId].children.filter(c => c !== id) }
        }
        delete newNodes[id]
      })
      return { ...s, nodes: newNodes, selectedId: null, selectedIds: [], ctx: null }
    }

    case 'UPDATE': {
      const n = s.nodes[a.nodeId]
      if (!n) return s
      return { ...s, nodes: { ...s.nodes, [a.nodeId]: { ...n, ...a.patch } } }
    }

    case 'UPDATE_MULTI': {
      const newNodes = { ...s.nodes }
      for (const id of a.ids) {
        if (newNodes[id]) newNodes[id] = { ...newNodes[id], ...a.patch }
      }
      return { ...s, nodes: newNodes }
    }

    case 'MOVE_UP': {
      const n = s.nodes[a.nodeId]
      if (!n || !n.parentId) return s
      const parent = s.nodes[n.parentId]
      const idx = parent.children.indexOf(a.nodeId)
      if (idx <= 0) return s
      const children = [...parent.children]
      ;[children[idx - 1], children[idx]] = [children[idx], children[idx - 1]]
      return { ...s, nodes: { ...s.nodes, [n.parentId]: { ...parent, children } }, ctx: null }
    }

    case 'MOVE_DOWN': {
      const n = s.nodes[a.nodeId]
      if (!n || !n.parentId) return s
      const parent = s.nodes[n.parentId]
      const idx = parent.children.indexOf(a.nodeId)
      if (idx >= parent.children.length - 1) return s
      const children = [...parent.children]
      ;[children[idx], children[idx + 1]] = [children[idx + 1], children[idx]]
      return { ...s, nodes: { ...s.nodes, [n.parentId]: { ...parent, children } }, ctx: null }
    }

    case 'SET_VIEW': return { ...s, view: a.view }

    case 'OPEN_CTX':
      return { ...s, ctx: { x: a.x, y: a.y, nodeId: a.nodeId }, selectedId: a.nodeId, selectedIds: s.selectedIds.includes(a.nodeId) ? s.selectedIds : [a.nodeId] }

    case 'CLOSE_CTX': return { ...s, ctx: null }

    case 'SET_PAN':
      return { ...s, panX: s.panX + a.dx, panY: s.panY + a.dy }

    case 'DRAG_START': return { ...s, dragId: a.nodeId, dropId: null }

    case 'DRAG_OVER': return { ...s, dropId: a.nodeId }

    case 'DRAG_END': return { ...s, dragId: null, dropId: null }

    case 'REPARENT': {
      const { nodeId, newParentId } = a
      const n = s.nodes[nodeId]
      if (!n || !n.parentId || nodeId === newParentId || n.parentId === newParentId) return s
      const isDesc = (pid: string, cid: string): boolean => {
        const p = s.nodes[pid]
        if (!p) return false
        return p.children.includes(cid) || p.children.some(c => isDesc(c, cid))
      }
      if (isDesc(nodeId, newParentId)) return s
      const newParent = s.nodes[newParentId]
      if (!newParent) return s
      // Remove nodeId from every node that has it as a child (defensive, handles any stale refs)
      const cleaned: Record<string, MindNode> = {}
      for (const [id, node] of Object.entries(s.nodes)) {
        cleaned[id] = node.children.includes(nodeId)
          ? { ...node, children: node.children.filter(c => c !== nodeId) }
          : node
      }
      return {
        ...s,
        nodes: {
          ...cleaned,
          [nodeId]: { ...n, parentId: newParentId },
          [newParentId]: { ...cleaned[newParentId], children: [...cleaned[newParentId].children, nodeId] },
        },
        dragId: null,
        dropId: null,
      }
    }

    case 'ADD_CUSTOM_TYPE': {
      const already = s.customTypes.some(t => t.id === a.typeDef.id)
      if (already) return s
      return { ...s, customTypes: [...s.customTypes, a.typeDef] }
    }

    case 'CLEAR_NEW': return { ...s, newNodeId: null }

    case 'TOGGLE_COLLAPSE': {
      const already = s.collapsedIds.includes(a.nodeId)
      return { ...s, collapsedIds: already ? s.collapsedIds.filter(id => id !== a.nodeId) : [...s.collapsedIds, a.nodeId] }
    }

    default: return s
  }
}
