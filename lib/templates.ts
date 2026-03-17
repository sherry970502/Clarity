import { NodeTypeDef } from './types'

export interface Template {
  id: string
  name: string
  description: string
  rootType: string
  types: NodeTypeDef[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'strategy',
    name: '战略管理',
    description: '目标、项目、任务的层级管理',
    rootType: 'dimension',
    types: [
      { id: 'goal',      label: '目标', color: '#E11D48', bg: '#FFF1F2' },
      { id: 'project',   label: '项目', color: '#7C3AED', bg: '#F5F3FF' },
      { id: 'issue',     label: '议题', color: '#D97706', bg: '#FFFBEB', wrapTitle: true },
      { id: 'task',      label: '任务', color: '#059669', bg: '#ECFDF5', wrapTitle: true },
      { id: 'creative',  label: '创意', color: '#0284C7', bg: '#F0F9FF', wrapTitle: true },
      { id: 'pending',   label: '待定', color: '#64748B', bg: '#F8FAFC' },
      { id: 'dimension', label: '维度', color: '#1E293B', bg: '#F1F5F9' },
    ],
  },
  {
    id: 'knowledge',
    name: '知识图谱',
    description: '概念分析与发散思维',
    rootType: 'dimension',
    types: [
      { id: 'kd-dimension', label: '维度',   color: '#1E293B', bg: '#F1F5F9' },
      { id: 'kd-feature',   label: '特征',   color: '#059669', bg: '#ECFDF5', wrapTitle: true },
      { id: 'kd-case',      label: '案例',   color: '#EA580C', bg: '#FFF7ED', wrapTitle: true },
      { id: 'kd-contrast',  label: '对比',   color: '#E11D48', bg: '#FFF1F2', wrapTitle: true },
      { id: 'kd-relation',  label: '关联',   color: '#64748B', bg: '#F8FAFC', wrapTitle: true },
    ],
  },
  {
    id: 'product',
    name: '产品管理',
    description: '面向产品规划与执行的标签体系',
    rootType: 'dimension',
    types: [
      { id: 'ideal',      label: '理想化状态', color: '#E11D48', bg: '#FFF1F2', wrapTitle: true },
      { id: 'midgoal',    label: '中短期目标', color: '#7C3AED', bg: '#F5F3FF', wrapTitle: true },
      { id: 'user',       label: '目标用户',   color: '#0284C7', bg: '#F0F9FF' },
      { id: 'value',      label: '核心价值',   color: '#D97706', bg: '#FFFBEB', wrapTitle: true },
      { id: 'monthly',    label: '月度计划',   color: '#059669', bg: '#ECFDF5' },
      { id: 'affair',     label: '事务',       color: '#64748B', bg: '#F8FAFC', wrapTitle: true },
      { id: 'creative',   label: '创意',       color: '#0284C7', bg: '#F0F9FF', wrapTitle: true },
      { id: 'subproject', label: '子项目',     color: '#EA580C', bg: '#FFF7ED' },
      { id: 'dimension',  label: '维度',       color: '#1E293B', bg: '#F1F5F9' },
    ],
  },
]

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id)
}

// Preset colors for creating custom node types
export const TYPE_COLOR_PRESETS: { color: string; bg: string }[] = [
  { color: '#E11D48', bg: '#FFF1F2' },
  { color: '#7C3AED', bg: '#F5F3FF' },
  { color: '#0284C7', bg: '#F0F9FF' },
  { color: '#D97706', bg: '#FFFBEB' },
  { color: '#059669', bg: '#ECFDF5' },
  { color: '#DB2777', bg: '#FDF2F8' },
  { color: '#EA580C', bg: '#FFF7ED' },
  { color: '#64748B', bg: '#F8FAFC' },
  { color: '#1E293B', bg: '#F1F5F9' },
]
