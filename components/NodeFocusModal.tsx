'use client'
import { useEffect } from 'react'
import { MindNode, NodeTypeDef, getTypeMeta, PRIORITY_META, STATUS_META } from '@/lib/types'

interface Props {
  node: MindNode
  customTypes: NodeTypeDef[]
  allMaps: { id: string; title: string }[]
  onClose: () => void
  onNavigateToMap: (mapId: string) => void
}

export function NodeFocusModal({ node, customTypes, allMaps, onClose, onNavigateToMap }: Props) {
  const meta = getTypeMeta(node.type, customTypes)
  const linkedMap = node.mapLink ? allMaps.find(m => m.id === node.mapLink) : null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16,
          width: 'min(620px, 92vw)', maxHeight: '82vh',
          overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
          padding: '32px 36px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header: type badge + meta + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            background: meta.bg, color: meta.color,
            padding: '3px 10px', borderRadius: 5,
            border: `1px solid ${meta.color}22`,
          }}>
            {meta.label}
          </span>
          {node.status === 'done' && (
            <span style={{ fontSize: 11, color: '#16A34A', background: '#F0FDF4', padding: '3px 10px', borderRadius: 5, border: '1px solid #BBF7D0' }}>
              ✓ {STATUS_META.done.label}
            </span>
          )}
          {node.priority && (
            <span style={{ fontSize: 11, color: PRIORITY_META[node.priority].color, fontWeight: 600 }}>
              {PRIORITY_META[node.priority].label}优先
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, color: '#94A3B8', padding: '0 4px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Title */}
        <h2 style={{
          margin: '0 0 20px', fontSize: 22, fontWeight: 700,
          color: '#0F172A', lineHeight: 1.35,
        }}>
          {node.title}
        </h2>

        {/* Description */}
        {node.description ? (
          <div style={{
            fontSize: 15, color: '#475569', lineHeight: 1.75,
            marginBottom: 24, whiteSpace: 'pre-wrap',
            borderLeft: `3px solid ${meta.color}44`,
            paddingLeft: 16,
          }}>
            {node.description}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 24, fontStyle: 'italic' }}>
            暂无描述
          </div>
        )}

        {/* URL */}
        {node.url && (
          <a
            href={node.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#4F46E5', marginBottom: 16,
              textDecoration: 'none', fontWeight: 500,
              background: '#EEF2FF', padding: '6px 12px', borderRadius: 6,
            }}
          >
            <span>↗</span> {node.url}
          </a>
        )}

        {/* Map link */}
        {node.mapLink && linkedMap && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => { onClose(); onNavigateToMap(node.mapLink!) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: '#4F46E5', fontWeight: 600,
                background: '#EEF2FF', border: 'none',
                padding: '8px 16px', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ↗ 跳转到「{linkedMap.title}」
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
