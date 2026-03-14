'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '注册失败')
      setLoading(false)
      return
    }

    await signIn('credentials', { email, password, redirect: false })
    router.push('/dashboard')
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.02em' }}>Clarity</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>创建你的账号</div>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="姓名" type="text" value={name} onChange={setName} placeholder="你的名字" />
          <Field label="邮箱" type="email" value={email} onChange={setEmail} placeholder="your@email.com" />
          <Field label="密码" type="password" value={password} onChange={setPassword} placeholder="至少 6 位" />

          {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '注册中…' : '注册'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#94A3B8' }}>
          已有账号？{' '}
          <Link href="/login" style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 500 }}>登录</Link>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} required
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1px solid #E2E8F0', borderRadius: 8,
          padding: '10px 12px', fontSize: 14, outline: 'none',
          fontFamily: 'inherit', color: '#1E293B', background: '#FAFAFA',
        }}
      />
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: '36px 32px',
  width: 360, boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
  border: '1px solid #E2E8F0',
}

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '11px', borderRadius: 8, border: 'none',
  background: '#4F46E5', color: '#fff', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
}
