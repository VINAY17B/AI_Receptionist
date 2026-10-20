'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import { Alert, Button, Checkbox, Descriptions, Empty, Form, Input, Table, Tag, TimePicker, Typography, message } from 'antd'
import { updateClinicProfile } from './actions'

export type ClinicInfo = {
  name: string
  phone: string | null
  address: string | null
  timezone: string
  open_time: string | null
  close_time: string | null
  working_days: number[] | null
  faq_text: string | null
  whatsapp_phone_number_id: string | null
}
export type SubscriptionInfo = {
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  grace_until: string | null
  cancel_at_period_end: boolean
  plans: { name: string; amount_inr: number; period: string } | null
}
export type BillingPayment = {
  id: string
  amount_inr: number
  status: 'paid' | 'failed' | 'refunded'
  method: string | null
  description: string | null
  razorpay_payment_id: string | null
  paid_at: string
}

type FormValues = {
  name: string
  phone?: string
  address?: string
  open?: dayjs.Dayjs
  close?: dayjs.Dayjs
  days: number[]
  faq?: string
}

const DAYS = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }, { label: 'Sun', value: 7 },
]

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  trialing: { label: 'Free trial', color: 'blue' },
  active: { label: 'Active', color: 'green' },
  past_due: { label: 'Payment failed', color: 'orange' },
  halted: { label: 'Stopped', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'default' },
  expired: { label: 'Expired', color: 'red' },
}
const PAY_STATUS: Record<BillingPayment['status'], { label: string; color: string }> = {
  paid: { label: 'Paid', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  refunded: { label: 'Refunded', color: 'orange' },
}

const TZ = 'Asia/Kolkata'
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '-'
const rupees = (n: number) => `\u20B9${n.toLocaleString('en-IN')}`

export default function ClinicView({
  clinic,
  subscription,
  payments,
  isOwner,
}: {
  clinic: ClinicInfo
  subscription: SubscriptionInfo | null
  payments: BillingPayment[]
  isOwner: boolean
}) {
  const [form] = Form.useForm<FormValues>()
  const [saving, setSaving] = useState(false)

  const initialValues: FormValues = {
    name: clinic.name,
    phone: clinic.phone ?? '',
    address: clinic.address ?? '',
    open: clinic.open_time ? dayjs(`2000-01-01 ${clinic.open_time}`) : undefined,
    close: clinic.close_time ? dayjs(`2000-01-01 ${clinic.close_time}`) : undefined,
    days: clinic.working_days ?? [],
    faq: clinic.faq_text ?? '',
  }

  const onSave = async () => {
    const v = await form.validateFields()
    setSaving(true)
    const res = await updateClinicProfile({
      name: v.name,
      phone: v.phone ?? '',
      address: v.address ?? '',
      open_time: v.open!.format('HH:mm'),
      close_time: v.close!.format('HH:mm'),
      working_days: v.days,
      faq_text: v.faq ?? '',
    })
    setSaving(false)
    if (res.error) return message.error(res.error)
    message.success('Clinic profile saved')
  }

  const st = subscription ? SUB_STATUS[subscription.status] ?? { label: subscription.status, color: 'default' } : null
  const dateRow = (): { label: string; value: string } | null => {
    if (!subscription) return null
    switch (subscription.status) {
      case 'trialing': return { label: 'Trial ends', value: fmtDate(subscription.trial_ends_at) }
      case 'active': return { label: 'Renews on', value: fmtDate(subscription.current_period_end) }
      case 'past_due': return { label: 'Pay before', value: fmtDate(subscription.grace_until) }
      case 'cancelled': return { label: 'Access until', value: fmtDate(subscription.current_period_end) }
      default: return null
    }
  }
  const dr = dateRow()

  return (
    <>
      <div className="page-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Clinic profile
          </Typography.Title>
          <div className="page-sub">Your clinic details, subscription and payment history</div>
        </div>
      </div>

      <div className="surface" style={{ padding: 24, marginBottom: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>Subscription</Typography.Title>
        {subscription && st ? (
          <Descriptions
            column={{ xs: 1, sm: 2, lg: 4 }}
            items={[
              { key: 'status', label: 'Status', children: <Tag color={st.color}>{st.label}</Tag> },
              { key: 'plan', label: 'Plan', children: subscription.plans ? subscription.plans.name : '-' },
              {
                key: 'price',
                label: 'Price',
                children: subscription.plans
                  ? `${rupees(subscription.plans.amount_inr)} / ${subscription.plans.period === 'yearly' ? 'year' : 'month'}`
                  : '-',
              },
              ...(dr ? [{ key: 'date', label: dr.label, children: dr.value }] : []),
            ]}
          />
        ) : (
          <Typography.Text type="secondary">No subscription found for this clinic.</Typography.Text>
        )}
        {/* TODO: Subscribe / Change plan / Cancel buttons (Razorpay checkout) go here in the next step */}
      </div>

      <div className="surface" style={{ padding: 24, marginBottom: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>Clinic details</Typography.Title>
        {!isOwner && (
          <Alert type="info" showIcon message="Only the clinic owner can edit these details." style={{ marginBottom: 16 }} />
        )}
        <Form form={form} layout="vertical" initialValues={initialValues} disabled={!isOwner} requiredMark={false} style={{ maxWidth: 640 }}>
          <Form.Item name="name" label="Clinic name" rules={[{ required: true, whitespace: true, message: 'Enter the clinic name' }, { max: 120 }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Clinic phone"
            rules={[{ max: 20 }, { pattern: /^[0-9+()\-\s]*$/, message: 'Enter a valid phone number' }]}
          >
            <Input placeholder="0832 2222222" inputMode="tel" />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ max: 300 }]}>
            <Input.TextArea rows={2} placeholder="Shop no., street, area, city" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="open" label="Opens at" rules={[{ required: true, message: 'Set the opening time' }]} style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} allowClear={false} needConfirm={false} />
            </Form.Item>
            <Form.Item
              name="close"
              label="Closes at"
              dependencies={['open']}
              rules={[
                { required: true, message: 'Set the closing time' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const open = getFieldValue('open')
                    return !value || !open || open.format('HH:mm') < value.format('HH:mm')
                      ? Promise.resolve()
                      : Promise.reject(new Error('Closing time must be after opening time'))
                  },
                }),
              ]}
              style={{ flex: 1 }}
            >
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} allowClear={false} needConfirm={false} />
            </Form.Item>
          </div>
          <Form.Item name="days" label="Working days" rules={[{ required: true, type: 'array', min: 1, message: 'Choose at least one day' }]}>
            <Checkbox.Group options={DAYS} />
          </Form.Item>
          <Form.Item
            name="faq"
            label="FAQ for the AI receptionist"
            extra="Fees, parking, what to bring... the receptionist uses this to answer patients."
            rules={[{ max: 2000 }]}
          >
            <Input.TextArea rows={5} showCount maxLength={2000} />
          </Form.Item>

          <Descriptions
            size="small"
            column={1}
            style={{ marginBottom: 16 }}
            items={[
              { key: 'tz', label: 'Timezone', children: clinic.timezone },
              { key: 'wa', label: 'WhatsApp number ID', children: clinic.whatsapp_phone_number_id ?? 'Not connected yet' },
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
            Timezone and the WhatsApp connection are set up by support. Contact us to change them.
          </Typography.Paragraph>

          {isOwner && (
            <Button type="primary" loading={saving} onClick={onSave}>
              Save changes
            </Button>
          )}
        </Form>
      </div>

      <div className="surface" style={{ padding: 24 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>Payment history</Typography.Title>
        {!isOwner ? (
          <Typography.Text type="secondary">Only the clinic owner can see payment history.</Typography.Text>
        ) : (
          <Table<BillingPayment>
            rowKey="id"
            dataSource={payments}
            pagination={payments.length > 10 ? { pageSize: 10 } : false}
            scroll={{ x: 640 }}
            locale={{ emptyText: <Empty description="No payments yet" style={{ padding: '24px 0' }} /> }}
            columns={[
              { title: 'Date', width: 130, render: (_, p) => fmtDate(p.paid_at) },
              { title: 'Description', render: (_, p) => p.description ?? '-' },
              { title: 'Method', width: 100, render: (_, p) => (p.method ? p.method.toUpperCase() : '-') },
              { title: 'Amount', width: 120, align: 'right', render: (_, p) => rupees(p.amount_inr) },
              {
                title: 'Status',
                width: 110,
                render: (_, p) => <Tag color={PAY_STATUS[p.status].color}>{PAY_STATUS[p.status].label}</Tag>,
              },
              {
                title: 'Reference',
                width: 170,
                render: (_, p) => <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.razorpay_payment_id ?? '-'}</Typography.Text>,
              },
            ]}
          />
        )}
        {/* TODO: invoice download (GST invoice) once invoicing is decided */}
      </div>
    </>
  )
}