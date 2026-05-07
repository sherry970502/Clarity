'use client'
import { useState, useMemo } from 'react'
import { MindNode, NodeTypeDef, Priority, Status, getTypeMeta, PRIORITY_META, STATUS_META } from '@/lib/types'

const PRIORITY_ORDER: (Priority | null)[] = ['high', 'medium', 'low', null]

type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done'

interface Props {
  nodes: Record<string, MindNode>
  rootId: string
  customTypes: NodeTypeDef[]
  onSelect: (id: string) => void
  onUpdateStatus: (id: string, status?: Status) => void
}

function findAncestorPath(nodes: Record<string, MindNode>, id: string, rootId: string): string | null {
  const path: string[] = []
  let cur = nodes[id]?.parentId
  while (cur && cur !== rootId) {
    const n = nodes[cur]
    if (!n) break
    path.unshift(n.title)
    cur = n.parentId
  }
  return path.length > 0 ? path.join(' / ') : null
}

function isUnderDimension(nodes: Record<string, MindNode>, nodeId: string, dimId: string): boolean {
  let cur = nodes[nodeId]?.parentId ?? null
  while (cur) {
    if (cur === dimId) return true
    cur = nodes[cur]?.parentId ?? null
  }
  return false
}

function cycleStatus(s?: Status): Status | undefined {
  if (!s) return 'in_progress'
  if (s === 'in_progress') return 'done'
  return undefined
}

const STATUS_OPTIONS: { value: FilterStatus; label: string; color?: string }[] = [
  { value: 'all',         label: '全部' },
  { value: 'todo',        label: '未开始' },
  { value: 'in_progress', label: '进行中', color: '#3B82F6' },
  { value: 'done',        label: '已完成', color: '#22C55E' },
]

function Chip({ label, active, color, count, onClick }: {
  label: string; active: boolean; color?: string; count?: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 20, border: 'none',
        fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
        fontWeight: active ? 600 : 400,
        background: active ? (color ?? '#4F46E5') : '#E2E8F0',
        color: active ? '#fff' : '#64748B',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 10,
          background: active ? 'rgba(255,255,255,0.25)' : '#CBD5E1',
          color: active ? '#fff' : '#64748B',
          borderRadius: 10, padding: '0 5px', lineHeight: '16px',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

export function TaskList({ nodes, rootId, customTypes, onSelect, onUpdateStatus }: Props) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterDimension, setFilterDimension] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Collect dimension nodes in DFS order, excluding root
  const dimensionNodes = useMemo(() => {
    const result: MindNode[] = []
    const dfs = (id: string) => {
      const n = nodes[id]
      if (!n) return
      if (n.type === 'dimension' && id !== rootId) result.push(n)
      for (const childId of n.children) dfs(childId)
    }
    dfs(rootId)
    return result
  }, [nodes, rootId])

  // Group all non-dimension nodes by type
  const listTypes = customTypes.filter(t => t.id !== 'dimension')
  const byType: Record<string, MindNode[]> = {}
  for (const t of listTypes) byType[t.id] = []
  for (const n of Object.values(nodes)) {
    if (n.type === 'dimension' || !n.parentId) continue
    if (!byType[n.type]) byType[n.type] = []
    byType[n.type].push(n)
  }
  const allTypeIds = [...new Set([
    ...listTypes.map(t => t.id),
    ...Object.keys(byType).filter(k => byType[k].length > 0),
  ])]

  // Sort: in_progress → todo → done, then by priority
  function statusOrder(s?: Status): number { return s === 'in_progress' ? 0 : !s ? 1 : 2 }
  for (const id of allTypeIds) {
    byType[id]?.sort((a, b) => {
      const oa = statusOrder(a.status), ob = statusOrder(b.status)
      if (oa !== ob) return oa - ob
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    })
  }

  // Combined filter
  const matchesNode = (n: MindNode) => {
    if (filterStatus === 'todo' && n.status) return false
    if (filterStatus === 'in_progress' && n.status !== 'in_progress') return false
    if (filterStatus === 'done' && n.status !== 'done') return false
    if (filterDimension !== 'all' && !isUnderDimension(nodes, n.id, filterDimension)) return false
    return true
  }

  // Type chip counts reflect current dimension+status filter
  const typeCounts = Object.fromEntries(
    allTypeIds.map(id => [id, (byType[id] ?? []).filter(matchesNode).length])
  )

  const showFlat = filterType !== 'all'
  const flatItems = showFlat ? (byType[filterType] ?? []).filter(matchesNode) : []
  const hasAny = showFlat
    ? flatItems.length > 0
    : allTypeIds.some(id => typeCounts[id] > 0)

  const dimMeta = getTypeMeta('dimension', customTypes)

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '28px 40px',
      background: '#F8FAFC', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Dimension filter */}
        {dimensionNodes.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 2, flexShrink: 0 }}>维度</span>
            <Chip
              label="全部"
              active={filterDimension === 'all'}
              onClick={() => setFilterDimension('all')}
            />
            {dimensionNodes.map(d => (
              <Chip
                key={d.id}
                label={d.title}
                active={filterDimension === d.id}
                color={dimMeta.color}
                onClick={() => setFilterDimension(filterDimension === d.id ? 'all' : d.id)}
              />
            ))}
          </div>
        )}

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 2, flexShrink: 0 }}>类型</span>
          <Chip
            label="全部"
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          />
          {allTypeIds.filter(id => (byType[id] ?? []).length > 0).map(id => {
            const meta = getTypeMeta(id, customTypes)
            return (
              <Chip
                key={id}
                label={meta.label}
                active={filterType === id}
                color={meta.color}
                count={typeCounts[id]}
                onClick={() => setFilterType(filterType === id ? 'all' : id)}
              />
            )
          })}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 2, flexShrink: 0 }}>状态</span>
          {STATUS_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={filterStatus === opt.value}
              color={opt.color}
              onClick={() => setFilterStatus(opt.value)}
            />
          ))}
        </div>

        {/* Content */}
        {showFlat ? (
          flatItems.map(n => (
            <TaskItem key={n.id} n={n} nodes={nodes} rootId={rootId}
              customTypes={customTypes} onSelect={onSelect} onUpdateStatus={onUpdateStatus} />
          ))
        ) : (
          allTypeIds.map(typeId => {
            const items = (byType[typeId] ?? []).filter(matchesNode)
            if (items.length === 0) return null
            const meta = getTypeMeta(typeId, customTypes)
            return (
              <div key={typeId} style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 2, background: meta.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: meta.color, letterSpacing: '0.04em' }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8', background: '#E2E8F0', borderRadius: 10, padding: '1px 8px' }}>
                    {items.length}
                  </span>
                </div>
                {items.map(n => (
                  <TaskItem key={n.id} n={n} nodes={nodes} rootId={rootId}
                    customTypes={customTypes} onSelect={onSelect} onUpdateStatus={onUpdateStatus} />
                ))}
              </div>
            )
          })
        )}

        {!hasAny && (
          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 13, padding: '60px 0' }}>
            暂无符合条件的节点
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TaskItem ─────────────────────────────────────────────────────────────────

