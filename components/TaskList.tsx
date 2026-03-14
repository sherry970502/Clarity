'use client'
import { MindNode, NodeType, Priority, NODE_TYPE_META, PRIORITY_META } from '@/lib/types'

const LIST_TYPES: NodeType[] = ['goal', 'task', 'issue', 'pending']

const PRIORITY_ORDER: (Priority | null)[] = ['high', 'medium', 'low', null]

interface Props {
  nodes: Record<string, MindNode>
  rootId: string
  onSelect: (id: string) => void
}

function getDimensionAncestor(nodes: Record<string, MindNode>, id: string): string | null {
  let cur = nodes[id]?.parentId
  while (cur) {
    const n = nodes[cur]
    if (!n) break
    if (n.type === 'dimension' && cur !== /* skip root if root is dimension */ Object.values(nodes).find(x => !x.parentId)?.id) {
      return n.title
    }
    cur = n.parentId
  }
  return null
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

export function TaskList({ nodes, rootId, onSelect }: Props) {
  const byType: Record<string, MindNode[]> = {}
  for (const t of LIST_TYPES) byType[t] = []

  for (const n of Object.values(nodes)) {
    if (n.type === 'dimension') continue
    byType[n.type]?.push(n)
  }

  for (const t of LIST_TYPES) {
    byType[t].sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a.priority)
      const bi = PRIORITY_ORDER.indexOf(b.priority)
      return ai - bi
    })
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '32px 40px',
      background: '#F8FAFC', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {LIST_TYPES.map(t => {
          const items = byType[t]
          const meta = NODE_TYPE_META[t]
          return (
            <div key={t} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 3, height: 18, borderRadius: 2, background: meta.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: meta.color, letterSpacing: '0.04em' }}>
                  {meta.label}
                </span>
                <span style={{
                  fontSize: 11, color: '#94A3B8',
                  background: '#E2E8F0', borderRadius: 10,
                  padding: '1px 8px',
                }}>
                  {items.length}
                </span>
              </div>

              {items.length === 0 && (
                <div style={{ fontSize: 13, color: '#CBD5E1', padding: '8px 0 8px 12px' }}>暂无</div>
              )}

              {items.map(n => {
                const dim = findDimension(nodes, n.id, rootId)
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
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    {/* Left type bar */}
                    <div style={{ width: 3, height: 32, borderRadius: 2, background: meta.color, flexShrink: 0 }} />

                    {/* Title + dimension */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#1E293B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.title}
                      </div>
                      {dim && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                          {dim}
                        </div>
                      )}
                    </div>

                    {/* Description dot */}
                    {n.description && (
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} title="有描述" />
                    )}

                    {/* Priority */}
                    {n.priority && (
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: PRIORITY_META[n.priority].color,
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
