'use client'
import { useState } from 'react'

interface Props {
  mapId: string
  shareToken: string | null
  onClose: () => void
  onShareChange: (token: string | null) => void
}

export function ShareModal({ mapId, shareToken, onClose, onShareChange }: Props) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null

  async function handleCreate() {
    if (!password.trim()) { setError('请输入密码'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/maps/${mapId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '操作失败'); return }
      onShareChange(data.shareToken)
      setPassword('')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke() {
    setLoading(true)
    try {
      await fetch(`/api/maps/${mapId}/share`, { method: 'DELETE' })
      onShareChange(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: '32px 36px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)', width: 400,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>分享导图</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18, lineHeight: 1 }}
          >×</button>
        </div>

        {shareToken ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>分享链接已生成，对方需要密码才能查看。</p>

            {/* Share URL */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                readOnly
                value={shareUrl ?? ''}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                  fontSize: 12, color: '#475569', background: '#F8FAFC', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0',
                  background: copied ? '#F0FDF4' : '#fff', color: copied ? '#16A34A' : '#475569',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>

            {/* Update password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#94A3B8' }}>更新密码（可选）</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="输入新密码"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                    fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleCreate}
                  disabled={loading || !password.trim()}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: '#4F46E5', color: '#fff', fontSize: 13,
                    cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !password.trim() ? 0.5 : 1,
                    fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  更新
                </button>
              </div>
            </div>

            {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}

            <button
              onClick={handleRevoke}
              disabled={loading}
              style={{
                padding: '8px', borderRadius: 8, border: '1px solid #FCA5A5',
                background: '#FFF5F5', color: '#EF4444', fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}
            >
              停用分享
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>设置一个访问密码，生成分享链接。</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="设置访问密码"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              style={{
                padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0',
                fontSize: 14, outline: 'none', fontFamily: 'inherit',
              }}
            />
            {error && <p style={{ margin: 0, fontSize: 13, color: '#EF4444' }}>{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading || !password.trim()}
              style={{
                padding: '10px', borderRadius: 8, border: 'none',
                background: '#4F46E5', color: '#fff', fontSize: 14,
                fontWeight: 600, cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !password.trim() ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? '生成中…' : '生成分享链接'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
