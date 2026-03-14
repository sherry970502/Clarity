'use client'
import { useReducer, useEffect, useCallback } from 'react'
import { reducer, initialState, AppState } from '@/lib/store'
import { MindMap } from '@/components/MindMap'
import { DetailPanel } from '@/components/DetailPanel'
import { TaskList } from '@/components/TaskList'
import { ContextMenu } from '@/components/ContextMenu'
import { NodeType, Priority } from '@/lib/types'

const STORAGE_KEY = 'clarity-v1'

function loadState(): AppState {
  if (typeof window === 'undefined') return initialState
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initialState, ...JSON.parse(raw), ctx: null, dragId: null, dropId: null, newNodeId: null }
  } catch {}
  return initialState
}

export default function Page() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ctx, dragId, dropId, newNodeId, ...toSave } = state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }, [state])

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
      dispatch({ type: 'DELETE', nodeId: sel })
    } else if (e.key === 'Escape') {
      dispatch({ type: 'SELECT', id: null })
      dispatch({ type: 'CLOSE_CTX' })
    }
  }, [state.selectedId, state.rootId])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const selNode = state.selectedId ? state.nodes[state.selectedId] : null

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#F8FAFC',
    }}>
      {/* Header */}
      <header style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16, flexShrink: 0,
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.02em' }}>
            Clarity
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.02em' }}>
            战略思维工具
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
          {(['mindmap', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => dispatch({ type: 'SET_VIEW', view: v })}
              style={{
                padding: '5px 14px', borderRadius: 6, border: 'none',
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

        <button
          onClick={() => {
            if (confirm('重置为示例数据？当前内容将丢失。')) {
              localStorage.removeItem(STORAGE_KEY)
              window.location.reload()
            }
          }}
          style={{
            padding: '5px 12px', borderRadius: 6, border: '1px solid #E2E8F0',
            fontSize: 11, fontFamily: 'inherit', cursor: 'pointer',
            background: '#fff', color: '#94A3B8',
          }}
        >
          重置
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
          onClose={() => dispatch({ type: 'SELECT', id: null })}
          onUpdate={patch => state.selectedId && dispatch({ type: 'UPDATE', nodeId: state.selectedId, patch })}
          onClearNew={() => dispatch({ type: 'CLEAR_NEW' })}
        />
      </div>

      {state.ctx && (
        <ContextMenu
          x={state.ctx.x}
          y={state.ctx.y}
          nodeId={state.ctx.nodeId}
          isRoot={state.ctx.nodeId === state.rootId}
          onAddChild={() => {
            dispatch({ type: 'ADD_CHILD', parentId: state.ctx!.nodeId })
            dispatch({ type: 'CLOSE_CTX' })
          }}
          onAddSibling={() => {
            dispatch({ type: 'ADD_SIBLING', nodeId: state.ctx!.nodeId })
            dispatch({ type: 'CLOSE_CTX' })
          }}
          onDelete={() => {
            dispatch({ type: 'DELETE', nodeId: state.ctx!.nodeId })
            dispatch({ type: 'CLOSE_CTX' })
          }}
          onChangeType={(t: NodeType) => {
            dispatch({ type: 'UPDATE', nodeId: state.ctx!.nodeId, patch: { type: t } })
            dispatch({ type: 'CLOSE_CTX' })
          }}
          onChangePriority={(p: Priority | null) => {
            dispatch({ type: 'UPDATE', nodeId: state.ctx!.nodeId, patch: { priority: p } })
            dispatch({ type: 'CLOSE_CTX' })
          }}
          onClose={() => dispatch({ type: 'CLOSE_CTX' })}
        />
      )}
    </div>
  )
}
