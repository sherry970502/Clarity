export type NodeType = 'goal' | 'issue' | 'task' | 'pending' | 'dimension'
export type Priority = 'high' | 'medium' | 'low'
export type ViewMode = 'mindmap' | 'list'

export interface MindNode {
  id: string
  title: string
  description: string
  type: NodeType
  priority: Priority | null
  children: string[]
  parentId: string | null
}

export const NODE_TYPE_META: Record<NodeType, { label: string; color: string; bg: string }> = {
  goal:      { label: '目标', color: '#4F46E5', bg: '#EEF2FF' },
  issue:     { label: '议题', color: '#D97706', bg: '#FFFBEB' },
  task:      { label: '任务', color: '#059669', bg: '#ECFDF5' },
  pending:   { label: '待定', color: '#64748B', bg: '#F8FAFC' },
  dimension: { label: '维度', color: '#1E293B', bg: '#F1F5F9' },
}

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  high:   { label: '高', color: '#EF4444' },
  medium: { label: '中', color: '#EAB308' },
  low:    { label: '低', color: '#22C55E' },
}
