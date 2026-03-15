'use client'
import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { MindNode, NODE_TYPE_META, PRIORITY_META, STATUS_META, Status } from '@/lib/types'
import { calcLayout, NODE_W, NODE_H } from '@/lib/layout'
import { AppState, Action } from '@/lib/store'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
}

interface DragBox { x: number; y: number; w: number; h: number }

export function MindMap({ state, dispatch }: Props) {
  const { nodes, rootId, selectedId, selectedIds, panX, panY, scale, dragId, dropId } = state
  const positions = useMemo(() => calcLayout(nodes, rootId), [nodes, rootId])

  const allPos = Object.values(positions)
  const minX = Math.min(...allPos.map(p => p.x), 0) - 120
  const minY = Math.min(...allPos.map(p => p.y), 0) - 120
  const maxX = Math.max(...allPos.map(p => p.x), 0) + NODE_W + 200
  const maxY = Math.max(...allPos.map(p => p.y), 0) + NODE_H + 200
  const svgW = maxX - minX
  const svgH = maxY - minY

  const containerRef = useRef<HTMLDivElement>(null)
  const interactRef = useRef<{
    mode: 'none' | 'pan' | 'box'
    startX: number; startY: number
    lastX: number; lastY: number
  }>({ mode: 'none', startX: 0, startY: 0, lastX: 0, lastY: 0 })

  const [dragBox, setDragBox] = useState<DragBox | null>(null)
  const [altDown, setAltDown] = useState(false)

  // Track Alt key for cursor hint
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltDown(true) }
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltDown(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // Middle click always pans
      interactRef.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY }
      e.preventDefault(); return
    }
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-node]')) return
    const mode = e.altKey ? 'pan' : 'box'
    interactRef.current = { mode, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY }
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const ref = interactRef.current
    if (ref.mode === 'none') return

    if (ref.mode === 'pan') {
      dispatch({ type: 'SET_PAN', dx: e.clientX - ref.lastX, dy: e.clientY - ref.lastY })
      ref.lastX = e.clientX; ref.lastY = e.clientY
    } else {
      // Box select
      const x = Math.min(ref.startX, e.clientX)
      const y = Math.min(ref.startY, e.clientY)
      const w = Math.abs(e.clientX - ref.startX)
      const h = Math.abs(e.clientY - ref.startY)
      if (w > 4 || h > 4) setDragBox({ x, y, w, h })
    }
  }, [dispatch])

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    const ref = interactRef.current
    if (ref.mode === 'box' && dragBox && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      // Convert viewport box → canvas coords (accounting for pan and scale)
      const bx1 = (dragBox.x - rect.left - panX) / scale
      const by1 = (dragBox.y - rect.top - panY) / scale
      const bx2 = bx1 + dragBox.w / scale
      const by2 = by1 + dragBox.h / scale

      const selected: string[] = []
      for (const [id, pos] of Object.entries(positions)) {
        const nx = pos.x - minX
        const ny = pos.y - minY
        if (nx < bx2 && nx + NODE_W > bx1 && ny < by2 && ny + NODE_H > by1) {
          selected.push(id)
        }
      }
      if (selected.length > 0) {
        dispatch({ type: 'BOX_SELECT', ids: selected })
      } else {
        dispatch({ type: 'CLEAR_SELECTION' })
        dispatch({ type: 'CLOSE_CTX' })
      }
    } else if (ref.mode === 'box' && !dragBox) {
      // Click on background without drag → clear selection
      dispatch({ type: 'CLEAR_SELECTION' })
      dispatch({ type: 'CLOSE_CTX' })
    }
    interactRef.current.mode = 'none'
    setDragBox(null)
  }, [dragBox, panX, panY, scale, positions, minX, minY, dispatch])

  // Zoom with Ctrl+scroll, pan with scroll
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      const newScale = Math.max(0.2, Math.min(4, scale * factor))
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const ratio = newScale / scale
      dispatch({ type: 'ZOOM', scale: newScale, panX: cx - ratio * (cx - panX), panY: cy - ratio * (cy - panY) })
    } else {
      dispatch({ type: 'SET_PAN', dx: -e.deltaX, dy: -e.deltaY })
    }
  }, [scale, panX, panY, dispatch])

  // Build edges
  const edges: React.ReactNode[] = []
  for (const [id, n] of Object.entries(nodes)) {
    const p = positions[id]
    if (!p) continue
    for (const cid of n.children) {
      const cp = positions[cid]
      if (!cp) continue
      // Only draw edge if child's parentId points back to this node (guards against stale refs)
      if (nodes[cid]?.parentId !== id) continue
      const x1 = p.x - minX + NODE_W
      const y1 = p.y - minY + NODE_H / 2
      const x2 = cp.x - minX
      const y2 = cp.y - minY + NODE_H / 2
      const mx = (x1 + x2) / 2
      const childType = nodes[cid]?.type
      const isSelected = selectedIds.includes(cid)
      const color = isSelected
        ? NODE_TYPE_META[childType ?? 'task'].color
        : childType === 'dimension' ? '#94A3B8'
        : NODE_TYPE_META[childType ?? 'task'].color + '55'
      edges.push(
        <path key={`${id}-${cid}`}
          d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
          fill="none" stroke={color}
          strokeWidth={isSelected || dropId === cid ? 2 : 1.5}
          strokeDasharray={nodes[cid]?.type === 'pending' ? '4 3' : undefined}
        />
      )
    }
  }

  const cursor = altDown ? 'grab' : dragBox ? 'crosshair' : 'default'

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor,
        background: 'radial-gradient(circle at 50% 50%, #F8FAFC 0%, #F1F5F9 100%)' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {/* Canvas */}
      <div style={{
        position: 'absolute',
        transformOrigin: '0 0',
        transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
        width: svgW, height: svgH,
      }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
          width={svgW} height={svgH}>
          {edges}
        </svg>

        {Object.entries(positions).map(([id, pos]) => {
          const n = nodes[id]
          if (!n) return null
          return (
            <NodeCard key={id} node={n}
              x={pos.x - minX} y={pos.y - minY}
              selected={selectedId === id}
              multiSelected={selectedIds.includes(id)}
              isDragging={dragId === id}
              isDropTarget={dropId === id}
              isRoot={!n.parentId}
              dragId={dragId}
              dispatch={dispatch}
            />
          )
        })}
      </div>

      {/* Grid dots */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="grid" x={(panX * scale) % (24 * scale)} y={(panY * scale) % (24 * scale)}
            width={24 * scale} height={24 * scale} patternUnits="userSpaceOnUse">
            <circle cx={12 * scale} cy={12 * scale} r={0.8} fill="#CBD5E1" opacity={0.4} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Box selection rect */}
      {dragBox && (
        <div style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 100,
          left: dragBox.x, top: dragBox.y, width: dragBox.w, height: dragBox.h,
          border: '1.5px solid #4F46E5',
          background: 'rgba(79,70,229,0.07)',
          borderRadius: 3,
        }} />
      )}

      {/* Multi-select badge */}
      {selectedIds.length > 1 && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#4F46E5', color: '#fff', borderRadius: 20,
          padding: '4px 14px', fontSize: 12, fontWeight: 600,
          boxShadow: '0 2px 8px rgba(79,70,229,0.3)', pointerEvents: 'none',
        }}>
          已选 {selectedIds.length} 个节点
        </div>
      )}

      {/* Alt hint */}
      {!altDown && !dragBox && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          fontSize: 10, color: '#CBD5E1', pointerEvents: 'none',
        }}>
          拖拽框选 · Alt+拖拽平移 · Ctrl+滚轮缩放
        </div>
      )}
    </div>
  )
}

