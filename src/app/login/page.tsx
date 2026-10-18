'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Typography, message } from 'antd'
import { CalendarOutlined, LockOutlined, MailOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'

type Creds = { email: string; password: string }

const FEATURES = [
  { icon: <RobotOutlined />, text: 'AI answers calls and WhatsApp, 24/7' },
  { icon: <CalendarOutlined />, text: 'Appointments booked straight into your calendar' },
  { icon: <MessageOutlined />, text: 'Step in on any conversation, any time' },
]

export default function LoginPage() {
  const router = useRouter()
  const [form] = Form.useForm<Creds>()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const supabase = createClient()

  const submit = async (v: Creds) => {
    setLoading(true)
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(v)
        : await supabase.auth.signUp(v)
    setLoading(false)
    if (error) return message.error(error.message)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>Clinic Receptionist</span>
        </div>
        <div>
          <h1 className="auth-headline">Never miss a patient call again.</h1>
          <p className="auth-lead">Your AI receptionist handles the phone and WhatsApp, so your front desk can focus on patients.</p>
          <ul className="auth-features">
            {FEATURES.map((f) => (
              <li key={f.text}>
                <span className="auth-feature-icon">{f.icon}</span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="auth-foot">Built for clinics and dentists</div>
      </aside>

      <main className="auth-pane">
        <div className="auth-card">
          <Typography.Title level={3} style={{ margin: 0 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Typography.Title>
          <p className="auth-sub">
            {mode === 'signin' ? 'Sign in to manage your clinic.' : 'Start by creating a login for your clinic.'}
          </p>
          <Form form={form} layout="vertical" size="large" onFinish={submit} requiredMark={false}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="you@clinic.com" autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="At least 6 characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </Form>
          <div className="auth-switch">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <a onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}