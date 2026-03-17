'use client'
import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { MindNode, NodeTypeDef, getTypeMeta, PRIORITY_META } from '@/lib/types'
import { calcLayout, getNodeH, NODE_W, NODE_H, H_GAP } from '@/lib/layout'
import { AppState, Action } from '@/lib/store'

interface Props {
  state: AppState
  dispatch: (a: Action) => void
  customTypes: NodeTypeDef[]
  starView: boolean
  onNavigateToMap: (mapId: string) => void
  onFocusNode: (nodeId: string) => void
}

interface DragBox { x: number; y: number; w: number; h: number }

interface HoverInfo {
  nodeId: string
  // Screen-space rect of the node
  left: number; top: number; right: number; bottom: number
}

export function MindMap({ state, dispatch, customTypes, starView, onNavigateToMap, onFocusNode }: Props) {
  const { nodes, rootId, selectedId, selectedIds, panX, panY, scale, dragId, dropId, collapsedIds } = state

  // Star view: compute which nodes to show (starred + their ancestors)
  const starViewData = useMemo(() => {
    if (!starView) return null
    const starredIds = new Set(Object.values(nodes).filter(n => n.starred).map(n => n.id))
    const ancestorIds = new Set<string>()
    for (const sid of starredIds) {
      let cur = nodes[sid]
      while (cur?.parentId) { ancestorIds.add(cur.parentId); cur = nodes[cur.parentId] }
    }
    const visibleIds = new Set([...starredIds, ...ancestorIds])
    const filteredNodes: Record<string, MindNode> = {}
    for (const id of visibleIds) {
      const n = nodes[id]
      if (n) filteredNodes[id] = { ...n, children: n.children.filter(c => visibleIds.has(c)) }
    }
    return { filteredNodes, starredIds, ancestorIds }
  }, [starView, nodes])

  const renderNodes = starViewData ? starViewData.filteredNodes : nodes

  const positions = useMemo(
    () => calcLayout(renderNodes, rootId, collapsedIds, customTypes),
    [renderNodes, rootId, collapsedIds, customTypes],
  )

  // Compute canvas bounding box accounting for variable node heights
  const allEntries = Object.entries(positions)
  const minX = Math.min(...allEntries.map(([, p]) => p.x), 0) - 120
  const minY = Math.min(...allEntries.map(([, p]) => p.y), 0) - 120
  const maxX = Math.max(...allEntries.map(([, p]) => p.x), 0) + NODE_W + 200
  const maxY = Math.max(...allEntries.map(([id, p]) => p.y + getNodeH(nodes[id], customTypes)), 0) + 200
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

  // Hover preview state
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltDown(true) }
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltDown(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const handleHoverEnter = useCallback((nodeId: string, rect: DOMRect) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setHoverInfo({ nodeId, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })
    }, 280)
  }, [])

  const handleHoverLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoverInfo(null)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setHoverInfo(null)
    if (e.button === 1) {
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
      const bx1 = (dragBox.x - rect.left - panX) / scale
      const by1 = (dragBox.y - rect.top - panY) / scale
      const bx2 = bx1 + dragBox.w / scale
      const by2 = by1 + dragBox.h / scale

      const selected: string[] = []
      for (const [id, pos] of Object.entries(positions)) {
        const nx = pos.x - minX
        const ny = pos.y - minY
        const nh = getNodeH(nodes[id], customTypes)
        if (nx < bx2 && nx + NODE_W > bx1 && ny < by2 && ny + nh > by1) {
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
      dispatch({ type: 'CLEAR_SELECTION' })
      dispatch({ type: 'CLOSE_CTX' })
    }
    interactRef.current.mode = 'none'
    setDragBox(null)
  }, [dragBox, panX, panY, scale, positions, minX, minY, nodes, customTypes, dispatch])

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

  // Build edges using dynamic type colors and variable node heights
  const edges: React.ReactNode[] = []
  for (const [id, n] of Object.entries(renderNodes)) {
    const p = positions[id]
    if (!p) continue
    for (const cid of [...new Set(n.children)]) {
      const cp = positions[cid]
      if (!cp) continue
      if (renderNodes[cid]?.parentId !== id) continue
      const parentH = getNodeH(n, customTypes)
      const childH = getNodeH(renderNodes[cid], customTypes)
      const x1 = p.x - minX + NODE_W
      const y1 = p.y - minY + parentH / 2
      const x2 = cp.x - minX
      const y2 = cp.y - minY + childH / 2
      const mx = (x1 + x2) / 2
      const childType = renderNodes[cid]?.type ?? 'task'
      const isSelected = selectedIds.includes(cid)
      const isGhostEdge = starViewData && !starViewData.starredIds.has(cid)
      const meta = getTypeMeta(childType, customTypes)
      const isDimension = childType === 'dimension'
      const color = isGhostEdge ? '#CBD5E1' : isSelected ? meta.color : isDimension ? '#94A3B8' : meta.color + '55'
      edges.push(
        <path key={`${id}-${cid}`}
          d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
          fill="none" stroke={color}
          strokeWidth={isSelected || dropId === cid ? 2 : 1.5}
          strokeDasharray={isGhostEdge ? '4 4' : renderNodes[cid]?.type === 'pending' ? '4 3' : undefined}
          opacity={isGhostEdge ? 0.45 : 1}
        />
      )
    }
  }

  const hoveredNode = hoverInfo ? nodes[hoverInfo.nodeId] : null

  const cursor = altDown ? 'grab' : dragBox ? 'crosshair' : 'default'

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor,
        background: 'radial-gradient(circle at 50% 50%, #F8FAFC 0%, #F1F5F9 100%)' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { onMouseUp({} as React.MouseEvent); handleHoverLeave() }}
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

        {/* Star view empty state */}
        {starView && starViewData && starViewData.starredIds.size === 0 && (
          <div style={{
            position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', color: '#94A3B8', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>☆</div>
            <div style={{ fontSize: 14 }}>还没有星标节点</div>
            <div style={{ fontSize: 12, marginTop: 4, color: '#CBD5E1' }}>右键节点 → 加星标</div>
          </div>
        )}

        {Object.entries(positions).map(([id, pos]) => {
          const n = renderNodes[id]
          if (!n) return null
          const nodeH = getNodeH(n, customTypes)
          const isGhost = !!(starViewData && starViewData.ancestorIds.has(id))
          return (
            <NodeCard key={id} node={n}
              x={pos.x - minX} y={pos.y - minY}
              nodeH={nodeH}
              selected={selectedId === id}
              multiSelected={selectedIds.includes(id)}
              isDragging={dragId === id}
              isDropTarget={dropId === id}
              isRoot={!n.parentId}
              isCollapsed={collapsedIds.includes(id)}
              isGhost={isGhost}
              dragId={dragId}
              customTypes={customTypes}
              onNavigateToMap={onNavigateToMap}
              onHoverEnter={handleHoverEnter}
              onHoverLeave={handleHoverLeave}
              onFocusNode={onFocusNode}
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
          border: '1.5px solid #4F46E5', background: 'rgba(79,70,229,0.07)', borderRadius: 3,
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
        <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: '#CBD5E1', pointerEvents: 'none' }}>
          拖拽框选 · Alt+拖拽平移 · Ctrl+滚轮缩放
        </div>
      )}

      {/* Double-click hint */}
      {!altDown && !dragBox && (
        <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 10, color: '#CBD5E1', pointerEvents: 'none' }}>
          双击节点查看详情
        </div>
      )}

      {/* Hover preview card */}
      {hoveredNode && hoverInfo && (
        <HoverPreview node={hoveredNode} info={hoverInfo} customTypes={customTypes} />
      )}
    </div>
  )
}

