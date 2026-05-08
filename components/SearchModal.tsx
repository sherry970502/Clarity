'use client'
import { useState, useEffect, useRef } from 'react'
import { MindNode, NodeTypeDef, getTypeMeta } from '@/lib/types'

interface SearchResult {
  nodeId: string
  title: string
  path: string[]
  type: string
  childCount: number
  isCollapsed: boolean
  matchIn: 'title' | 'description'
}

interface Props {
  nodes: Record<string, MindNode>
  rootId: string
  customTypes: NodeTypeDef[]
  collapsedIds: string[]
  onNavigate: (nodeId: string) => void
  onClose: () => void
}

function buildPath(nodeId: string, nodes: Record<string, MindNode>): string[] {
  const path: string[] = []
  let cur = nodes[nodeId]
  while (cur?.parentId) {
    cur = nodes[cur.parentId]
    if (cur) path.unshift(cur.title)
  }
  return path
}

function getResults(
  query: string,
  nodes: Record<string, MindNode>,
  rootId: string,
  collapsedIds: string[],
): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const collapsedSet = new Set(collapsedIds)
  const results: SearchResult[] = []

  for (const [nodeId, node] of Object.entries(nodes)) {
    if (nodeId === rootId) continue
    const titleMatch = node.title.toLowerCase().includes(q)
    const descMatch = node.description.toLowerCase().includes(q)
    if (!titleMatch && !descMatch) continue
    results.push({
      nodeId,
      title: node.title,
      path: buildPath(nodeId, nodes),
      type: node.type,
      childCount: node.children.length,
      isCollapsed: collapsedSet.has(nodeId),
      matchIn: titleMatch ? 'title' : 'description',
    })
  }

  results.sort((a, b) => {
    if (a.matchIn === 'title' && b.matchIn !== 'title') return -1
    if (a.matchIn !== 'title' && b.matchIn === 'title') return 1
    return 0
  })

  return results.slice(0, 20)
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: '#FEF08A', borderRadius: 2, padding: '0 1px', color: 'inherit' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SearchModal({ nodes, rootId, customTypes, collapsedIds, onNavigate, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = getResults(query, nodes, rootId, collapsedIds)

  useEffect(() => { setSelectedIdx(0) }, [query])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[selectedIdx]) { onNavigate(results[selectedIdx].nodeId) }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.35)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 900, paddingTop: '14vh',
      }}
      onClick={onClose}
    >
      <div
        style={{ width: 520, background: '#fff', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid #F1F5F9', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94A3B8' }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索节点标题或描述…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 15, color: '#1E293B', fontFamily: 'inherit',
              background: 'transparent',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 16, padding: '0 2px', lineHeight: 1, fontFamily: 'inherit' }}
            >×</button>
          )}
          <kbd style={{ fontSize: 10, color: '#94A3B8', background: '#F1F5F9', borderRadius: 4, padding: '2px 6px', border: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>Esc</kbd>
        </div>

        {/* Results */}
        {query ? (
          <div ref={listRef} style={{ maxHeight: 380, overflowY: 'auto' }}>
            {results.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                没有找到「{query}」相关节点
              </div>
            ) : (
              results.map((r, i) => {
                const meta = getTypeMeta(r.type, customTypes)
                return (
                  <div
                    key={r.nodeId}
                    onClick={() => onNavigate(r.nodeId)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      background: i === selectedIdx ? '#F5F7FF' : 'transparent',
                      borderBottom: '1px solid #F8FAFC',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'background 0.08s',
                    }}
                  >
                    {/* Type badge */}
                    <div style={{ flexShrink: 0, marginTop: 2, minWidth: 38 }}>
                      {r.type && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                          background: meta.bg, color: meta.color,
                          padding: '2px 6px', borderRadius: 4,
                          border: `1px solid ${meta.color}22`,
                          whiteSpace: 'nowrap',
                        }}>
                          {meta.label}
                        </span>
                      )}
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: r.path.length > 0 ? 3 : 0 }}>
                        {highlightText(r.title || '(无标题)', query)}
                      </div>
                      {r.path.length > 0 && (
                        <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, lineHeight: 1.6 }}>
                          {r.path.map((p, pi) => (
                            <span key={pi} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              {pi > 0 && <span style={{ color: '#CBD5E1', fontSize: 10 }}>›</span>}
                              <span>{p}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right side: collapsed indicator + enter hint */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}>
                      {r.isCollapsed && r.childCount > 0 && (
                        <span style={{
                          fontSize: 10, color: '#94A3B8',
                          background: '#F1F5F9', borderRadius: 4,
                          padding: '2px 6px', whiteSpace: 'nowrap',
                          border: '1px solid #E2E8F0',
                        }}>
                          {r.childCount} 子节点
                        </span>
                      )}
                      {i === selectedIdx && (
                        <kbd style={{
                          fontSize: 9, color: '#94A3B8',
                          background: '#F1F5F9', borderRadius: 4,
                          padding: '2px 6px', border: '1px solid #E2E8F0',
                          whiteSpace: 'nowrap',
                        }}>↵</kbd>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div style={{ padding: '20px 16px', textAlign: 'center', color: '#CBD5E1', fontSize: 12 }}>
            输入关键词搜索所有节点，包括已折叠的分支
          </div>
        )}

        {/* Footer shortcuts */}
        {query && results.length > 0 && (
          <div style={{
            padding: '7px 14px', borderTop: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 10, color: '#CBD5E1',
          }}>
            <span>↑↓ 导航</span>
            <span>↵ 跳转</span>
            <span>Esc 关闭</span>
            <div style={{ flex: 1 }} />
            <span>{results.length} 个结果{results.length === 20 ? '（最多显示 20 个）' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
