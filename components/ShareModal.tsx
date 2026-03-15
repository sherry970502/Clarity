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
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : null

  async function enableShare() {
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
      if (!res.ok) { setError(data.error || '操作失败'); return }
      onShareChange(data.shareToken)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  async function disableShare() {
    setLoading(true)
    try {
      await fetch(`/api/maps/${mapId}/share`, { method: 'DELETE' })
      onShareChange(null)
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: '32px 36px',
          width: 420, maxWidth: '90vw',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>分享项目</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {shareToken ? (
          <>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: 500 }}>分享链接</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{
                flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 12, color: '#475569',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {shareUrl}
              </div>
              <button
                onClick={copyLink}
                style={{
                  flexShrink: 0, padding: '8px 16px', borderRadius: 8,
                  border: '1px solid #E2E8F0', background: '#fff',
                  fontSize: 12, color: '#4F46E5', fontFamily: 'inherit',
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>
              被分享者需要输入密码才能查看，仅限浏览不可编辑。
            </div>

            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 500 }}>修改密码</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="password"
                placeholder="输入新密码"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && enableShare()}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  border: error ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={enableShare}
                disabled={loading || !password.trim()}
                style={{
                  flexShrink: 0, padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: loading || !password.trim() ? '#E2E8F0' : '#4F46E5',
                  color: loading || !password.trim() ? '#94A3B8' : '#fff',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  cursor: loading || !password.trim() ? 'default' : 'pointer',
                }}
              >
                更新
              </button>
            </div>
            {error && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>{error}</div>}

            <button
              onClick={disableShare}
              disabled={loading}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 8,
                border: '1px solid #FCA5A5', background: '#FFF5F5',
                color: '#EF4444', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              停用分享
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              开启后将生成一个分享链接，被分享者需要输入密码查看，仅限浏览不可编辑。
            </div>

            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6, fontWeight: 500 }}>设置访问密码</div>
            <input
              type="password"
              placeholder="请输入访问密码"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && enableShare()}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, boxSizing: 'border-box',
                border: error ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
                marginBottom: error ? 6 : 16,
              }}
            />
            {error && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 12 }}>{error}</div>}
            <button
              onClick={enableShare}
              disabled={loading || !password.trim()}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                background: loading || !password.trim() ? '#E2E8F0' : '#4F46E5',
                color: loading || !password.trim() ? '#94A3B8' : '#fff',
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                cursor: loading || !password.trim() ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? '处理中…' : '生成分享链接'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
