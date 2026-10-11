'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { createClient } from '@/lib/supabase/client'

type Creds = { email: string; password: string }

export default function LoginPage() {
  const router = useRouter()
  const [form] = Form.useForm<Creds>()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const submit = async (mode: 'signin' | 'signup') => {
    const v = await form.validateFields()
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
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={4}>Clinic Receptionist</Typography.Title>
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" block loading={loading} onClick={() => submit('signin')}>
            Sign in
          </Button>
          <Button block style={{ marginTop: 8 }} loading={loading} onClick={() => submit('signup')}>
            Create account
          </Button>
        </Form>
      </Card>
    </div>
  )
}