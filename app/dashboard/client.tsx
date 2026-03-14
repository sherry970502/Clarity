'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface MapItem {
  id: string
  title: string
  updatedAt: Date | string
  createdAt: Date | string
}

interface Props {
  maps: MapItem[]
  userName: string
}

export function DashboardClient({ maps: initialMaps, userName }: Props) {
  const router = useRouter()
  const [maps, setMaps] = useState(initialMaps)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function createMap() {
    if (creating) return
    setCreating(true)
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle || '新战略图' }),
    })
    const map = await res.json()
    setCreating(false)
    setShowCreate(false)
    setNewTitle('')
    router.push(`/maps/${map.id}`)
  }

  async function deleteMap(id: string) {
    if (!confirm('确认删除这张战略图？')) return
    setDeleting(id)
    await fetch(`/api/maps/${id}`, { method: 'DELETE' })
    setMaps(prev => prev.filter(m => m.id !== id))
    setDeleting(null)
  }

  function formatDate(d: Date | string) {
    const date = new Date(d)
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #E2E8F0',
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.02em' }}>Clarity</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#64748B' }}>{userName}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{
            padding: '5px 12px', borderRadius: 6, border: '1px solid #E2E8F0',
            fontSize: 12, cursor: 'pointer', background: '#fff', color: '#94A3B8',
            fontFamily: 'inherit',
          }}
        >
          退出
        </button>
      </header>

      {/* Body */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>我的战略图</h1>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>把思考和执行放在同一个地方</p>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#4F46E5', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + 新建
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
            padding: '20px', marginBottom: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 10 }}>新建战略图</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createMap() }}
                placeholder="战略图名称…"
                style={{
                  flex: 1, border: '1px solid #E2E8F0', borderRadius: 6,
                  padding: '8px 10px', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', color: '#1E293B',
                }}
              />
              <button onClick={createMap} disabled={creating} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4F46E5', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                {creating ? '…' : '创建'}
              </button>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#64748B', fontFamily: 'inherit' }}>
                取消
              </button>
            </div>
          </div>
        )}

        {/* Map grid */}
        {maps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#CBD5E1' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗺</div>
            <div style={{ fontSize: 15, color: '#94A3B8' }}>还没有战略图，点击「新建」开始</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {maps.map(m => (
              <div
                key={m.id}
                style={{
                  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
                  padding: '18px 18px 14px', cursor: 'pointer',
                  transition: 'box-shadow 0.15s', position: 'relative',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                onClick={() => router.push(`/maps/${m.id}`)}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>🗺</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.title}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  更新于 {formatDate(m.updatedAt)}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteMap(m.id) }}
                  disabled={deleting === m.id}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#CBD5E1', fontSize: 14, padding: '2px 6px', borderRadius: 4,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#CBD5E1')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
