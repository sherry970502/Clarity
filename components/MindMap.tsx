'use client'
import { useRef, useCallback, useMemo } from 'react'
import { MindNode, NODE_TYPE_META, PRIORITY_META } from '@/lib/types'
import { calcLayout, NODE_W, NODE_H, H_GAP } from '@/lib/layout'
import { AppState, Action } from '@/lib/store'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
}

export function MindMap({ state, dispatch }: Props) {
  const { nodes, rootId, selectedId, panX, panY, dragId, dropId } = state
  const positions = useMemo(() => calcLayout(nodes, rootId), [nodes, rootId])

  // Canvas bounding box
  const allPos = Object.values(positions)
  const minX = Math.min(...allPos.map(p => p.x), 0) - 120
  const minY = Math.min(...allPos.map(p => p.y), 0) - 120
  const maxX = Math.max(...allPos.map(p => p.x), 0) + NODE_W + 200
  const maxY = Math.max(...allPos.map(p => p.y), 0) + NODE_H + 200
  const svgW = maxX - minX
  const svgH = maxY - minY

  // Pan handling
  const panStart = useRef<{ x: number; y: number } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement).closest('[data-node]')) return
    panStart.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panStart.current) return
    dispatch({ type: 'SET_PAN', dx: e.clientX - panStart.current.x, dy: e.clientY - panStart.current.y })
    panStart.current = { x: e.clientX, y: e.clientY }
  }, [dispatch])

  const onMouseUp = useCallback(() => { panStart.current = null }, [])

  // Build edges
  const edges: React.ReactNode[] = []
  for (const [id, n] of Object.entries(nodes)) {
    const p = positions[id]
    if (!p) continue
    for (const cid of n.children) {
      const cp = positions[cid]
      if (!cp) continue
      const x1 = p.x - minX + NODE_W
      const y1 = p.y - minY + NODE_H / 2
      const x2 = cp.x - minX
      const y2 = cp.y - minY + NODE_H / 2
      const mx = (x1 + x2) / 2
      const childType = nodes[cid]?.type
      const color = childType === 'dimension' ? '#94A3B8' : NODE_TYPE_META[childType ?? 'task'].color + '55'
      edges.push(
        <path
          key={`${id}-${cid}`}
          d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={dropId === cid ? 2 : 1.5}
          strokeDasharray={nodes[cid]?.type === 'pending' ? '4 3' : undefined}
        />
      )
    }
  }

  return (
    <div
      style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, #F8FAFC 0%, #F1F5F9 100%)',
        cursor: panStart.current ? 'grabbing' : 'grab',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={() => dispatch({ type: 'CLOSE_CTX' })}
    >
      <div style={{
        position: 'absolute',
        transform: `translate(${panX}px, ${panY}px)`,
        width: svgW, height: svgH,
      }}>
        {/* SVG edges */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
          width={svgW} height={svgH}
        >
          {edges}
        </svg>

        {/* Node cards */}
        {Object.entries(positions).map(([id, pos]) => {
          const n = nodes[id]
          if (!n) return null
          return (
            <NodeCard
              key={id}
              node={n}
              x={pos.x - minX}
              y={pos.y - minY}
              selected={selectedId === id}
              isDragging={dragId === id}
              isDropTarget={dropId === id}
              isRoot={!n.parentId}
              dragId={dragId}
              dispatch={dispatch}
            />
          )
        })}
      </div>

      {/* Grid dots for visual depth */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="grid" x={panX % 24} y={panY % 24} width={24} height={24} patternUnits="userSpaceOnUse">
            <circle cx={12} cy={12} r={0.8} fill="#CBD5E1" opacity={0.4} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  )
}

interface NodeCardProps {
  node: MindNode
  x: number
  y: number
  selected: boolean
  isDragging: boolean
  isDropTarget: boolean
  isRoot: boolean
  dragId: string | null
  dispatch: (a: Action) => void
}

function NodeCard({ node, x, y, selected, isDragging, isDropTarget, isRoot, dragId, dispatch }: NodeCardProps) {
  const meta = NODE_TYPE_META[node.type]
  const isDimension = node.type === 'dimension'

  const w = NODE_W
  const h = NODE_H

  const border = isDropTarget
    ? '2px solid #4F46E5'
    : selected
    ? `2px solid ${meta.color}`
    : `1.5px solid ${isDimension ? '#CBD5E1' : '#E8ECF0'}`

  const bg = isDropTarget
    ? '#EEF2FF'
    : isDimension
    ? '#F1F5F9'
    : '#FFFFFF'

  const shadow = selected
    ? `0 0 0 3px ${meta.color}22, 0 4px 16px rgba(0,0,0,0.08)`
    : isDimension
    ? '0 2px 8px rgba(0,0,0,0.06)'
    : '0 1px 4px rgba(0,0,0,0.06)'

  return (
    <div
      data-node={node.id}
      style={{
        position: 'absolute',
        left: x, top: y,
        width: w, height: h,
        background: bg,
        border,
        borderRadius: isDimension ? 10 : 8,
        boxShadow: shadow,
        display: 'flex', alignItems: 'center',
        cursor: 'pointer',
        opacity: isDragging ? 0.4 : 1,
        transition: 'box-shadow 0.15s, border-color 0.15s, opacity 0.15s',
        userSelect: 'none',
      }}
      draggable={!isRoot}
      onClick={e => { e.stopPropagation(); dispatch({ type: 'SELECT', id: node.id }) }}
      onContextMenu={e => {
        e.preventDefault()
        e.stopPropagation()
        dispatch({ type: 'OPEN_CTX', x: e.clientX, y: e.clientY, nodeId: node.id })
      }}
      onDragStart={e => {
        e.stopPropagation()
        dispatch({ type: 'DRAG_START', nodeId: node.id })
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={() => dispatch({ type: 'DRAG_OVER', nodeId: null })}
      onDragOver={e => {
        e.preventDefault()
        e.stopPropagation()
        dispatch({ type: 'DRAG_OVER', nodeId: node.id })
      }}
      onDrop={e => {
        e.preventDefault()
        e.stopPropagation()
        if (dragId) dispatch({ type: 'REPARENT', nodeId: dragId, newParentId: node.id })
      }}
    >
      {/* Left color bar */}
      <div style={{
        width: isDimension ? 5 : 4,
        alignSelf: 'stretch',
        borderRadius: isDimension ? '10px 0 0 10px' : '8px 0 0 8px',
        background: meta.color,
        flexShrink: 0,
      }} />

      {/* Content */}
      <div style={{ flex: 1, padding: '0 8px', minWidth: 0 }}>
        {isDimension && (
          <div style={{ fontSize: 9, color: meta.color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>
            {meta.label}
          </div>
        )}
        <div style={{
          fontSize: isDimension ? 13 : 13,
          fontWeight: isDimension ? 600 : 500,
          color: isDimension ? '#1E293B' : '#334155',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: isDimension ? '1.2' : '1.4',
        }}>
          {node.title}
        </div>
        {!isDimension && (
          <div style={{ fontSize: 10, color: meta.color, opacity: 0.7, letterSpacing: '0.03em', marginTop: 1 }}>
            {meta.label}
          </div>
        )}
      </div>

      {/* Right: description dot + priority */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 10, flexShrink: 0 }}>
        {node.description && (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CBD5E1' }} title="有描述" />
        )}
        {node.priority && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: PRIORITY_META[node.priority].color,
          }} />
        )}
      </div>

      {/* Drop indicator line */}
      {isDropTarget && (
        <div style={{
          position: 'absolute', bottom: -3, left: 12, right: 12,
          height: 2, borderRadius: 1, background: '#4F46E5',
        }} />
      )}
    </div>
  )
}
