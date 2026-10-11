'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Form, Input, Typography, message } from 'antd'
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
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={4}>Set up your clinic</Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Clinic name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Continue
          </Button>
        </Form>
      </Card>
    </div>
  )
}