interface TaskItemProps {
  n: MindNode
  nodes: Record<string, MindNode>
  rootId: string
  customTypes: NodeTypeDef[]
  onSelect: (id: string) => void
  onUpdateStatus: (id: string, status?: Status) => void
}

function TaskItem({ n, nodes, rootId, customTypes, onSelect, onUpdateStatus }: TaskItemProps) {
  const meta = getTypeMeta(n.type, customTypes)
  const dim = findAncestorPath(nodes, n.id, rootId)
  const isDone = n.status === 'done'
  const isInProgress = n.status === 'in_progress'
  const statusColor = isDone ? '#22C55E' : isInProgress ? '#3B82F6' : '#D1D5DB'

  return (
    <div
      onClick={() => onSelect(n.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', marginBottom: 4,
        background: '#fff', borderRadius: 8,
        border: '1px solid #E2E8F0',
        cursor: 'pointer', transition: 'box-shadow 0.15s',
        opacity: isDone ? 0.55 : 1,
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div
        onClick={e => { e.stopPropagation(); onUpdateStatus(n.id, cycleStatus(n.status)) }}
        title={n.status ? STATUS_META[n.status].label : '点击标记进行中'}
        style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          border: `1.5px solid ${statusColor}`,
          background: isDone ? '#22C55E' : isInProgress ? '#3B82F6' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {isDone && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
        {isInProgress && <span style={{ color: '#fff', fontSize: 8, lineHeight: 1 }}>▶</span>}
      </div>

      <div style={{ width: 3, height: 32, borderRadius: 2, background: meta.color, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: '#1E293B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {n.title}
        </div>
        {(dim || n.assignee) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
            {dim && <span style={{ fontSize: 11, color: '#94A3B8' }}>{dim}</span>}
            {n.assignee && (
              <span style={{ fontSize: 11, color: '#64748B', background: '#F1F5F9', borderRadius: 4, padding: '0 5px' }}>
                @{n.assignee}
              </span>
            )}
          </div>
        )}
      </div>

      {n.description && (
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} title="有描述" />
      )}

      {n.priority && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_META[n.priority].color, flexShrink: 0 }} />
      )}
    </div>
  )
}
