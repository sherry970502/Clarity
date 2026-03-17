'use client'
import { useState, useReducer } from 'react'
import { reducer, AppState } from '@/lib/store'
import { MindMap } from '@/components/MindMap'
import { TaskList } from '@/components/TaskList'
import { MindNode, NodeTypeDef } from '@/lib/types'
import { TEMPLATES } from '@/lib/templates'
import { NodeFocusModal } from '@/components/NodeFocusModal'

function ShareMapView({ title, nodes, rootId, customTypes }: { title: string; nodes: Record<string, MindNode>; rootId: string; customTypes: NodeTypeDef[] }) {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const initialState: AppState = {
    nodes,
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
    customTypes,
  }
  const [state, dispatch] = useReducer(reducer, initialState)

  const readOnlyDispatch: typeof dispatch = (action) => {
    const blocked = ['UPDATE', 'UPDATE_MULTI', 'ADD_CHILD', 'ADD_SIBLING', 'DELETE', 'DELETE_MULTI', 'REPARENT', 'MOVE_UP', 'MOVE_DOWN']
    if (blocked.includes(action.type)) return
    dispatch(action)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12, flexShrink: 0,
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{title}</span>
        <span style={{
          fontSize: 11, color: '#64748B', background: '#F1F5F9',
          borderRadius: 4, padding: '2px 8px', border: '1px solid #E2E8F0',
        }}>只读</span>
        <div style={{ flex: 1 }} />
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
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {state.view === 'mindmap' ? (
          <MindMap state={state} dispatch={readOnlyDispatch} customTypes={customTypes} starView={false} onNavigateToMap={() => {}} onFocusNode={setFocusedNodeId} />
        ) : (
          <TaskList
            nodes={state.nodes}
            rootId={state.rootId}
            customTypes={customTypes}
            onSelect={() => {}}
            onUpdateStatus={() => {}}
          />
        )}
      </div>

      {focusedNodeId && state.nodes[focusedNodeId] && (
        <NodeFocusModal
          node={state.nodes[focusedNodeId]}
          customTypes={customTypes}
          allMaps={[]}
          onClose={() => setFocusedNodeId(null)}
          onNavigateToMap={() => {}}
        />
      )}
    </div>
  )
}

export function ShareViewer({ shareToken }: { shareToken: string }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mapData, setMapData] = useState<{ title: string; nodes: Record<string, MindNode>; rootId: string; customTypes: NodeTypeDef[] } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/share/${shareToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '请求失败')
      } else {
        let customTypes: NodeTypeDef[] = TEMPLATES[0].types
        try { if (data.customTypesJson) customTypes = JSON.parse(data.customTypesJson) } catch {}
        setMapData({
          title: data.title,
          nodes: JSON.parse(data.nodesJson),
          rootId: data.rootId,
          customTypes,
        })
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (mapData) {
    return <ShareMapView title={mapData.title} nodes={mapData.nodes} rootId={mapData.rootId} customTypes={mapData.customTypes} />
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 48px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: 360,
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#1E293B' }}>查看共享导图</h2>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94A3B8' }}>请输入访问密码</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="输入密码"
            autoFocus
            style={{
              padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
              fontSize: 14, outline: 'none', fontFamily: 'inherit',
            }}
          />
          {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            style={{
              padding: '10px', borderRadius: 8, border: 'none',
              background: '#4F46E5', color: '#fff', fontSize: 14,
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading || !password.trim() ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading ? '验证中…' : '进入'}
          </button>
        </form>
      </div>
    </div>
  )
}