// ─── Hover Preview ────────────────────────────────────────────────────────────

interface HoverPreviewProps {
  node: MindNode
  info: HoverInfo
  customTypes: NodeTypeDef[]
}

function HoverPreview({ node, info, customTypes }: HoverPreviewProps) {
  const meta = getTypeMeta(node.type, customTypes)
  const cardW = 300
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  // Appear to the right of the node, flip left if not enough space
  const left = info.right + 14 + cardW > vw ? info.left - cardW - 14 : info.right + 14
  const top = info.top

  return (
    <div style={{
      position: 'fixed', left, top, width: cardW, zIndex: 500,
      background: '#fff', borderRadius: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
      border: `1px solid ${meta.color}22`,
      padding: '14px 16px',
      fontFamily: 'system-ui, sans-serif',
      pointerEvents: 'none',
      animation: 'fadeInScale 0.12s ease-out',
    }}>
      <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
      {/* Type badge */}
      {node.type && (
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            background: meta.bg, color: meta.color,
            padding: '2px 7px', borderRadius: 4,
            border: `1px solid ${meta.color}22`,
          }}>
            {meta.label}
          </span>
        </div>
      )}
      {/* Full title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', lineHeight: 1.4, marginBottom: node.description ? 8 : 0 }}>
        {node.title}
      </div>
      {/* Description excerpt */}
      {node.description && (
        <div style={{
          fontSize: 12, color: '#64748B', lineHeight: 1.6,
          display: '-webkit-box', WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {node.description}
        </div>
      )}
      {/* Footer hint */}
      <div style={{ marginTop: 10, fontSize: 10, color: '#CBD5E1' }}>双击查看完整内容</div>
    </div>
  )
}

