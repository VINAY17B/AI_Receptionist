'use client'
import { useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Space, Switch, Table, Typography, message } from 'antd'
import { saveDoctor, setDoctorActive } from './actions'

type Doctor = {
  id: string
  name: string
  specialty: string | null
  slot_minutes: number
  active: boolean
}

type FormValues = { name: string; specialty?: string; slot_minutes: number }

export default function DoctorsTable({ doctors }: { doctors: Doctor[] }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<FormValues>()

  const openModal = (doctor: Doctor | null) => {
    setEditing(doctor)
    form.setFieldsValue(
      doctor
        ? { name: doctor.name, specialty: doctor.specialty ?? '', slot_minutes: doctor.slot_minutes }
        : { name: '', specialty: '', slot_minutes: 30 }
    )
    setOpen(true)
  }

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
    const res = await setDoctorActive(d.id, active)
    if (res.error) message.error(res.error)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Doctors
        </Typography.Title>
        <Button type="primary" onClick={() => openModal(null)}>
          Add doctor
        </Button>
      </div>

      <Table<Doctor>
        rowKey="id"
        dataSource={doctors}
        pagination={false}
        locale={{ emptyText: 'No doctors yet. Add your first one.' }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Specialty', dataIndex: 'specialty', render: (v) => v ?? '-' },
          { title: 'Slot (min)', dataIndex: 'slot_minutes' },
          {
            title: 'Active',
            dataIndex: 'active',
            render: (_, d) => <Switch checked={d.active} onChange={(v) => toggleActive(d, v)} />,
          },
          {
            title: '',
            render: (_, d) => (
              <Space>
                <Button size="small" onClick={() => openModal(d)}>
                  Edit
                </Button>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? 'Edit doctor' : 'Add doctor'}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText="Save"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
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