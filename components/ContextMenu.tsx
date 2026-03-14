'use client'
import { useEffect, useRef } from 'react'
import { NodeType, Priority, NODE_TYPE_META, PRIORITY_META } from '@/lib/types'

interface Props {
  x: number
  y: number
  nodeId: string
  isRoot: boolean
  onAddChild: () => void
  onAddSibling: () => void
  onDelete: () => void
  onChangeType: (t: NodeType) => void
  onChangePriority: (p: Priority | null) => void
  onClose: () => void
}

export function ContextMenu({ x, y, nodeId, isRoot, onAddChild, onAddSibling, onDelete, onChangeType, onChangePriority, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Clamp to viewport
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const menuW = 180
  const menuH = 280
  const cx = x + menuW > vw ? x - menuW : x
  const cy = y + menuH > vh ? y - menuH : y

  const sep = <div style={{ height: 1, background: '#E2E8F0', margin: '4px 0' }} />

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left: cx, top: cy, zIndex: 1000,
        background: '#fff', border: '1px solid #E2E8F0',
        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        width: menuW, padding: '4px 0', fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Item label="新增子节点" onClick={onAddChild} />
      {!isRoot && <Item label="新增同级节点" onClick={onAddSibling} />}
      {sep}
      <div style={{ padding: '4px 12px 2px', fontSize: 10, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>切换类型</div>
      {(Object.keys(NODE_TYPE_META) as NodeType[]).map(t => (
        <Item
          key={t}
          label={NODE_TYPE_META[t].label}
          dot={NODE_TYPE_META[t].color}
          onClick={() => { onChangeType(t); onClose() }}
        />
      ))}
      {sep}
      <div style={{ padding: '4px 12px 2px', fontSize: 10, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>优先级</div>
      <Item label="无" onClick={() => { onChangePriority(null); onClose() }} />
      {(Object.keys(PRIORITY_META) as Priority[]).map(p => (
        <Item
          key={p}
          label={PRIORITY_META[p].label}
          dot={PRIORITY_META[p].color}
          onClick={() => { onChangePriority(p); onClose() }}
        />
      ))}
      {!isRoot && (
        <>
          {sep}
          <Item label="删除节点" onClick={onDelete} danger />
        </>
      )}
    </div>
  )
}

function Item({ label, onClick, dot, danger }: { label: string; onClick: () => void; dot?: string; danger?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 12px', fontSize: 13, cursor: 'pointer',
        color: danger ? '#EF4444' : '#1E293B',
        display: 'flex', alignItems: 'center', gap: 8,
        userSelect: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {dot && <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />}
      {label}
    </div>
  )
}