// ─── NodeCard ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: MindNode; x: number; y: number; nodeH: number
  selected: boolean; multiSelected: boolean
  isDragging: boolean; isDropTarget: boolean; isRoot: boolean
  isCollapsed: boolean; isGhost: boolean
  dragId: string | null
  customTypes: NodeTypeDef[]
  onNavigateToMap: (mapId: string) => void
  onHoverEnter: (nodeId: string, rect: DOMRect) => void
  onHoverLeave: () => void
  onFocusNode: (nodeId: string) => void
  dispatch: (a: Action) => void
}

function NodeCard({
  node, x, y, nodeH, selected, multiSelected, isDragging, isDropTarget, isRoot,
  isCollapsed, isGhost, dragId, customTypes, onNavigateToMap, onHoverEnter, onHoverLeave, onFocusNode, dispatch,
}: NodeCardProps) {
  const [cardHovered, setCardHovered] = useState(false)
  const meta = getTypeMeta(node.type, customTypes)
  const isEmpty = !node.type
  const isDimension = node.type === 'dimension' || isRoot
  const isWrapTitle = !isDimension
  const isHighlighted = selected || multiSelected
  const isDone = node.status === 'done'

  // Ghost mode: ancestor node in star view — simplified, dimmed card
  if (isGhost) {
    return (
      <div data-node={node.id} style={{
        position: 'absolute', left: x, top: y,
        width: NODE_W, height: nodeH,
        background: '#F8FAFC', border: '1px solid #E2E8F0',
        borderRadius: isDimension ? 10 : 8,
        display: 'flex', alignItems: 'center',
        opacity: 0.35, cursor: 'pointer', userSelect: 'none',
      }}
        onClick={e => { e.stopPropagation(); dispatch({ type: 'SELECT', id: node.id }) }}
      >
        <div style={{ width: isDimension ? 5 : 4, alignSelf: 'stretch', borderRadius: isDimension ? '10px 0 0 10px' : '8px 0 0 8px', background: '#CBD5E1', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '0 8px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.title}
          </div>
        </div>
      </div>
    )
  }

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
      width: NODE_W, height: nodeH,
      background: bg, border,
      borderRadius: isDimension ? 10 : 8, boxShadow: shadow,
      display: 'flex', alignItems: 'center', cursor: 'pointer',
      opacity: isDragging ? 0.4 : isDone ? 0.55 : 1,
      transition: 'box-shadow 0.15s, border-color 0.15s, opacity 0.15s',
      userSelect: 'none',
    }}
      draggable={!isRoot}
      onClick={e => { e.stopPropagation(); e.shiftKey ? dispatch({ type: 'MULTI_SELECT', id: node.id }) : dispatch({ type: 'SELECT', id: node.id }) }}
      onDoubleClick={e => { e.stopPropagation(); onFocusNode(node.id) }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); dispatch({ type: 'OPEN_CTX', x: e.clientX, y: e.clientY, nodeId: node.id }) }}
      onDragStart={e => { e.stopPropagation(); dispatch({ type: 'DRAG_START', nodeId: node.id }); e.dataTransfer.effectAllowed = 'move' }}
      onDragEnd={() => dispatch({ type: 'DRAG_END' })}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); dispatch({ type: 'DRAG_OVER', nodeId: node.id }) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragId) dispatch({ type: 'REPARENT', nodeId: dragId, newParentId: node.id }) }}
      onMouseEnter={e => { setCardHovered(true); onHoverEnter(node.id, e.currentTarget.getBoundingClientRect()) }}
      onMouseLeave={() => { setCardHovered(false); onHoverLeave() }}
    >
      {/* Left accent bar */}
      <div style={{ width: isDimension ? 5 : 4, alignSelf: 'stretch', borderRadius: isDimension ? '10px 0 0 10px' : '8px 0 0 8px', background: meta.color, flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, padding: '0 8px', minWidth: 0, overflow: 'hidden' }}>
        {isDimension && node.type === 'dimension' && (
          <div style={{ fontSize: 9, color: meta.color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 1 }}>{meta.label}</div>
        )}
        <div style={{
          fontSize: 13, fontWeight: isDimension ? 600 : 500,
          color: isDimension ? '#1E293B' : '#334155',
          lineHeight: isDimension ? '1.2' : '1.4',
          // wrapTitle: wrap up to 2 lines; others: single line ellipsis
          ...(isWrapTitle ? {
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
            whiteSpace: 'normal',
          } : {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }),
        }}>
          {node.title}
        </div>
        {!isDimension && !isEmpty && (
          <div style={{ fontSize: 10, color: meta.color, opacity: 0.7, letterSpacing: '0.03em', marginTop: 2 }}>{meta.label}</div>
        )}
      </div>

      {/* Right indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: node.children.length > 0 ? 16 : 10, flexShrink: 0 }}>
        {/* Star indicator */}
        <span
          onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_STAR', nodeId: node.id }) }}
          title={node.starred ? '取消星标' : '加星标'}
          style={{
            fontSize: 10, lineHeight: 1, cursor: 'pointer',
            color: '#F59E0B',
            opacity: node.starred ? 0.9 : cardHovered ? 0.3 : 0,
            transition: 'opacity 0.15s',
          }}
        >★</span>
        {multiSelected && <div style={{ width: 14, height: 14, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span></div>}
        {node.priority && !multiSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_META[node.priority].color }} />}
        {isDone && !multiSelected && (
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>
          </div>
        )}
      </div>

      {/* mapLink icon — top-right corner, small */}
      {node.mapLink && !multiSelected && (
        <div
          title="跳转到关联图谱"
          onClick={e => { e.stopPropagation(); onNavigateToMap(node.mapLink!) }}
          style={{
            position: 'absolute', top: -1, right: node.children.length > 0 ? 10 : 2,
            width: 14, height: 14, borderRadius: 3,
            background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 11,
            boxShadow: '0 1px 3px rgba(79,70,229,0.3)',
          }}
        >
          <span style={{ color: '#fff', fontSize: 8, lineHeight: 1, fontWeight: 700 }}>↗</span>
        </div>
      )}

      {isDropTarget && <div style={{ position: 'absolute', bottom: -3, left: 12, right: 12, height: 2, borderRadius: 1, background: '#4F46E5' }} />}

      {/* Collapse toggle */}
      {node.children.length > 0 && (
        <div
          onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_COLLAPSE', nodeId: node.id }) }}
          title={isCollapsed ? `展开 ${node.children.length} 个子节点` : '折叠'}
          style={{
            position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)',
            width: 18, height: 18, borderRadius: '50%',
            background: isCollapsed ? meta.color : '#fff',
            border: `1.5px solid ${meta.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            transition: 'background 0.15s',
            fontSize: 9, fontWeight: 700, lineHeight: 1,
            color: isCollapsed ? '#fff' : meta.color,
          }}
        >
          {isCollapsed ? node.children.length : '−'}
        </div>
      )}
    </div>
  )
}
