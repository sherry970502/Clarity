export type NodeType = string  // was union, now open string for custom types
export type Priority = 'high' | 'medium' | 'low'
export type Status = 'done'
export type ViewMode = 'mindmap' | 'list'

export interface NodeTypeDef {
  id: string
  label: string
  color: string
  bg: string
}

export interface MindNode {
  id: string
  title: string
  description: string
  type: string
  priority: Priority | null
  status?: Status   // undefined = 未开始
  url?: string
  mapLink?: string  // 关联的另一张思维导图 ID
  children: string[]
  parentId: string | null
}

// Legacy meta kept for backward compatibility with old node types
export const NODE_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  goal:      { label: '目标', color: '#E11D48', bg: '#FFF1F2' },
  project:   { label: '项目', color: '#7C3AED', bg: '#F5F3FF' },
  issue:     { label: '议题', color: '#D97706', bg: '#FFFBEB' },
  task:      { label: '任务', color: '#059669', bg: '#ECFDF5' },
  pending:   { label: '待定', color: '#64748B', bg: '#F8FAFC' },
  dimension: { label: '维度', color: '#1E293B', bg: '#F1F5F9' },
}

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  done: { label: '已完成', color: '#22C55E' },
}

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high:   { label: '高', color: '#EF4444' },
  medium: { label: '中', color: '#EAB308' },
  low:    { label: '低', color: '#22C55E' },
}

const DEFAULT_TYPE_DEF: NodeTypeDef = { id: 'task', label: '任务', color: '#059669', bg: '#ECFDF5' }

export function getTypeMeta(type: string, customTypes: NodeTypeDef[]): NodeTypeDef {
  const custom = customTypes.find(t => t.id === type)
  if (custom) return custom
  if (NODE_TYPE_META[type]) return { id: type, ...NODE_TYPE_META[type] }
  return DEFAULT_TYPE_DEF
}
