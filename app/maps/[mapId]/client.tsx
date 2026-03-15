'use client'
import { useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { reducer, AppState } from '@/lib/store'
import { MindMap } from '@/components/MindMap'
import { DetailPanel } from '@/components/DetailPanel'
import { TaskList } from '@/components/TaskList'
import { ContextMenu } from '@/components/ContextMenu'
import { MindNode, NodeType, Priority } from '@/lib/types'

interface Props {
  mapId: string
  mapTitle: string
  initialNodes: Record<string, MindNode>
  rootId: string
  userName: string
}

export function MapClient({ mapId, mapTitle, initialNodes, rootId, userName }: Props) {
  const router = useRouter()
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

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
  }

  const [state, dispatch] = useReducer(reducer, initialAppState)

  // Auto-save nodes with debounce
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
        body: JSON.stringify({ nodesJson: JSON.stringify(state.nodes) }),
      })
      setSaveStatus('saved')
    }, 1200)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nodes, mapId])

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

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
              onClick={() => dispatch({ type: 'SET_VIEW', view: v })}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none',
                fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: state.view === v ? 600 : 400,
                background: state.view === v ? '#fff' : 'transparent',
                color: state.view === v ? '#1E293B' : '#64748B',
                boxShadow: state.view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {v === 'mindmap' ? '思维导图' : '任务列表'}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: '#E2E8F0' }} />
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', color: '#94A3B8', fontSize: 11, padding: '4px 10px', fontFamily: 'inherit' }}
        >
          退出
        </button>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {state.view === 'mindmap' ? (
          <MindMap state={state} dispatch={dispatch} />
        ) : (
          <TaskList
            nodes={state.nodes}
            rootId={state.rootId}
            onSelect={id => {
              dispatch({ type: 'SELECT', id })
              dispatch({ type: 'SET_VIEW', view: 'mindmap' })
            }}
          />
        )}

        <DetailPanel
          node={selNode}
          isNew={state.newNodeId === state.selectedId && state.newNodeId !== null}
          selectedIds={state.selectedIds}
          onClose={() => dispatch({ type: 'CLEAR_SELECTION' })}
          onUpdate={patch => state.selectedId && dispatch({ type: 'UPDATE', nodeId: state.selectedId, patch })}
          onUpdateMulti={patch => dispatch({ type: 'UPDATE_MULTI', ids: state.selectedIds, patch })}
          onDeleteMulti={() => dispatch({ type: 'DELETE_MULTI', ids: state.selectedIds })}
          onClearNew={() => dispatch({ type: 'CLEAR_NEW' })}
        />
      </div>

      {state.ctx && (
        <ContextMenu
          x={state.ctx.x}
          y={state.ctx.y}
          nodeId={state.ctx.nodeId}
          isRoot={state.ctx.nodeId === state.rootId}
          onAddChild={() => { dispatch({ type: 'ADD_CHILD', parentId: state.ctx!.nodeId }); dispatch({ type: 'CLOSE_CTX' }) }}
          onAddSibling={() => { dispatch({ type: 'ADD_SIBLING', nodeId: state.ctx!.nodeId }); dispatch({ type: 'CLOSE_CTX' }) }}
          onDelete={() => { dispatch({ type: 'DELETE', nodeId: state.ctx!.nodeId }); dispatch({ type: 'CLOSE_CTX' }) }}
          onChangeType={(t: NodeType) => { dispatch({ type: 'UPDATE', nodeId: state.ctx!.nodeId, patch: { type: t } }); dispatch({ type: 'CLOSE_CTX' }) }}
          onChangePriority={(p: Priority | null) => { dispatch({ type: 'UPDATE', nodeId: state.ctx!.nodeId, patch: { priority: p } }); dispatch({ type: 'CLOSE_CTX' }) }}
          onMoveUp={() => dispatch({ type: 'MOVE_UP', nodeId: state.ctx!.nodeId })}
          onMoveDown={() => dispatch({ type: 'MOVE_DOWN', nodeId: state.ctx!.nodeId })}
          onClose={() => dispatch({ type: 'CLOSE_CTX' })}
        />
      )}
    </div>
  )
}
