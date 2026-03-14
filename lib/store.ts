import { MindNode, NodeType, Priority, ViewMode } from './types'

let _id = 10
const gid = () => `n${++_id}`

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
  view: ViewMode
  ctx: ContextMenu | null
  panX: number
  panY: number
  dragId: string | null
  dropId: string | null
  newNodeId: string | null   // triggers focus-title in detail panel
}

export const initialState: AppState = {
  nodes: INITIAL_NODES,
  rootId: ROOT,
  selectedId: null,
  view: 'mindmap',
  ctx: null,
  panX: 0,
  panY: 0,
  dragId: null,
  dropId: null,
  newNodeId: null,
}

export type Action =
  | { type: 'SELECT'; id: string | null }
  | { type: 'ADD_CHILD'; parentId: string }
  | { type: 'ADD_SIBLING'; nodeId: string }
  | { type: 'DELETE'; nodeId: string }
  | { type: 'UPDATE'; nodeId: string; patch: Partial<Pick<MindNode, 'title' | 'description' | 'type' | 'priority'>> }
  | { type: 'SET_VIEW'; view: ViewMode }
  | { type: 'OPEN_CTX'; x: number; y: number; nodeId: string }
  | { type: 'CLOSE_CTX' }
  | { type: 'SET_PAN'; dx: number; dy: number }
  | { type: 'DRAG_START'; nodeId: string }
  | { type: 'DRAG_OVER'; nodeId: string | null }
  | { type: 'REPARENT'; nodeId: string; newParentId: string }
  | { type: 'CLEAR_NEW' }

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'SELECT':
      return { ...s, selectedId: a.id, ctx: null }

    case 'ADD_CHILD': {
      const id = gid()
      const parent = s.nodes[a.parentId]
      if (!parent) return s
      return {
        ...s,
        nodes: {
          ...s.nodes,
          [id]: node(id, '新节点', 'task', a.parentId),
          [a.parentId]: { ...parent, children: [...parent.children, id] },
        },
        selectedId: id,
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
          [id]: node(id, '新节点', n.type, n.parentId),
          [n.parentId]: { ...parent, children },
        },
        selectedId: id,
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
        ctx: null,
      }
    }

    case 'UPDATE': {
      const n = s.nodes[a.nodeId]
      if (!n) return s
      return { ...s, nodes: { ...s.nodes, [a.nodeId]: { ...n, ...a.patch } } }
    }

    case 'SET_VIEW': return { ...s, view: a.view }

    case 'OPEN_CTX':
      return { ...s, ctx: { x: a.x, y: a.y, nodeId: a.nodeId }, selectedId: a.nodeId }

    case 'CLOSE_CTX': return { ...s, ctx: null }

    case 'SET_PAN':
      return { ...s, panX: s.panX + a.dx, panY: s.panY + a.dy }

    case 'DRAG_START': return { ...s, dragId: a.nodeId, dropId: null }

    case 'DRAG_OVER': return { ...s, dropId: a.nodeId }

    case 'REPARENT': {
      const { nodeId, newParentId } = a
      const n = s.nodes[nodeId]
      if (!n || !n.parentId || nodeId === newParentId) return s
      const isDesc = (pid: string, cid: string): boolean => {
        const p = s.nodes[pid]
        if (!p) return false
        return p.children.includes(cid) || p.children.some(c => isDesc(c, cid))
      }
      if (isDesc(nodeId, newParentId)) return s
      const oldParent = s.nodes[n.parentId]
      const newParent = s.nodes[newParentId]
      if (!oldParent || !newParent) return s
      return {
        ...s,
        nodes: {
          ...s.nodes,
          [nodeId]: { ...n, parentId: newParentId },
          [n.parentId]: { ...oldParent, children: oldParent.children.filter(c => c !== nodeId) },
          [newParentId]: { ...newParent, children: [...newParent.children, nodeId] },
        },
        dragId: null,
        dropId: null,
      }
    }

    case 'CLEAR_NEW': return { ...s, newNodeId: null }

    default: return s
  }
}