interface NodeCardProps {
  node: MindNode; x: number; y: number
  selected: boolean; multiSelected: boolean
  isDragging: boolean; isDropTarget: boolean; isRoot: boolean
  dragId: string | null; dispatch: (a: Action) => void
}

function cycleStatus(s?: Status): Status | undefined {
  if (!s) return 'doing'
  if (s === 'doing') return 'done'
  return undefined
}

function NodeCard({ node, x, y, selected, multiSelected, isDragging, isDropTarget, isRoot, dragId, dispatch }: NodeCardProps) {
  const meta = NODE_TYPE_META[node.type]
  const isDimension = node.type === 'dimension'
  const isHighlighted = selected || multiSelected
  const isDone = node.status === 'done'
  const canHaveStatus = !isRoot && !isDimension

  const border = isDropTarget ? '2px solid #4F46E5'
    : isHighlighted ? `2px solid ${meta.color}`
    : `1.5px solid ${isDimension ? '#CBD5E1' : '#E8ECF0'}`

  const bg = isDropTarget ? '#EEF2FF'
    : multiSelected && !selected ? meta.bg
    : isDimension ? '#F1F5F9' : '#FFFFFF'

  const shadow = isHighlighted
    ? `0 0 0 3px ${meta.color}${multiSelected && !selected ? '33' : '22'}, 0 4px 16px rgba(0,0,0,0.08)`
    : isDimension ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.06)'

  return (
    <div data-node={node.id} style={{
      position: 'absolute', left: x, top: y,
      width: NODE_W, height: NODE_H, background: bg, border,
      borderRadius: isDimension ? 10 : 8, boxShadow: shadow,
      display: 'flex', alignItems: 'center', cursor: 'pointer',
      opacity: isDragging ? 0.4 : isDone ? 0.55 : 1,
      transition: 'box-shadow 0.15s, border-color 0.15s, opacity 0.15s',
      userSelect: 'none',
    }}
      draggable={!isRoot}
      onClick={e => { e.stopPropagation(); e.shiftKey ? dispatch({ type: 'MULTI_SELECT', id: node.id }) : dispatch({ type: 'SELECT', id: node.id }) }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); dispatch({ type: 'OPEN_CTX', x: e.clientX, y: e.clientY, nodeId: node.id }) }}
      onDragStart={e => { e.stopPropagation(); dispatch({ type: 'DRAG_START', nodeId: node.id }); e.dataTransfer.effectAllowed = 'move' }}
      onDragEnd={() => dispatch({ type: 'DRAG_END' })}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); dispatch({ type: 'DRAG_OVER', nodeId: node.id }) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragId) dispatch({ type: 'REPARENT', nodeId: dragId, newParentId: node.id }) }}
    >
      <div style={{ width: isDimension ? 5 : 4, alignSelf: 'stretch', borderRadius: isDimension ? '10px 0 0 10px' : '8px 0 0 8px', background: meta.color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '0 8px', minWidth: 0 }}>
        {isDimension && <div style={{ fontSize: 9, color: meta.color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>{meta.label}</div>}
        <div style={{ fontSize: 13, fontWeight: isDimension ? 600 : 500, color: isDimension ? '#1E293B' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: isDimension ? '1.2' : '1.4' }}>
          {node.title}
        </div>
        {!isDimension && <div style={{ fontSize: 10, color: meta.color, opacity: 0.7, letterSpacing: '0.03em', marginTop: 1 }}>{meta.label}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 10, flexShrink: 0 }}>
        {multiSelected && <div style={{ width: 14, height: 14, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span></div>}
        {node.description && !multiSelected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1' }} title="有描述" />}
        {node.priority && !multiSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_META[node.priority].color }} />}
        {canHaveStatus && !multiSelected && (
          <div
            onClick={e => { e.stopPropagation(); dispatch({ type: 'UPDATE', nodeId: node.id, patch: { status: cycleStatus(node.status) } }) }}
            title={node.status ? STATUS_META[node.status].label : '标记状态'}
            style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: `1.5px solid ${node.status ? STATUS_META[node.status].color : '#D1D5DB'}`,
              background: node.status === 'done' ? '#22C55E' : node.status === 'doing' ? '#FEF3C7' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {node.status === 'done' && <span style={{ color: '#fff', fontSize: 8, lineHeight: 1, fontWeight: 700 }}>✓</span>}
            {node.status === 'doing' && <span style={{ color: '#F59E0B', fontSize: 8, lineHeight: 1 }}>●</span>}
          </div>
        )}
      </div>
      {isDropTarget && <div style={{ position: 'absolute', bottom: -3, left: 12, right: 12, height: 2, borderRadius: 1, background: '#4F46E5' }} />}
    </div>
  )
}
