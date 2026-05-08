'use client'
import { useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { reducer, AppState } from '@/lib/store'
import { MindMap } from '@/components/MindMap'
import { DetailPanel } from '@/components/DetailPanel'
import { TaskList } from '@/components/TaskList'
import { ContextMenu } from '@/components/ContextMenu'
import { MindNode, NodeTypeDef, Priority, StickyNote, getTypeMeta, PRIORITY_META } from '@/lib/types'
import { ShareModal } from '@/components/ShareModal'
import { NodeFocusModal } from '@/components/NodeFocusModal'
import { SearchModal } from '@/components/SearchModal'

function exportToExcel(nodes: Record<string, MindNode>, rootId: string, customTypes: NodeTypeDef[], mapTitle: string) {
  import('xlsx').then(XLSX => {
    // First pass: find max depth
    let maxDepth = 0
    function calcDepth(id: string, depth: number) {
      const node = nodes[id]
      if (!node) return
      if (depth > maxDepth) maxDepth = depth
      for (const childId of node.children) calcDepth(childId, depth + 1)
    }
    calcDepth(rootId, 1)

    // Second pass: build rows
    const rows: Record<string, string>[] = []

    function traverse(id: string, ancestors: string[]) {
      const node = nodes[id]
      if (!node) return
      const depth = ancestors.length + 1  // current node's level (1-based)
      const typeMeta = getTypeMeta(node.type, customTypes)

      const row: Record<string, string> = {}
      // Fill ancestor columns
      ancestors.forEach((title, i) => { row[`第${i + 1}级`] = title })
      // Current node goes in its own depth column
      row[`第${depth}级`] = node.title
      // Fill remaining depth columns with empty string
      for (let i = depth + 1; i <= maxDepth; i++) row[`第${i}级`] = ''

      row['类型'] = typeMeta.label || '—'
      row['描述'] = node.description || ''
      row['优先级'] = node.priority ? PRIORITY_META[node.priority].label : ''
      row['状态'] = node.status === 'done' ? '已完成' : node.status === 'in_progress' ? '进行中' : ''
      row['负责人'] = node.assignee || ''
      row['URL'] = node.url || ''
      row['星标'] = node.starred ? '★' : ''

      rows.push(row)
      for (const childId of node.children) traverse(childId, [...ancestors, node.title])
    }

    traverse(rootId, [])

    // Build column order: 第1级…第N级, then meta columns
    const levelCols = Array.from({ length: maxDepth }, (_, i) => `第${i + 1}级`)
    const metaCols = ['类型', '描述', '优先级', '状态', '负责人', 'URL', '星标']
    const ws = XLSX.utils.json_to_sheet(rows, { header: [...levelCols, ...metaCols] })

    // Column widths: 22 per level col, then meta widths
    ws['!cols'] = [
      ...levelCols.map(() => ({ wch: 22 })),
      { wch: 10 }, { wch: 40 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 6 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '节点列表')
    XLSX.writeFile(wb, `${mapTitle}.xlsx`)
  })
}

type Collaborator = { id: string; user: { id: string; name: string | null; email: string | null } }

function CollaboratorModal({ mapId, onClose }: { mapId: string; onClose: () => void }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/maps/${mapId}/collaborators`)
      .then(r => r.json())
      .then(data => { setCollaborators(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [mapId])

  async function invite() {
    if (!email.trim()) return
    setInviting(true)
    setError(null)
    const res = await fetch(`/api/maps/${mapId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? '邀请失败')
    } else {
      setCollaborators(prev => [...prev, data])
      setEmail('')
    }
    setInviting(false)
  }

  async function remove(userId: string) {
    setRemoving(userId)
    await fetch(`/api/maps/${mapId}/collaborators`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setCollaborators(prev => prev.filter(c => c.user.id !== userId))
    setRemoving(null)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>协作者管理</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94A3B8', lineHeight: 1 }}>×</button>
        </div>

        {/* Invite input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') invite() }}
            placeholder="输入邮箱地址"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: error ? '1px solid #EF4444' : '1px solid #E2E8F0',
              fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#1E293B',
            }}
          />
          <button
            onClick={invite}
            disabled={inviting || !email.trim()}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: inviting || !email.trim() ? '#E2E8F0' : '#4F46E5',
              color: inviting || !email.trim() ? '#94A3B8' : '#fff',
              fontSize: 13, cursor: inviting || !email.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap',
            }}
          >
            {inviting ? '邀请中…' : '邀请'}
          </button>
        </div>
        {error && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#EF4444' }}>{error}</p>}
        <p style={{ margin: '0 0 20px', fontSize: 11, color: '#94A3B8' }}>对方需要已有 Clarity 账号才能接受邀请</p>

        {/* Collaborator list */}
        <div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '16px 0', margin: 0 }}>加载中…</p>
          ) : collaborators.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 13, padding: '16px 0', margin: 0 }}>暂无协作者</p>
          ) : (
            collaborators.map(c => (
              <div key={c.user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#EEF2FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#4F46E5', flexShrink: 0,
                }}>
                  {(c.user.name ?? c.user.email ?? '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.user.name ?? '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.user.email}
                  </div>
                </div>
                <button
                  onClick={() => remove(c.user.id)}
                  disabled={removing === c.user.id}
                  style={{
                    background: 'none', border: '1px solid #FCA5A5', borderRadius: 6,
                    color: '#EF4444', fontSize: 11, padding: '3px 10px', cursor: 'pointer',
                    fontFamily: 'inherit', opacity: removing === c.user.id ? 0.5 : 1,
                  }}
                >
                  {removing === c.user.id ? '移除中' : '移除'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  mapId: string
  mapTitle: string
  initialNodes: Record<string, MindNode>
  initialCustomTypes: NodeTypeDef[]
  initialStickyNotes: StickyNote[]
  rootId: string
  userName: string
  shareToken: string | null
  allMaps: { id: string; title: string }[]
  fromMapId: string | null
  fromMapTitle: string | null
  isOwner: boolean
}

export function MapClient({
  mapId, mapTitle, initialNodes, initialCustomTypes, initialStickyNotes, rootId,
  userName, shareToken: initialShareToken,
  allMaps, fromMapId, fromMapTitle, isOwner,
}: Props) {
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showCollabModal, setShowCollabModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [navigateToNodeId, setNavigateToNodeId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [starView, setStarView] = useState(false)
  const router = useRouter()
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const isFirstCustomTypesRender = useRef(true)

  const [title, setTitle] = useState(mapTitle)
  const [editingTitle, setEditingTitle] = useState(false)

  const initialAppState: AppState = {
    nodes: initialNodes,
    rootId,
    selectedId: null,
    selectedIds: [],
    view: 'mindmap',
    ctx: null,
    panX: 0,
    panY: 0,
    scale: 1,
    dragId: null,
    dropId: null,
    newNodeId: null,
    collapsedIds: [],
    customTypes: initialCustomTypes,
    stickyNotes: initialStickyNotes,
  }

  const [state, dispatch] = useReducer(reducer, initialAppState)

  // Load collapsed state from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`clarity-collapsed-${mapId}`)
      if (saved) {
        const ids = JSON.parse(saved)
        if (ids.length > 0) dispatch({ type: 'SET_COLLAPSED_IDS', ids })
      }
    } catch {}
  }, [mapId])

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(`clarity-collapsed-${mapId}`, JSON.stringify(state.collapsedIds))
  }, [state.collapsedIds, mapId])

  // Auto-save nodes and sticky notes with debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving')
      await fetch(`/api/maps/${mapId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodesJson: JSON.stringify(state.nodes),
          stickyNotesJson: JSON.stringify(state.stickyNotes),
        }),
      })
      setSaveStatus('saved')
    }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nodes, state.stickyNotes, mapId])

  // Auto-save customTypes when they change
  useEffect(() => {
    if (isFirstCustomTypesRender.current) {
      isFirstCustomTypesRender.current = false
      return
    }
    fetch(`/api/maps/${mapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customTypesJson: JSON.stringify(state.customTypes) }),
    })
  }, [state.customTypes, mapId])

  // Save title
  async function saveTitle(newTitle: string) {
    setTitle(newTitle)
    setEditingTitle(false)
    await fetch(`/api/maps/${mapId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    })
  }

  // Navigate to a linked map, passing current map as "from"
  const handleNavigateToMap = useCallback((targetMapId: string) => {
    router.push(`/maps/${targetMapId}?from=${mapId}`)
  }, [router, mapId])

  const handleSearchNavigate = useCallback((nodeId: string) => {
    setShowSearch(false)
    setStarView(false)
    dispatch({ type: 'SET_VIEW', view: 'mindmap' })
    dispatch({ type: 'NAVIGATE_TO_NODE', nodeId })
    setNavigateToNodeId(nodeId)
  }, [dispatch])

  const handleNavigated = useCallback((nodeId: string) => {
    setNavigateToNodeId(null)
    setHighlightId(nodeId)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 1500)
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault()
      setShowSearch(true)
      return
    }
    const sel = state.selectedId
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    if (e.key === 'Tab' && sel) {
      e.preventDefault()
      dispatch({ type: 'ADD_CHILD', parentId: sel })
    } else if (e.key === 'Enter' && sel && sel !== state.rootId) {
      e.preventDefault()
      dispatch({ type: 'ADD_SIBLING', nodeId: sel })
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && sel && sel !== state.rootId) {
      e.preventDefault()
      if (state.selectedIds.length > 1) {
        dispatch({ type: 'DELETE_MULTI', ids: state.selectedIds })
      } else {
        dispatch({ type: 'DELETE', nodeId: sel })
      }
    } else if (e.key === 'ArrowUp' && e.altKey && sel && sel !== state.rootId) {
      e.preventDefault()
      dispatch({ type: 'MOVE_UP', nodeId: sel })
    } else if (e.key === 'ArrowDown' && e.altKey && sel && sel !== state.rootId) {
      e.preventDefault()
      dispatch({ type: 'MOVE_DOWN', nodeId: sel })
    } else if (e.key === 'Escape') {
      dispatch({ type: 'CLEAR_SELECTION' })
      dispatch({ type: 'CLOSE_CTX' })
    }
  }, [state.selectedId, state.selectedIds, state.rootId])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const selNode = state.selectedId ? state.nodes[state.selectedId] : null

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12, flexShrink: 0,
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 13, padding: '4px 6px', fontFamily: 'inherit' }}
        >
          ← 返回
        </button>
        <div style={{ width: 1, height: 18, background: '#E2E8F0' }} />

        {/* Editable title */}
        {editingTitle ? (
          <input
            autoFocus
            defaultValue={title}
            onBlur={e => saveTitle(e.target.value || title)}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle((e.target as HTMLInputElement).value || title) }}
            style={{
              fontSize: 14, fontWeight: 600, color: '#1E293B', border: '1px solid #4F46E5',
              borderRadius: 6, padding: '3px 8px', outline: 'none', fontFamily: 'inherit',
              background: '#FAFAFA',
            }}
          />
        ) : (
          <span
            onClick={() => setEditingTitle(true)}
            style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', cursor: 'text', padding: '3px 4px', borderRadius: 4 }}
            title="点击编辑标题"
          >
            {title}
          </span>
        )}

        {/* Save status */}
        <span style={{ fontSize: 11, color: saveStatus === 'saved' ? '#22C55E' : saveStatus === 'saving' ? '#94A3B8' : '#F59E0B' }}>
          {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中…' : '未保存'}
        </span>

        <div style={{ flex: 1 }} />

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
          {(['mindmap', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => { dispatch({ type: 'SET_VIEW', view: v }); setStarView(false) }}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none',
                fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: state.view === v && !starView ? 600 : 400,
                background: state.view === v && !starView ? '#fff' : 'transparent',
                color: state.view === v && !starView ? '#1E293B' : '#64748B',
                boxShadow: state.view === v && !starView ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {v === 'mindmap' ? '思维导图' : '任务列表'}
            </button>
          ))}
          <button
            onClick={() => { setStarView(v => !v); dispatch({ type: 'SET_VIEW', view: 'mindmap' }) }}
            style={{
              padding: '4px 10px', borderRadius: 6, border: 'none',
              fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
              fontWeight: starView ? 600 : 400,
              background: starView ? '#FFFBEB' : 'transparent',
              color: starView ? '#D97706' : '#94A3B8',
              boxShadow: starView ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            ☆ 星标
          </button>
        </div>

        {state.view === 'mindmap' && (
          <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => dispatch({ type: 'COLLAPSE_ALL' })}
              title="全部折叠"
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                background: 'transparent', color: '#64748B',
              }}
            >
              折叠
            </button>
            <button
              onClick={() => dispatch({ type: 'EXPAND_ALL' })}
              title="全部展开"
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none',
                fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                background: 'transparent', color: '#64748B',
              }}
            >
              展开
            </button>
          </div>
        )}

        <button
          onClick={() => setShowSearch(true)}
          style={{
            padding: '5px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
            background: '#fff', color: '#64748B',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          title="搜索节点 (⌘F)"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          搜索
        </button>

        <button
          onClick={() => exportToExcel(state.nodes, state.rootId, state.customTypes, title)}
          style={{
            padding: '5px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
            background: '#fff', color: '#64748B',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}
          title="导出为 Excel"
        >
          导出
        </button>

        {isOwner && (
          <button
            onClick={() => setShowCollabModal(true)}
            style={{
              padding: '5px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#fff', color: '#64748B',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            协作者
          </button>
        )}
        {!isOwner && (
          <span style={{ fontSize: 11, color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '4px 10px' }}>
            协作编辑
          </span>
        )}
        <button
          onClick={() => setShowShareModal(true)}
          style={{
            padding: '5px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
            background: shareToken ? '#EEF2FF' : '#fff',
            color: shareToken ? '#4F46E5' : '#64748B',
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {shareToken ? '分享中' : '分享'}
        </button>

        <div style={{ width: 1, height: 18, background: '#E2E8F0' }} />
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', color: '#94A3B8', fontSize: 11, padding: '4px 10px', fontFamily: 'inherit' }}
        >
          退出
        </button>
      </header>

      {/* Back navigation bar (when navigated from another map) */}
      {fromMapId && (
        <div style={{
          height: 32, background: '#EEF2FF', borderBottom: '1px solid #C7D2FE',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#6366F1' }}>来自：</span>
          <button
            onClick={() => router.push(`/maps/${fromMapId}`)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, color: '#4F46E5', fontFamily: 'inherit',
              padding: 0,
            }}
          >
            ← {fromMapTitle ?? '上一个图谱'}
          </button>
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {state.view === 'mindmap' ? (
          <MindMap
            state={state}
            dispatch={dispatch}
            customTypes={state.customTypes}
            starView={starView}
            onNavigateToMap={handleNavigateToMap}
            onFocusNode={setFocusedNodeId}
            navigateToNodeId={navigateToNodeId}
            onNavigated={handleNavigated}
            highlightId={highlightId}
          />
        ) : (
          <TaskList
            nodes={state.nodes}
            rootId={state.rootId}
            customTypes={state.customTypes}
            onSelect={id => {
              dispatch({ type: 'SELECT', id })
              dispatch({ type: 'SET_VIEW', view: 'mindmap' })
            }}
            onUpdateStatus={(id, status) => dispatch({ type: 'UPDATE', nodeId: id, patch: { status } })}
          />
        )}

        <DetailPanel
          node={selNode}
          isNew={state.newNodeId === state.selectedId && state.newNodeId !== null}
          selectedIds={state.selectedIds}
          customTypes={state.customTypes}
          allMaps={allMaps}
          currentMapId={mapId}
          onClose={() => dispatch({ type: 'CLEAR_SELECTION' })}
          onUpdate={patch => state.selectedId && dispatch({ type: 'UPDATE', nodeId: state.selectedId, patch })}
          onUpdateStatus={status => state.selectedId && dispatch({ type: 'UPDATE', nodeId: state.selectedId, patch: { status } })}
          onUpdateMulti={patch => dispatch({ type: 'UPDATE_MULTI', ids: state.selectedIds, patch })}
          onDeleteMulti={() => dispatch({ type: 'DELETE_MULTI', ids: state.selectedIds })}
          onClearNew={() => dispatch({ type: 'CLEAR_NEW' })}
          onAddCustomType={typeDef => dispatch({ type: 'ADD_CUSTOM_TYPE', typeDef })}
          onNavigateToMap={handleNavigateToMap}
        />
      </div>

      {showSearch && (
        <SearchModal
          nodes={state.nodes}
          rootId={state.rootId}
          customTypes={state.customTypes}
          collapsedIds={state.collapsedIds}
          onNavigate={handleSearchNavigate}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showCollabModal && (
        <CollaboratorModal mapId={mapId} onClose={() => setShowCollabModal(false)} />
      )}

      {showShareModal && (
        <ShareModal
          mapId={mapId}
          shareToken={shareToken}
          onClose={() => setShowShareModal(false)}
          onShareChange={setShareToken}
        />
      )}

      {focusedNodeId && state.nodes[focusedNodeId] && (
        <NodeFocusModal
          node={state.nodes[focusedNodeId]}
          customTypes={state.customTypes}
          allMaps={allMaps}
          onClose={() => setFocusedNodeId(null)}
          onNavigateToMap={handleNavigateToMap}
        />
      )}

      {state.ctx && (
        <ContextMenu
          x={state.ctx.x}
          y={state.ctx.y}
          nodeId={state.ctx.nodeId}
          isRoot={state.ctx.nodeId === state.rootId}
          isStarred={!!state.nodes[state.ctx.nodeId]?.starred}
          hasChildren={!!state.nodes[state.ctx.nodeId]?.children.length}
          customTypes={state.customTypes}
          onAddChild={() => { dispatch({ type: 'ADD_CHILD', parentId: state.ctx!.nodeId }); dispatch({ type: 'CLOSE_CTX' }) }}
          onAddSibling={() => { dispatch({ type: 'ADD_SIBLING', nodeId: state.ctx!.nodeId }); dispatch({ type: 'CLOSE_CTX' }) }}
          onDelete={() => { dispatch({ type: 'DELETE', nodeId: state.ctx!.nodeId }); dispatch({ type: 'CLOSE_CTX' }) }}
          onChangeType={(t: string) => { dispatch({ type: 'UPDATE', nodeId: state.ctx!.nodeId, patch: { type: t } }); dispatch({ type: 'CLOSE_CTX' }) }}
          onChangePriority={(p: Priority | null) => { dispatch({ type: 'UPDATE', nodeId: state.ctx!.nodeId, patch: { priority: p } }); dispatch({ type: 'CLOSE_CTX' }) }}
          onToggleStar={() => dispatch({ type: 'TOGGLE_STAR', nodeId: state.ctx!.nodeId })}
          onSortChildren={() => { dispatch({ type: 'SORT_CHILDREN_BY_PRIORITY', nodeId: state.ctx!.nodeId }); dispatch({ type: 'CLOSE_CTX' }) }}
          onMoveUp={() => dispatch({ type: 'MOVE_UP', nodeId: state.ctx!.nodeId })}
          onMoveDown={() => dispatch({ type: 'MOVE_DOWN', nodeId: state.ctx!.nodeId })}
          onClose={() => dispatch({ type: 'CLOSE_CTX' })}
        />
      )}
    </div>
  )
}
