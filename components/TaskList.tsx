'use client'
import { useState } from 'react'
import { MindNode, NodeTypeDef, Priority, Status, getTypeMeta, PRIORITY_META, STATUS_META } from '@/lib/types'

const PRIORITY_ORDER: (Priority | null)[] = ['high', 'medium', 'low', null]

type FilterStatus = 'all' | 'todo' | 'done'

interface Props {
  nodes: Record<string, MindNode>
  rootId: string
  customTypes: NodeTypeDef[]
  onSelect: (id: string) => void
  onUpdateStatus: (id: string, status?: Status) => void
}

function findDimension(nodes: Record<string, MindNode>, id: string, rootId: string): string | null {
  let cur = nodes[id]?.parentId
  while (cur && cur !== rootId) {
    const n = nodes[cur]
    if (!n) break
    if (n.type === 'dimension') return n.title
    cur = n.parentId
  }
  return null
}

function cycleStatus(s?: Status): Status | undefined {
  return s === 'done' ? undefined : 'done'
}

const FILTER_OPTIONS: { value: FilterStatus; label: string; color?: string }[] = [
  { value: 'all',  label: '全部' },
  { value: 'todo', label: '未完成' },
  { value: 'done', label: '已完成', color: '#22C55E' },
]

export function TaskList({ nodes, rootId, customTypes, onSelect, onUpdateStatus }: Props) {
  const [filter, setFilter] = useState<FilterStatus>('all')

  // Non-dimension types from current template
  const listTypes = customTypes.filter(t => t.id !== 'dimension')

  const byType: Record<string, MindNode[]> = {}
  for (const t of listTypes) byType[t.id] = []

  for (const n of Object.values(nodes)) {
    if (n.type === 'dimension' || !n.parentId) continue
    if (byType[n.type] !== undefined) {
      byType[n.type].push(n)
    } else {
      // Node type not in current template list — put it in a catch-all
      const key = n.type
      if (!byType[key]) byType[key] = []
      byType[key].push(n)
    }
  }

  const allTypeIds = [...new Set([...listTypes.map(t => t.id), ...Object.keys(byType).filter(k => byType[k].length > 0)])]

  for (const id of allTypeIds) {
    byType[id]?.sort((a, b) => {
      const doneA = a.status === 'done' ? 1 : 0
      const doneB = b.status === 'done' ? 1 : 0
      if (doneA !== doneB) return doneA - doneB
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    })
  }

  const matchesFilter = (n: MindNode) => {
    if (filter === 'all') return true
    if (filter === 'todo') return !n.status
    return n.status === filter
  }

  const hasAny = allTypeIds.some(id => (byType[id] ?? []).filter(matchesFilter).length > 0)

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '32px 40px',
      background: '#F8FAFC', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none',
                fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: filter === opt.value ? 600 : 400,
                background: filter === opt.value ? (opt.color ?? '#4F46E5') : '#E2E8F0',
                color: filter === opt.value ? '#fff' : '#64748B',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {allTypeIds.map(typeId => {
          const items = (byType[typeId] ?? []).filter(matchesFilter)
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

              {items.map(n => {
                const dim = findDimension(nodes, n.id, rootId)
                const isDone = n.status === 'done'
                return (
                  <div
                    key={n.id}
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
                      title={n.status === 'done' ? STATUS_META.done.label : '标记状态'}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        border: `1.5px solid ${n.status === 'done' ? STATUS_META.done.color : '#D1D5DB'}`,
                        background: n.status === 'done' ? '#22C55E' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {n.status === 'done' && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    </div>

                    <div style={{ width: 3, height: 32, borderRadius: 2, background: meta.color, flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#1E293B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </div>
                      {dim && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{dim}</div>
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
              })}
            </div>
          )
        })}

        {!hasAny && (
          <div style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 13, padding: '60px 0' }}>
            暂无{filter !== 'all' ? FILTER_OPTIONS.find(o => o.value === filter)?.label + '的节点' : '节点'}
          </div>
        )}
      </div>
    </div>
  )
}
