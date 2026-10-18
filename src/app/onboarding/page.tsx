'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Typography, message } from 'antd'
import { MedicineBoxOutlined } from '@ant-design/icons'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const onFinish = async ({ name }: { name: string }) => {
    setLoading(true)
    const { error } = await supabase.rpc('create_clinic', { p_name: name })
    setLoading(false)
    if (error) return message.error(error.message)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="auth-shell auth-solo">
      <main className="auth-pane">
        <div className="auth-card">
          <span className="auth-badge">
            <MedicineBoxOutlined />
          </span>
          <Typography.Title level={3} style={{ margin: '16px 0 0' }}>
            Set up your clinic
          </Typography.Title>
          <p className="auth-sub">One last step. You can add doctors and patients right after.</p>
          <Form layout="vertical" size="large" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="name" label="Clinic name" rules={[{ required: true, message: 'Enter your clinic name' }]}>
              <Input placeholder="Sunrise Dental Clinic" autoFocus />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Continue
            </Button>
          </Form>
        </div>
      </main>
    </div>
  )
}