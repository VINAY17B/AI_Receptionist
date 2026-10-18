'use client'
import Link from 'next/link'
import { Empty, Table, Tag, Typography } from 'antd'
import {
  ArrowLeftOutlined, CalendarOutlined, CheckCircleFilled, CheckCircleOutlined, FieldTimeOutlined,
  MinusCircleOutlined, PhoneOutlined, WalletOutlined,
} from '@ant-design/icons'

type Patient = {
  id: string
  full_name: string
  phone: string
  preferred_language: string
  notes: string | null
  consent_at: string | null
  created_at: string
}
type Appt = { id: string; status: string; source: string; starts_at: string; doctor_name: string }
type Pay = {
  id: string
  amount_inr: number
  method: string
  status: string
  note: string | null
  paid_at: string | null
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const fmt = (s: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '—'
const fmtDay = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// TODO: LANGUAGES lives in PatientsTable.tsx, move it to a shared file and import it here
const LANGUAGE_LABELS: Record<string, string> = { en: 'English', hi: 'Hindi', mr: 'Marathi' }

const APPT_STATUS: Record<string, { label: string; color: string }> = {
  booked: { label: 'Booked', color: '#3b82f6' },
  confirmed: { label: 'Confirmed', color: '#0d9488' },
  completed: { label: 'Completed', color: '#16a34a' },
  cancelled: { label: 'Cancelled', color: '#94a3b8' },
  no_show: { label: 'No-show', color: '#dc2626' },
}
const apptMeta = (s: string) => APPT_STATUS[s] ?? { label: s.replace('_', ' '), color: '#94a3b8' }
const payColor = (s: string) => (s === 'paid' ? 'green' : s === 'pending' ? 'orange' : 'default')

export default function PatientHistory({
  patient,
  appointments,
  payments,
  totalPaid,
}: {
  patient: Patient
  appointments: Appt[]
  payments: Pay[]
  totalPaid: number
}) {
  const completed = appointments.filter((a) => a.status === 'completed')
  // appointments arrive newest first, so the first completed one is the last visit
  const lastVisit = completed[0]?.starts_at ?? null

  const tiles = [
    { title: 'Total paid', value: inr(totalPaid), icon: <WalletOutlined />, tone: 'green' },
    { title: 'Appointments', value: String(appointments.length), icon: <CalendarOutlined />, tone: 'teal' },
    { title: 'Completed visits', value: String(completed.length), icon: <CheckCircleOutlined />, tone: 'blue' },
    { title: 'Last visit', value: fmtDay(lastVisit), icon: <FieldTimeOutlined />, tone: 'purple' },
  ]

  return (
    <div>
      <Link href="/patients" className="back-link">
        <ArrowLeftOutlined /> Patients
      </Link>

      <div className="profile-card">
        <div className="profile-top">
          <span className="avatar avatar-xl">{patient.full_name.charAt(0).toUpperCase()}</span>
          <div className="profile-main">
            <Typography.Title level={3} style={{ margin: 0 }}>
              {patient.full_name}
            </Typography.Title>
            <div className="profile-meta">
              <span>
                <PhoneOutlined /> {patient.phone}
              </span>
              <Tag bordered={false} style={{ margin: 0 }}>
                {LANGUAGE_LABELS[patient.preferred_language] ?? patient.preferred_language}
              </Tag>
              {patient.consent_at ? (
                <span className="consent consent-yes">
                  <CheckCircleFilled /> Consent given
                </span>
              ) : (
                <span className="consent consent-no">
                  <MinusCircleOutlined /> Consent not recorded
                </span>
              )}
            </div>
          </div>
          <div className="profile-since">
            <div className="stat-title">Patient since</div>
            <div style={{ fontWeight: 550 }}>{fmtDay(patient.created_at)}</div>
          </div>
        </div>
        {patient.notes && (
          <div className="notes-box">
            <div className="notes-label">Notes</div>
            {patient.notes}
          </div>
        )}
      </div>

      <div className="stat-grid">
        {tiles.map((t, i) => (
          <div key={t.title} className={`stat-card tone-${t.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="stat-icon">{t.icon}</span>
            <div>
              <div className="stat-value" style={t.title === 'Last visit' ? { fontSize: 18 } : undefined}>
                {t.value}
              </div>
              <div className="stat-title">{t.title}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="surface" style={{ marginBottom: 20 }}>
        <div className="surface-head">
          <span>Appointments</span>
          <span className="count-pill">{appointments.length}</span>
        </div>
        <Table<Appt>
          rowKey="id"
          dataSource={appointments}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 520 }}
          locale={{ emptyText: <Empty description="No appointments yet" style={{ padding: '24px 0' }} /> }}
          rowClassName={() => 'row-anim'}
          onRow={(_, i) => ({ style: { animationDelay: `${Math.min(i ?? 0, 12) * 30}ms` } })}
          columns={[
            { title: 'When', dataIndex: 'starts_at', render: (v: string) => <span className="time-pill">{fmt(v)}</span> },
            { title: 'Doctor', dataIndex: 'doctor_name' },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => (
                <span className="status-opt">
                  <i className="status-dot" style={{ background: apptMeta(s).color }} />
                  {apptMeta(s).label}
                </span>
              ),
            },
            {
              title: 'Source',
              dataIndex: 'source',
              render: (v: string) => <Tag bordered={false} style={{ textTransform: 'capitalize' }}>{v}</Tag>,
            },
          ]}
        />
      </div>

      <div className="surface">
        <div className="surface-head">
          <span>Payments</span>
          <span className="count-pill">{payments.length}</span>
        </div>
        <Table<Pay>
          rowKey="id"
          dataSource={payments}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 560 }}
          locale={{ emptyText: <Empty description="No payments yet" style={{ padding: '24px 0' }} /> }}
          rowClassName={() => 'row-anim'}
          onRow={(_, i) => ({ style: { animationDelay: `${Math.min(i ?? 0, 12) * 30}ms` } })}
          columns={[
            { title: 'Paid at', dataIndex: 'paid_at', render: (v: string | null) => fmt(v) },
            {
              title: 'Method',
              dataIndex: 'method',
              render: (m: string) => <span className={`method-badge m-${m}`}>{m.toUpperCase()}</span>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (s: string) => (
                <Tag bordered={false} color={payColor(s)} style={{ textTransform: 'capitalize' }}>
                  {s}
                </Tag>
              ),
            },
            {
              title: 'Amount',
              dataIndex: 'amount_inr',
              align: 'right',
              render: (v: number) => <span className="amount">{inr(v)}</span>,
            },
            { title: 'Note', dataIndex: 'note', render: (n: string | null) => <span className="muted-text">{n ?? '—'}</span> },
          ]}
        />
      </div>
    </div>
  )
}