'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, Button, Form, Input, Segmented, Typography, message } from 'antd'
import { CalendarOutlined, LockOutlined, MailOutlined, MessageOutlined, RobotOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'

type FormValues = { email: string; password: string; confirm?: string }
type Mode = 'signin' | 'signup'
type Notice = { type: 'success' | 'info' | 'warning'; text: string }

// Which tab a visitor sees first. Set to 'signup' to put "Create account" first. /login?mode=signup also works.
const DEFAULT_MODE: Mode = 'signin'

const FEATURES = [
  { icon: <RobotOutlined />, text: 'AI answers calls and WhatsApp, 24/7' },
  { icon: <CalendarOutlined />, text: 'Appointments booked straight into your calendar' },
  { icon: <MessageOutlined />, text: 'Step in on any conversation, any time' },
]

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the App Router
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : DEFAULT_MODE)
  const [notice, setNotice] = useState<Notice | null>(
    params.get('error') === 'confirm'
      ? { type: 'info', text: 'That confirmation link could not be completed. If you already clicked it, just sign in.' }
      : null
  )
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const supabase = createClient()

  const redirectTo = () => `${window.location.origin}/auth/callback`

  const switchMode = (m: Mode) => {
    setMode(m)
    setNotice(null)
    form.resetFields(['password', 'confirm'])
  }

  const goIn = () => {
    router.push('/') // the app layout sends brand-new users on to /onboarding
    router.refresh()
  }

  const submit = async (v: FormValues) => {
    setLoading(true)
    setNotice(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password })
        if (error) {
          if (/not confirmed/i.test(error.message)) {
            setPendingEmail(v.email)
            setNotice({ type: 'warning', text: 'Please confirm your email first. Check your inbox for the link.' })
            return
          }
          message.error(error.message)
          return
        }
        goIn()
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: v.email,
        password: v.password,
        options: { emailRedirectTo: redirectTo() },
      })
      if (error) {
        message.error(error.message)
        return
      }
      // With email confirmation on, an already-registered address comes back as a user with no identities
      if (data.user && data.user.identities?.length === 0) {
        setMode('signin')
        setNotice({ type: 'info', text: 'This email is already registered. Please sign in instead.' })
        return
      }
      if (data.session) {
        goIn() // email confirmation is off: the user is already signed in
        return
      }
      setPendingEmail(v.email)
      setMode('signin')
      form.resetFields(['password', 'confirm'])
      setNotice({ type: 'success', text: `We sent a confirmation link to ${v.email}. Click it, then sign in.` })
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!pendingEmail) return
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo: redirectTo() },
    })
    if (error) message.error(error.message)
    else message.success('Confirmation email sent again')
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
          <Segmented
            block
            value={mode}
            onChange={(m) => switchMode(m as Mode)}
            options={[
              { label: 'Sign in', value: 'signin' },
              { label: 'Create account', value: 'signup' },
            ]}
            style={{ marginBottom: 24 }}
          />
          <Typography.Title level={3} style={{ margin: 0 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Typography.Title>
          <p className="auth-sub">
            {mode === 'signin'
              ? 'Sign in to manage your clinic.'
              : 'Choose a password for your clinic login. You will set up the clinic itself next.'}
          </p>

          {notice && <Alert type={notice.type} showIcon message={notice.text} style={{ marginBottom: 16 }} />}
          {notice?.type !== 'info' && pendingEmail && mode === 'signin' && (
            <Button type="link" onClick={resend} style={{ padding: 0, marginBottom: 12 }}>
              Resend confirmation email
            </Button>
          )}

          <Form form={form} layout="vertical" size="large" onFinish={submit} requiredMark={false}>
            <Form.Item
              name="email"
              label="Email"
              normalize={(value) => (typeof value === 'string' ? value.trim() : value)}
              rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
            >
              <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="you@clinic.com" autoComplete="email" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={
                mode === 'signin'
                  ? [{ required: true, message: 'Enter your password' }]
                  : [
                      { required: true, message: 'Choose a password' },
                      { min: 8, message: 'At least 8 characters' },
                      { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Use both letters and numbers' },
                    ]
              }
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder={mode === 'signin' ? 'Your password' : 'At least 8 characters, letters and numbers'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </Form.Item>
            {mode === 'signup' && (
              <Form.Item
                name="confirm"
                label="Confirm password"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Type the password again' },
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      !value || getFieldValue('password') === value
                        ? Promise.resolve()
                        : Promise.reject(new Error('The two passwords do not match')),
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Repeat the password" autoComplete="new-password" />
              </Form.Item>
            )}
            <Button type="primary" htmlType="submit" block loading={loading}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </Form>
          {/* TODO: "Forgot password" link and reset page */}
        </div>
      </main>
    </div>
  )
}