'use client'
import { useState, useReducer } from 'react'
import { MindMap } from '@/components/MindMap'
import { TaskList } from '@/components/TaskList'
import { reducer, AppState } from '@/lib/store'
import { MindNode } from '@/lib/types'

interface MapData {
  title: string
  nodes: Record<string, MindNode>
  rootId: string
}

function ShareMapView({ title, nodes, rootId }: MapData) {
  const [view, setView] = useState<'mindmap' | 'list'>('mindmap')

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
  }

  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12, flexShrink: 0,
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', padding: '3px 4px' }}>
          {title}
        </span>
        <span style={{
          fontSize: 11, color: '#64748B', background: '#F1F5F9',
          borderRadius: 4, padding: '2px 8px',
        }}>
          只读
        </span>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 2, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
          {(['mindmap', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none',
                fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: view === v ? 600 : 400,
                background: view === v ? '#fff' : 'transparent',
                color: view === v ? '#1E293B' : '#64748B',
                boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {v === 'mindmap' ? '思维导图' : '任务列表'}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {view === 'mindmap' ? (
          <MindMap state={state} dispatch={dispatch} />
        ) : (
          <TaskList
            nodes={state.nodes}
            rootId={state.rootId}
            onSelect={() => {}}
            onUpdateStatus={() => {}}
          />
        )}
      </div>
    </div>
  )
}

export function ShareViewer({ shareToken }: { shareToken: string }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mapData, setMapData] = useState<MapData | null>(null)

  async function verify() {
    if (!password) return
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
        setError(data.error || '验证失败')
        return
      }
      let nodes: Record<string, MindNode> = {}
      try { nodes = JSON.parse(data.nodesJson) } catch {}
      setMapData({ title: data.title, nodes, rootId: data.rootId })
    } finally {
      setLoading(false)
    }
  }

  if (mapData) {
    return <ShareMapView title={mapData.title} nodes={mapData.nodes} rootId={mapData.rootId} />
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 48px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        width: 360, maxWidth: '90vw',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
          查看分享内容
        </div>
        <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 28 }}>
          请输入分享密码以继续
        </div>
        <input
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && verify()}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
            border: error ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
            marginBottom: error ? 8 : 16,
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 16 }}>{error}</div>
        )}
        <button
          onClick={verify}
          disabled={loading || !password}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
            background: loading || !password ? '#E2E8F0' : '#4F46E5',
            color: loading || !password ? '#94A3B8' : '#fff',
            fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
            cursor: loading || !password ? 'default' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '验证中…' : '进入'}
        </button>
      </div>
    </div>
  )
}
