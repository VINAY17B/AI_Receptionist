'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs, { type Dayjs } from 'dayjs'
import {
  Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Segmented, Select, Table, Tag, TimePicker, Typography, message,
} from 'antd'
import {
  CalendarOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  UserAddOutlined, RobotOutlined, LeftOutlined, RightOutlined, PlusOutlined,
} from '@ant-design/icons'
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

const STATUS_META: Record<ApptStatus, { label: string; color: string }> = {
  booked: { label: 'Booked', color: '#3b82f6' },
  confirmed: { label: 'Confirmed', color: '#0d9488' },
  completed: { label: 'Completed', color: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#94a3b8' },
  no_show: { label: 'No-show', color: '#dc2626' },
}
const STATUS_OPTIONS = (Object.keys(STATUS_META) as ApptStatus[]).map((value) => ({
  value,
  label: (
    <span className="status-opt">
      <i className="status-dot" style={{ background: STATUS_META[value].color }} />
      {STATUS_META[value].label}
    </span>
  ),
}))

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

  const isToday = dayjs(date).isSame(dayjs(), 'day')
  const statTiles = [
    { title: 'Appointments', value: stats.active, icon: <CalendarOutlined />, tone: 'teal' },
    { title: 'Completed', value: stats.completed, icon: <CheckCircleOutlined />, tone: 'green' },
    { title: 'No-shows', value: stats.noShow, icon: <ExclamationCircleOutlined />, tone: 'red' },
    { title: 'Cancelled', value: stats.cancelled, icon: <CloseCircleOutlined />, tone: 'slate' },
    { title: 'New patients', value: newPatients, icon: <UserAddOutlined />, tone: 'blue' },
    { title: 'Booked by AI', value: stats.byAI, icon: <RobotOutlined />, tone: 'purple' },
  ]

  const goTo = (d: Dayjs) => router.push(`/?date=${d.format('YYYY-MM-DD')}`)

  const openModal = (a: Appt | null) => {
    setEditing(a)
    setOpen(true)
  }

  const initialValues: Partial<FormValues> = editing
    ? {
        patient_id: editing.patient_id,
        doctor_id: editing.doctor_id,
        date: dayjs(istDate(editing.starts_at)),
        time: dayjs(`2000-01-01 ${istTime(editing.starts_at)}`),
        duration: Math.round((new Date(editing.ends_at).getTime() - new Date(editing.starts_at).getTime()) / 60_000),
        procedure: editing.procedure ?? '',
        status: editing.status,
      }
    : {
        date: dayjs(date),
        time: dayjs('2000-01-01 10:00'),
        duration: doctors[0]?.slot_minutes ?? 30,
        doctor_id: doctors.length === 1 ? doctors[0].id : undefined,
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
      <div className="page-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Appointments
          </Typography.Title>
          <div className="page-sub">
            {dayjs(date).format('dddd, D MMMM YYYY')}
            {isToday && <Tag color="cyan" style={{ marginLeft: 8 }}>Today</Tag>}
          </div>
        </div>
        <div className="toolbar">
          <div className="date-nav">
            <Button type="text" aria-label="Previous day" icon={<LeftOutlined />} onClick={() => goTo(dayjs(date).subtract(1, 'day'))} />
            <DatePicker variant="borderless" value={dayjs(date)} allowClear={false} onChange={(d) => d && goTo(d)} />
            <Button type="text" aria-label="Next day" icon={<RightOutlined />} onClick={() => goTo(dayjs(date).add(1, 'day'))} />
          </div>
          <Button onClick={() => goTo(dayjs())}>Today</Button>
          <Button type="primary" icon={<PlusOutlined />} disabled={missingSetup} onClick={() => openModal(null)}>
            Book appointment
          </Button>
        </div>
      </div>

      {doctors.length > 1 && (
        <div className="chip-row">
          <Segmented
            value={doctorFilter ?? 'all'}
            onChange={(v) => setDoctorFilter(v === 'all' ? undefined : String(v))}
            options={[{ label: 'All doctors', value: 'all' }, ...doctors.map((d) => ({ label: d.name, value: d.id }))]}
          />
        </div>
      )}

      <div className="stat-grid">
        {statTiles.map((s, i) => (
          <div key={s.title} className={`stat-card tone-${s.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="stat-icon">{s.icon}</span>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-title">{s.title}</div>
            </div>
          </div>
        ))}
        {/* TODO: Revenue tile once the payments table exists (Week 4) */}
      </div>

      {missingSetup && (
        <Typography.Paragraph type="secondary">
          Add at least one active doctor and one patient before booking.
        </Typography.Paragraph>
      )}

      <div className="surface" key={`${date}-${doctorFilter ?? 'all'}`}>
        <Table<Appt>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description="No appointments on this day" style={{ padding: '32px 0' }} /> }}
          rowClassName={(a) => `appt-row${a.status === 'cancelled' ? ' appt-cancelled' : ''}`}
          onRow={(_, i) => ({ style: { animationDelay: `${Math.min(i ?? 0, 12) * 35}ms` } })}
          columns={[
            {
              title: 'Time',
              width: 200,
              render: (_, a) => (
                <span className="time-pill">{fmtTime(a.starts_at)} – {fmtTime(a.ends_at)}</span>
              ),
            },
            {
              title: 'Patient',
              render: (_, a) => (
                <div className="patient-cell">
                  <span className="avatar">{(a.patients?.full_name ?? '?').charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="patient-name">
                      {a.patients?.full_name ?? '-'}
                      {a.source !== 'manual' && (
                        <Tag icon={<RobotOutlined />} color="purple" style={{ margin: 0 }}>{a.source}</Tag>
                      )}
                    </div>
                    <div className="patient-phone">{a.patients?.phone ?? '-'}</div>
                  </div>
                </div>
              ),
            },
            { title: 'Doctor', render: (_, a) => a.doctors?.name ?? '-' },
            { title: 'Procedure', dataIndex: 'procedure', render: (v) => v ?? '-' },
            {
              title: 'Status',
              width: 150,
              render: (_, a) => (
                <Select
                  size="small"
                  value={a.status}
                  style={{ width: 130 }}
                  options={STATUS_OPTIONS}
                  onChange={(s) => changeStatus(a, s)}
                />
              ),
            },
            {
              title: '',
              width: 80,
              render: (_, a) => (
                <Button size="small" onClick={() => openModal(a)}>
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={editing ? 'Edit appointment' : 'Book appointment'}
        open={open}
        onOk={onSave}
        onCancel={() => setOpen(false)}
        confirmLoading={saving}
        okText="Save"
        centered
        width={560}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={initialValues}
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