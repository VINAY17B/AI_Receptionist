'use client'
import { useState } from 'react'
import { Button, Empty, Form, Input, InputNumber, Modal, Switch, Table, Tag, Typography, message } from 'antd'
import { ClockCircleOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { saveDoctor, setDoctorActive } from './actions'

type Doctor = {
  id: string
  name: string
  specialty: string | null
  slot_minutes: number
  active: boolean
}

type FormValues = { name: string; specialty?: string; slot_minutes: number }

const initial = (name: string) => name.replace(/^dr\.?\s*/i, '').charAt(0).toUpperCase() || '?'

export default function DoctorsTable({ doctors }: { doctors: Doctor[] }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form] = Form.useForm<FormValues>()

  const openModal = (doctor: Doctor | null) => {
    setEditing(doctor)
    setOpen(true)
  }

  const initialValues: FormValues = editing
    ? { name: editing.name, specialty: editing.specialty ?? '', slot_minutes: editing.slot_minutes }
    : { name: '', specialty: '', slot_minutes: 30 }

  const onSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    const res = await saveDoctor({ id: editing?.id, ...values })
    setSaving(false)
    if (res.error) return message.error(res.error)
    message.success(editing ? 'Doctor updated' : 'Doctor added')
    setOpen(false)
  }

  const toggleActive = async (d: Doctor, active: boolean) => {
    setTogglingId(d.id)
    const res = await setDoctorActive(d.id, active)
    setTogglingId(null)
    if (res.error) message.error(res.error)
  }

  const activeCount = doctors.filter((d) => d.active).length

  return (
    <>
      <div className="page-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Doctors
          </Typography.Title>
          <div className="page-sub">
            {doctors.length === 0 ? 'No doctors yet' : `${activeCount} active of ${doctors.length}`}
          </div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
          Add doctor
        </Button>
      </div>

      <div className="surface">
        <Table<Doctor>
          rowKey="id"
          dataSource={doctors}
          pagination={false}
          scroll={{ x: 620 }}
          locale={{ emptyText: <Empty description="No doctors yet. Add your first one." style={{ padding: '32px 0' }} /> }}
          rowClassName={(d) => `row-anim${d.active ? '' : ' row-inactive'}`}
          onRow={(_, i) => ({ style: { animationDelay: `${Math.min(i ?? 0, 12) * 30}ms` } })}
          columns={[
            {
              title: 'Doctor',
              dataIndex: 'name',
              render: (_, d) => (
                <div className="patient-cell">
                  <span className="avatar avatar-lg">{initial(d.name)}</span>
                  <div>
                    <div className="patient-name">{d.name}</div>
                    <div className="patient-phone">{d.specialty ?? 'No specialty set'}</div>
                  </div>
                </div>
              ),
            },
            {
              title: 'Slot length',
              dataIndex: 'slot_minutes',
              render: (v: number) => (
                <span className="time-pill">
                  <ClockCircleOutlined style={{ marginRight: 6 }} />
                  {v} min
                </span>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'active',
              render: (_, d) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Switch checked={d.active} loading={togglingId === d.id} onChange={(v) => toggleActive(d, v)} />
                  <Tag bordered={false} color={d.active ? 'green' : 'default'} style={{ margin: 0 }}>
                    {d.active ? 'Active' : 'Inactive'}
                  </Tag>
                </div>
              ),
            },
            {
              title: '',
              width: 90,
              render: (_, d) => (
                <Button size="small" icon={<EditOutlined />} onClick={() => openModal(d)}>
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={editing ? 'Edit doctor' : 'Add doctor'}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText="Save"
        centered
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={initialValues}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter the doctor name' }]}>
            <Input placeholder="Dr. Sharma" />
          </Form.Item>
          <Form.Item name="specialty" label="Specialty">
            <Input placeholder="Dentist, Orthodontist, General physician..." />
          </Form.Item>
          <Form.Item
            name="slot_minutes"
            label="Default slot length (minutes)"
            rules={[{ required: true, type: 'number', min: 5, max: 240 }]}
          >
            <InputNumber min={5} max={240} step={5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}