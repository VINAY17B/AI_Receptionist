'use client'
import { useMemo, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, Select, Table, Tag, Typography, message } from 'antd'
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
    form.setFieldsValue(
      p
        ? {
            full_name: p.full_name,
            phone: p.phone,
            preferred_language: p.preferred_language,
            notes: p.notes ?? '',
            consent: !!p.consent_at,
          }
        : { full_name: '', phone: '', preferred_language: 'en', notes: '', consent: false }
    )
    setOpen(true)
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Patients
        </Typography.Title>
        <div style={{ display: 'flex', gap: 12 }}>
          <Input.Search
            allowClear
            placeholder="Search name or phone"
            style={{ width: 260 }}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="primary" onClick={() => openModal(null)}>
            Add patient
          </Button>
        </div>
      </div>

      <Table<Patient>
        rowKey="id"
        dataSource={filtered}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No patients yet.' }}
        columns={[
          { title: 'Name', dataIndex: 'full_name' },
          { title: 'Phone', dataIndex: 'phone' },
          {
            title: 'Language',
            dataIndex: 'preferred_language',
            render: (v) => LANGUAGES.find((l) => l.value === v)?.label ?? v,
          },
          {
            title: 'Consent',
            dataIndex: 'consent_at',
            render: (v) => (v ? <Tag color="green">Given</Tag> : <Tag>Not recorded</Tag>),
          },
          {
            title: '',
            render: (_, p) => (
              <Button size="small" onClick={() => openModal(p)}>
                Edit
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit patient' : 'Add patient'}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText="Save"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
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