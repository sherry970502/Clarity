'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('邮箱或密码错误')
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.02em' }}>Clarity</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>登录你的账号</div>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="邮箱" type="email" value={email} onChange={setEmail} placeholder="your@email.com" />
          <Field label="密码" type="password" value={password} onChange={setPassword} placeholder="••••••" />

          {error && <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#94A3B8' }}>
          还没有账号？{' '}
          <Link href="/register" style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 500 }}>注册</Link>
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
