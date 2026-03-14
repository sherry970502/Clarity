'use client'
import { useEffect, useRef } from 'react'
import { MindNode, NodeType, Priority, NODE_TYPE_META, PRIORITY_META } from '@/lib/types'

interface Props {
  node: MindNode | null
  isNew: boolean
  onClose: () => void
  onUpdate: (patch: Partial<Pick<MindNode, 'title' | 'description' | 'type' | 'priority'>>) => void
  onClearNew: () => void
}

export function DetailPanel({ node, isNew, onClose, onUpdate, onClearNew }: Props) {
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isNew && node && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
      onClearNew()
    }
  }, [isNew, node, onClearNew])

  if (!node) return null

  const meta = NODE_TYPE_META[node.type]

  return (
    <div style={{
      width: 280, flexShrink: 0, height: '100%', overflowY: 'auto',
      background: '#fff', borderLeft: '1px solid #E2E8F0',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          background: meta.bg, color: meta.color,
          padding: '2px 7px', borderRadius: 4,
          border: `1px solid ${meta.color}22`,
        }}>
          {meta.label}
        </span>
        <span style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '16px', flex: 1 }}>
        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            标题
          </label>
          <input
            ref={titleRef}
            defaultValue={node.title}
            key={node.id + '-title'}
            onBlur={e => onUpdate({ title: e.target.value || node.title })}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #E2E8F0', borderRadius: 6,
              padding: '8px 10px', fontSize: 14, color: '#1E293B',
              outline: 'none', fontFamily: 'inherit',
              background: '#FAFAFA',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            描述
          </label>
          <textarea
            ref={descRef}
            key={node.id + '-desc'}
            defaultValue={node.description}
            onBlur={e => onUpdate({ description: e.target.value })}
            placeholder="补充说明、背景信息..."
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #E2E8F0', borderRadius: 6,
              padding: '8px 10px', fontSize: 13, color: '#334155',
              outline: 'none', fontFamily: 'inherit', resize: 'vertical',
              background: '#FAFAFA', lineHeight: 1.6,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            类型
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(NODE_TYPE_META) as NodeType[]).map(t => {
              const m = NODE_TYPE_META[t]
              const active = node.type === t
              return (
                <button
                  key={t}
                  onClick={() => onUpdate({ type: t })}
                  style={{
                    padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                    fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                    border: `1.5px solid ${active ? m.color : '#E2E8F0'}`,
                    background: active ? m.bg : '#fff',
                    color: active ? m.color : '#64748B',
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            优先级
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <PrioBtn label="无" color="#CBD5E1" active={node.priority === null} onClick={() => onUpdate({ priority: null })} />
            {(Object.keys(PRIORITY_META) as Priority[]).map(p => (
              <PrioBtn key={p} label={PRIORITY_META[p].label} color={PRIORITY_META[p].color} active={node.priority === p} onClick={() => onUpdate({ priority: p })} />
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ fontSize: 10, color: '#CBD5E1', lineHeight: 1.8 }}>
          <span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '1px 5px', borderRadius: 3, marginRight: 6 }}>Tab</span>新增子节点
          <br />
          <span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '1px 5px', borderRadius: 3, marginRight: 6 }}>Enter</span>新增同级节点
          <br />
          <span style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '1px 5px', borderRadius: 3, marginRight: 6 }}>Delete</span>删除节点
        </div>
      </div>
    </div>
  )
}

function PrioBtn({ label, color, active, onClick }: { label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 9px', borderRadius: 5, cursor: 'pointer',
        fontSize: 12, fontFamily: 'inherit',
        border: `1.5px solid ${active ? color : '#E2E8F0'}`,
        background: active ? color + '18' : '#fff',
        color: active ? color : '#64748B',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s',
      }}
    >
      {label !== '无' && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      )}
      {label}
    </button>
  )
}
