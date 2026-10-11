'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs, { type Dayjs } from 'dayjs'
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Statistic, Table, TimePicker, Typography, message,
} from 'antd'
import { saveAppointment, setAppointmentStatus, type ApptStatus } from './appointments-actions'

type Appt = {
  id: string
  patient_id: string
  doctor_id: string
  procedure: string | null
  starts_at: string
  ends_at: string
  status: ApptStatus
  source: string
  patients: { full_name: string; phone: string } | null
  doctors: { name: string } | null
  
}
type Doctor = { id: string; name: string; slot_minutes: number }
type PatientOpt = { id: string; full_name: string; phone: string }

type FormValues = {
  patient_id: string
  doctor_id: string
  date: Dayjs
  time: Dayjs
  duration: number
  procedure?: string
  status?: ApptStatus
}

const TZ = 'Asia/Kolkata' // TODO: use the clinic's timezone
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ })
const istDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })

const STATUS_OPTIONS: { value: ApptStatus; label: string }[] = [
  { value: 'booked', label: 'Booked' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
]

export default function AppointmentsView({
  date,
  appointments,
  doctors,
  patients,
  newPatients,
}: {
  date: string
  appointments: Appt[]
  doctors: Doctor[]
  patients: PatientOpt[]
  newPatients: number
}) {
  const router = useRouter()
  const [form] = Form.useForm<FormValues>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Appt | null>(null)
  const [saving, setSaving] = useState(false)
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>()

  const rows = useMemo(
    () => (doctorFilter ? appointments.filter((a) => a.doctor_id === doctorFilter) : appointments),
    [appointments, doctorFilter]
  )

   const stats = useMemo(() => {
   const count = (s: ApptStatus) => appointments.filter((a) => a.status === s).length
    return {
      active: appointments.filter((a) => a.status !== 'cancelled').length,
      completed: count('completed'),
      noShow: count('no_show'),
      cancelled: count('cancelled'),
      byAI: appointments.filter((a) => a.source !== 'manual' && a.status !== 'cancelled').length,
    }
  }, [appointments])


  const goTo = (d: Dayjs) => router.push(`/?date=${d.format('YYYY-MM-DD')}`)

  const openModal = (a: Appt | null) => {
    setEditing(a)
    if (a) {
      const mins = Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60_000)
      form.setFieldsValue({
        patient_id: a.patient_id,
        doctor_id: a.doctor_id,
        date: dayjs(istDate(a.starts_at)),
        time: dayjs(`2000-01-01 ${istTime(a.starts_at)}`),
        duration: mins,
        procedure: a.procedure ?? '',
        status: a.status,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({
        date: dayjs(date),
        time: dayjs('2000-01-01 10:00'),
        duration: doctors[0]?.slot_minutes ?? 30,
        doctor_id: doctors.length === 1 ? doctors[0].id : undefined,
      })
    }
    setOpen(true)
  }

  const onSave = async () => {
    const v = await form.validateFields()
    setSaving(true)
    const res = await saveAppointment({
      id: editing?.id,
      patient_id: v.patient_id,
      doctor_id: v.doctor_id,
      procedure: v.procedure,
      date: v.date.format('YYYY-MM-DD'),
      time: v.time.format('HH:mm'),
      duration: v.duration,
      status: editing ? v.status : undefined,
    })
    setSaving(false)
    if (res.error) return message.error(res.error)
    message.success(editing ? 'Appointment updated' : 'Appointment booked')
    setOpen(false)
  }

  const changeStatus = async (a: Appt, status: ApptStatus) => {
    const res = await setAppointmentStatus(a.id, status)
    if (res.error) message.error(res.error)
  }

  const missingSetup = doctors.length === 0 || patients.length === 0

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Appointments
        </Typography.Title>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => goTo(dayjs(date).subtract(1, 'day'))}>&lsaquo;</Button>
          <DatePicker value={dayjs(date)} allowClear={false} onChange={(d) => d && goTo(d)} />
          <Button onClick={() => goTo(dayjs(date).add(1, 'day'))}>&rsaquo;</Button>
          <Button onClick={() => goTo(dayjs())}>Today</Button>
          <Select
            allowClear
            placeholder="All doctors"
            style={{ width: 180 }}
            value={doctorFilter}
            onChange={setDoctorFilter}
            options={doctors.map((d) => ({ value: d.id, label: d.name }))}
          />
          <Button type="primary" disabled={missingSetup} onClick={() => openModal(null)}>
            Book appointment
          </Button>
        </div>
      </div>
            
    
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Appointments" value={stats.active} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Completed" value={stats.completed} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="No-shows" value={stats.noShow} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Cancelled" value={stats.cancelled} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="New patients" value={newPatients} /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Booked by AI" value={stats.byAI} /></Card></Col>
        {/* TODO: Revenue tile once the payments table exists (Week 4) */}
      </Row>

      {missingSetup && (
        <Typography.Paragraph type="secondary">
          Add at least one active doctor and one patient before booking.
        </Typography.Paragraph>
      )}

      <Table<Appt>
        rowKey="id"
        dataSource={rows}
        pagination={false}
        locale={{ emptyText: 'No appointments on this day.' }}
        rowClassName={(a) => (a.status === 'cancelled' ? 'appt-cancelled' : '')}
        columns={[
          {
            title: 'Time',
            render: (_, a) => `${fmtTime(a.starts_at)} – ${fmtTime(a.ends_at)}`,
          },
          { title: 'Patient', render: (_, a) => a.patients?.full_name ?? '-' },
          { title: 'Phone', render: (_, a) => a.patients?.phone ?? '-' },
          { title: 'Doctor', render: (_, a) => a.doctors?.name ?? '-' },
          { title: 'Procedure', dataIndex: 'procedure', render: (v) => v ?? '-' },
          { title: 'Source', dataIndex: 'source' },
          {
            title: 'Status',
            render: (_, a) => (
              <Select
                size="small"
                value={a.status}
                style={{ width: 120 }}
                options={STATUS_OPTIONS}
                onChange={(s) => changeStatus(a, s)}
              />
            ),
          },
          {
            title: '',
            render: (_, a) => (
              <Button size="small" onClick={() => openModal(a)}>
                Edit
              </Button>
            ),
          },
        ]}
      />

      <style>{`.appt-cancelled td { opacity: 0.5; }`}</style>

      <Modal
        title={editing ? 'Edit appointment' : 'Book appointment'}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText="Save"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onValuesChange={(changed) => {
            // New bookings: default the duration to the chosen doctor's slot length
            if (!editing && changed.doctor_id) {
              const d = doctors.find((x) => x.id === changed.doctor_id)
              if (d) form.setFieldValue('duration', d.slot_minutes)
            }
          }}
        >
          <Form.Item name="patient_id" label="Patient" rules={[{ required: true, message: 'Select a patient' }]}>
            <Select
              showSearch
              placeholder="Search by name or phone"
              optionFilterProp="label"
              options={patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.phone})` }))}
            />
          </Form.Item>
          <Form.Item name="doctor_id" label="Doctor" rules={[{ required: true, message: 'Select a doctor' }]}>
            <Select options={doctors.map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
            <Form.Item name="time" label="Time" rules={[{ required: true }]} style={{ flex: 1 }}>
              <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} allowClear={false} needConfirm={false} />
            </Form.Item>
            <Form.Item
              name="duration"
              label="Minutes"
              rules={[{ required: true, type: 'number', min: 5, max: 480 }]}
              style={{ width: 100 }}
            >
              <InputNumber min={5} max={480} step={5} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="procedure" label="Procedure / reason">
            <Input placeholder="Checkup, scaling, root canal consult..." />
          </Form.Item>
          {editing && (
            <Form.Item name="status" label="Status">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  )
}