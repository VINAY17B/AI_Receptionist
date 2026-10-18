'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { Button, Checkbox, Empty, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { CheckCircleFilled, EditOutlined, HistoryOutlined, MinusCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { savePatient } from './actions'


type Patient = {
  id: string
  full_name: string
  phone: string
  preferred_language: string
  notes: string | null
  consent_at: string | null
  created_at: string
}

type FormValues = {
  full_name: string
  phone: string
  preferred_language: string
  notes?: string
  consent: boolean
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'mr', label: 'Marathi' },
  // TODO: add other languages as you decide your launch set
]

export default function PatientsTable({ patients }: { patients: Patient[] }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [form] = Form.useForm<FormValues>()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    const digits = q.replace(/\D/g, '')
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (digits.length >= 3 && p.phone.replace(/\D/g, '').includes(digits))
    )
  }, [patients, query])

  const openModal = (p: Patient | null) => {
    setEditing(p)
    setOpen(true)
  }

  const initialValues: FormValues = editing
    ? {
        full_name: editing.full_name,
        phone: editing.phone,
        preferred_language: editing.preferred_language,
        notes: editing.notes ?? '',
        consent: !!editing.consent_at,
      }
    : { full_name: '', phone: '', preferred_language: 'en', notes: '', consent: false }

  const onSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    const res = await savePatient({ id: editing?.id, ...values })
    setSaving(false)
    if (res.error) return message.error(res.error)
    message.success(editing ? 'Patient updated' : 'Patient added')
    setOpen(false)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Patients
          </Typography.Title>
          <div className="page-sub">
            {query.trim()
              ? `${filtered.length} of ${patients.length} patients`
              : `${patients.length} ${patients.length === 1 ? 'patient' : 'patients'}`}
          </div>
        </div>
        <div className="toolbar">
          <Input
            allowClear
            className="search-input"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search name or phone"
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
            Add patient
          </Button>
        </div>
      </div>

      <div className="surface">
        <Table<Patient>
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 720 }}
          locale={{
            emptyText: (
              <Empty
                description={query.trim() ? 'No patients match your search' : 'No patients yet'}
                style={{ padding: '32px 0' }}
              />
            ),
          }}
          rowClassName={() => 'row-anim'}
          onRow={(_, i) => ({ style: { animationDelay: `${Math.min(i ?? 0, 12) * 30}ms` } })}
          columns={[
            {
              title: 'Patient',
              dataIndex: 'full_name',
              render: (name: string, r: Patient) => (
                <div className="patient-cell">
                  <span className="avatar">{name.charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="patient-name">{name}</div>
                    <div className="patient-phone">{r.phone}</div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Language',
              dataIndex: 'preferred_language',
              render: (v: string) => <Tag bordered={false}>{LANGUAGES.find((l) => l.value === v)?.label ?? v}</Tag>,
            },
            {
              title: 'Consent',
              dataIndex: 'consent_at',
              render: (v: string | null) =>
                v ? (
                  <span className="consent consent-yes">
                    <CheckCircleFilled /> Given
                  </span>
                ) : (
                  <span className="consent consent-no">
                    <MinusCircleOutlined /> Not recorded
                  </span>
                ),
            },
            {
              title: 'Added',
              dataIndex: 'created_at',
              render: (v: string) => <span className="muted-text">{dayjs(v).format('D MMM YYYY')}</span>,
            },
           {
  title: '',
  width: 110,
  render: (_, p) => (
    <Space size={4}>
      <Tooltip title="View history">
        <Link href={`/patients/${p.id}`} aria-label={`View history for ${p.full_name}`}>
          <Button size="small" type="text" icon={<HistoryOutlined />} />
        </Link>
      </Tooltip>
      <Tooltip title="Edit patient">
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openModal(p)} aria-label="Edit patient" />
      </Tooltip>
    </Space>
  ),
},
          ]}
        />
      </div>

      <Modal
        title={editing ? 'Edit patient' : 'Add patient'}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText="Save"
        centered
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={initialValues}>
          <Form.Item name="full_name" label="Full name" rules={[{ required: true, message: 'Enter the patient name' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Mobile number"
            rules={[{ required: true, message: 'Enter a mobile number' }]}
            extra="Saved as +91XXXXXXXXXX. Spaces and +91 are fine."
          >
            <Input placeholder="98765 43210" />
          </Form.Item>
          <Form.Item name="preferred_language" label="Preferred language">
            <Select options={LANGUAGES} />
          </Form.Item>
          <Form.Item name="notes" label="Notes (front desk only)">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="consent" valuePropName="checked">
            <Checkbox>Patient agrees to be contacted by phone and WhatsApp for appointments</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}