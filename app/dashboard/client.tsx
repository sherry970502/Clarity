'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { TEMPLATES } from '@/lib/templates'

interface MapItem {
  id: string
  title: string
  updatedAt: Date | string
  createdAt: Date | string
  collaborators?: { user: { id: string; name: string } }[]
  isCollaborated?: boolean
  ownerName?: string
}

interface Props {
  maps: MapItem[]
  collaboratedMaps: MapItem[]
  userName: string
}

export function DashboardClient({ maps: initialMaps, collaboratedMaps: initialCollaboratedMaps, userName }: Props) {
  const router = useRouter()
  const [maps, setMaps] = useState(initialMaps)
  const [collaboratedMaps] = useState(initialCollaboratedMaps)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearchQuery('')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const q = searchQuery.toLowerCase().trim()
  const filteredMaps = q ? maps.filter(m => m.title.toLowerCase().includes(q)) : maps
  const filteredCollaborated = q ? collaboratedMaps.filter(m => m.title.toLowerCase().includes(q)) : collaboratedMaps

  async function createMap() {
    if (creating) return
    setCreating(true)
    const res = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle || '新战略图', templateId: selectedTemplate }),
    })
    const map = await res.json()
    setCreating(false)
    setShowCreate(false)
    setNewTitle('')
    setSelectedTemplate(TEMPLATES[0].id)
    router.push(`/maps/${map.id}`)
  }

  async function deleteMap(id: string) {
    if (!confirm('确认删除这张战略图？')) return
    setDeleting(id)
    await fetch(`/api/maps/${id}`, { method: 'DELETE' })
    setMaps(prev => prev.filter(m => m.id !== id))
    setDeleting(null)
  }

  async function duplicateMap(id: string) {
    setDuplicating(id)
    const res = await fetch(`/api/maps/${id}/duplicate`, { method: 'POST' })
    const copy = await res.json()
    setMaps(prev => [copy, ...prev])
    setDuplicating(null)
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>我的战略图</h1>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>把思考和执行放在同一个地方</p>
          </div>
          <div style={{ flex: 1 }} />
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: '#94A3B8', pointerEvents: 'none',
            }}>🔍</span>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索图谱…"
              style={{
                width: 200, padding: '7px 10px 7px 30px',
                border: '1px solid #E2E8F0', borderRadius: 8,
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
                background: searchQuery ? '#fff' : '#F8FAFC',
                color: '#1E293B', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94A3B8', fontSize: 14, padding: '0 2px', lineHeight: 1,
                }}
              >×</button>
            )}
          </div>
          <div style={{ fontSize: 10, color: '#CBD5E1', whiteSpace: 'nowrap' }}>⌘K</div>
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
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 14 }}>新建战略图</div>

            {/* Template selection */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>选择模板</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {TEMPLATES.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    style={{
                      flex: 1, padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${selectedTemplate === tpl.id ? '#4F46E5' : '#E2E8F0'}`,
                      background: selectedTemplate === tpl.id ? '#EEF2FF' : '#FAFAFA',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: selectedTemplate === tpl.id ? '#4F46E5' : '#1E293B', marginBottom: 3 }}>
                      {tpl.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>{tpl.description}</div>
                    {/* Type preview */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {tpl.types.filter(t => t.id !== 'dimension').slice(0, 5).map(t => (
                        <span key={t.id} style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 3,
                          background: t.bg, color: t.color, border: `1px solid ${t.color}33`,
                        }}>{t.label}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Title input */}
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
        ) : filteredMaps.length === 0 && filteredCollaborated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, color: '#94A3B8' }}>没有匹配「{searchQuery}」的图谱</div>
            <button
              onClick={() => setSearchQuery('')}
              style={{ marginTop: 12, fontSize: 12, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              清除搜索
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {filteredMaps.map(m => (
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
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: m.collaborators && m.collaborators.length > 0 ? 6 : 0 }}>
                  更新于 {formatDate(m.updatedAt)}
                </div>
                {m.collaborators && m.collaborators.length > 0 && (
                  <div style={{ fontSize: 10, color: '#6366F1', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>👥</span>
                    <span>{m.collaborators.length} 位协作者</span>
                  </div>
                )}
                {/* Duplicate button */}
                <button
                  onClick={e => { e.stopPropagation(); duplicateMap(m.id) }}
                  disabled={duplicating === m.id}
                  title="复制图谱"
                  style={{
                    position: 'absolute', top: 12, right: 34,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#CBD5E1', fontSize: 12, padding: '2px 4px', borderRadius: 4,
                    opacity: duplicating === m.id ? 0.4 : 1,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#4F46E5')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#CBD5E1')}
                >
                  {duplicating === m.id ? '…' : '⧉'}
                </button>
                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); deleteMap(m.id) }}
                  disabled={deleting === m.id}
                  title="删除图谱"
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

        {/* Collaborated maps section */}
        {filteredCollaborated.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>协作图谱</span>
              <span style={{ fontSize: 11, background: '#F1F5F9', color: '#64748B', borderRadius: 10, padding: '1px 8px' }}>
                {filteredCollaborated.length}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {filteredCollaborated.map(m => (
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
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>🗺</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>
                    更新于 {formatDate(m.updatedAt)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, background: '#ECFDF5', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>协作</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>来自 {m.ownerName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
