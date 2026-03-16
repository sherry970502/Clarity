'use client'
import { useEffect, useRef, useState } from 'react'
import { MindNode, NodeTypeDef, Priority, Status, getTypeMeta, PRIORITY_META } from '@/lib/types'
import { TYPE_COLOR_PRESETS } from '@/lib/templates'

interface Props {
  node: MindNode | null
  isNew: boolean
  selectedIds: string[]
  customTypes: NodeTypeDef[]
  allMaps: { id: string; title: string }[]
  currentMapId: string
  onClose: () => void
  onUpdate: (patch: Partial<Pick<MindNode, 'title' | 'description' | 'type' | 'priority' | 'url' | 'mapLink'>>) => void
  onUpdateStatus: (status?: Status) => void
  onUpdateMulti: (patch: Partial<Pick<MindNode, 'type' | 'priority'>>) => void
  onDeleteMulti: () => void
  onClearNew: () => void
  onAddCustomType: (typeDef: NodeTypeDef) => void
  onNavigateToMap: (mapId: string) => void
}

export function DetailPanel({
  node, isNew, selectedIds, customTypes, allMaps, currentMapId,
  onClose, onUpdate, onUpdateStatus, onUpdateMulti, onDeleteMulti, onClearNew,
  onAddCustomType, onNavigateToMap,
}: Props) {
  const titleRef = useRef<HTMLInputElement>(null)
  const [showAddType, setShowAddType] = useState(false)
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [newTypeColor, setNewTypeColor] = useState(TYPE_COLOR_PRESETS[0])

  useEffect(() => {
    if (isNew && node && titleRef.current) {
      titleRef.current.focus()
      titleRef.current.select()
      onClearNew()
    }
  }, [isNew, node, onClearNew])

  // Reset add-type form when panel closes
  useEffect(() => {
    if (!node) {
      setShowAddType(false)
      setNewTypeLabel('')
    }
  }, [node])

  function handleAddType() {
    const label = newTypeLabel.trim()
    if (!label) return
    const id = `custom_${Date.now()}`
    onAddCustomType({ id, label, color: newTypeColor.color, bg: newTypeColor.bg })
    setNewTypeLabel('')
    setShowAddType(false)
  }

  // Multi-select batch panel
  if (selectedIds.length > 1) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>已选 {selectedIds.length} 个节点</span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>批量改类型</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {customTypes.map(t => (
                <button key={t.id} onClick={() => onUpdateMulti({ type: t.id })}
                  style={{ padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', border: `1.5px solid ${t.color}44`, background: t.bg, color: t.color }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>批量改优先级</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onUpdateMulti({ priority: null })} style={batchBtnStyle('#CBD5E1')}>无</button>
              {(Object.keys(PRIORITY_META) as Priority[]).map(p => (
                <button key={p} onClick={() => onUpdateMulti({ priority: p })} style={batchBtnStyle(PRIORITY_META[p].color)}>
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onDeleteMulti}
            style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1.5px solid #FCA5A5', background: '#FEF2F2', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            删除选中节点（{selectedIds.length}）
          </button>
        </div>
      </div>
    )
  }

  if (!node) return null

  const meta = getTypeMeta(node.type, customTypes)
  const linkedMap = node.mapLink ? allMaps.find(m => m.id === node.mapLink) : null

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          background: meta.bg, color: meta.color,
          padding: '2px 7px', borderRadius: 4,
          border: `1px solid ${meta.color}22`,
        }}>
          {meta.label}
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} style={closeBtn}>×</button>
      </div>

      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>标题</label>
          <input
            ref={titleRef}
            defaultValue={node.title}
            key={node.id + '-title'}
            onBlur={e => onUpdate({ title: e.target.value || node.title })}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>描述</label>
          <textarea
            key={node.id + '-desc'}
            defaultValue={node.description}
            onBlur={e => onUpdate({ description: e.target.value })}
            placeholder="补充说明、背景信息..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
        </div>

        {/* Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>类型</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {customTypes.map(t => {
              const active = node.type === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => onUpdate({ type: t.id })}
                  style={{
                    padding: '5px 10px', borderRadius: 5, cursor: 'pointer',
                    fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                    border: `1.5px solid ${active ? t.color : '#E2E8F0'}`,
                    background: active ? t.bg : '#fff',
                    color: active ? t.color : '#64748B',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Add custom type */}
          {!showAddType ? (
            <button
              onClick={() => setShowAddType(true)}
              style={{ marginTop: 8, fontSize: 11, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              + 新增标签
            </button>
          ) : (
            <div style={{ marginTop: 8, background: '#F8FAFC', borderRadius: 8, padding: '10px', border: '1px solid #E2E8F0' }}>
              <input
                autoFocus
                value={newTypeLabel}
                onChange={e => setNewTypeLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddType(); if (e.key === 'Escape') setShowAddType(false) }}
                placeholder="标签名称…"
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E8F0', borderRadius: 5, padding: '5px 8px', fontSize: 12, outline: 'none', fontFamily: 'inherit', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                {TYPE_COLOR_PRESETS.map((preset, i) => (
                  <div
                    key={i}
                    onClick={() => setNewTypeColor(preset)}
                    style={{
                      width: 18, height: 18, borderRadius: 4, background: preset.color,
                      cursor: 'pointer', border: newTypeColor.color === preset.color ? '2px solid #1E293B' : '2px solid transparent',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>
              {newTypeLabel && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: newTypeColor.bg, color: newTypeColor.color, border: `1px solid ${newTypeColor.color}33` }}>
                    {newTypeLabel}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleAddType} style={{ padding: '4px 10px', borderRadius: 5, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>添加</button>
                <button onClick={() => { setShowAddType(false); setNewTypeLabel('') }} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#64748B', fontFamily: 'inherit' }}>取消</button>
              </div>
            </div>
          )}
        </div>

        {/* URL */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>链接</label>
          <input
            key={node.id + '-url'}
            defaultValue={node.url ?? ''}
            placeholder="https://..."
            onBlur={e => {
              const val = e.target.value.trim()
              onUpdate({ url: val || undefined })
            }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
          />
          {node.url && (
            <a
              href={node.url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: '#4F46E5', textDecoration: 'none', fontWeight: 500 }}
            >
              <span style={{ fontSize: 13 }}>↗</span> 打开链接
            </a>
          )}
        </div>

        {/* Map link */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>关联思维导图</label>
          <select
            key={node.id + '-maplink'}
            value={node.mapLink ?? ''}
            onChange={e => {
              const val = e.target.value
              onUpdate({ mapLink: val || undefined })
            }}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #E2E8F0', borderRadius: 6,
              padding: '8px 10px', fontSize: 13, color: node.mapLink ? '#1E293B' : '#94A3B8',
              outline: 'none', fontFamily: 'inherit', background: '#FAFAFA',
              cursor: 'pointer',
            }}
          >
            <option value="">不关联</option>
            {allMaps.map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
          {node.mapLink && (
            <button
              onClick={() => onNavigateToMap(node.mapLink!)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                marginTop: 8, fontSize: 12, color: '#4F46E5', fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 13 }}>↗</span>
              {linkedMap ? `打开「${linkedMap.title}」` : '打开关联图谱'}
            </button>
          )}
        </div>

        {/* Status */}
        {node.type !== 'dimension' && node.type !== '' && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>完成状态</label>
            <button
              onClick={() => onUpdateStatus(node.status === 'done' ? undefined : 'done')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '9px 12px', borderRadius: 8,
                border: `1.5px solid ${node.status === 'done' ? '#22C55E' : '#E2E8F0'}`,
                background: node.status === 'done' ? '#F0FDF4' : '#fff',
                color: node.status === 'done' ? '#16A34A' : '#64748B',
                fontSize: 13, fontWeight: node.status === 'done' ? 600 : 400,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${node.status === 'done' ? '#22C55E' : '#D1D5DB'}`,
                background: node.status === 'done' ? '#22C55E' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {node.status === 'done' && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1, fontWeight: 700 }}>✓</span>}
              </div>
              {node.status === 'done' ? '已完成 · 点击取消' : '标记为已完成'}
            </button>
          </div>
        )}

        {/* Priority */}
        <div>
          <label style={labelStyle}>优先级</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <PrioBtn label="无" color="#CBD5E1" active={node.priority === null} onClick={() => onUpdate({ priority: null })} />
            {(Object.keys(PRIORITY_META) as Priority[]).map(p => (
              <PrioBtn key={p} label={PRIORITY_META[p].label} color={PRIORITY_META[p].color} active={node.priority === p} onClick={() => onUpdate({ priority: p })} />
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
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

const panelStyle: React.CSSProperties = {
  width: 280, flexShrink: 0, height: '100%',
  background: '#fff', borderLeft: '1px solid #E2E8F0',
  display: 'flex', flexDirection: 'column',
  fontFamily: 'system-ui, sans-serif',
}

const headerStyle: React.CSSProperties = {
  padding: '14px 16px 12px',
  borderBottom: '1px solid #F1F5F9',
  display: 'flex', alignItems: 'center', gap: 8,
  flexShrink: 0,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#94A3B8', letterSpacing: '0.05em',
  textTransform: 'uppercase', display: 'block', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #E2E8F0', borderRadius: 6,
  padding: '8px 10px', fontSize: 13, color: '#334155',
  outline: 'none', fontFamily: 'inherit',
  background: '#FAFAFA',
}

const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#94A3B8', fontSize: 18, lineHeight: 1, padding: '0 2px',
}

function batchBtnStyle(color: string): React.CSSProperties {
  return {
    padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12,
    fontFamily: 'inherit', border: `1.5px solid ${color}55`,
    background: color + '18', color, fontWeight: 500,
  }
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
