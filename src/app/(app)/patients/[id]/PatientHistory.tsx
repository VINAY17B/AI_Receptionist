'use client'
import Link from 'next/link'
import { Card, Descriptions, Statistic, Table, Tag, Typography } from 'antd'

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
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Link href="/patients">← Patients</Link>
      <Typography.Title level={3} style={{ margin: 0 }}>
        {patient.full_name}
      </Typography.Title>

      <Card>
        <Descriptions column={2}>
          <Descriptions.Item label="Phone">{patient.phone}</Descriptions.Item>
          {/* TODO: show language label; LANGUAGES lives in PatientsTable.tsx, move it to a shared file */}
          <Descriptions.Item label="Language">{patient.preferred_language}</Descriptions.Item>
          <Descriptions.Item label="Consent">
            {patient.consent_at ? <Tag color="green">Given</Tag> : <Tag>Not recorded</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="Patient since">{fmt(patient.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Notes" span={2}>{patient.notes ?? '—'}</Descriptions.Item>
        </Descriptions>
        <Statistic title="Total paid" value={inr(totalPaid)} />
      </Card>

      <Card title="Appointments">
        <Table<Appt>
          rowKey="id"
          size="small"
          dataSource={appointments}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'No appointments yet.' }}
          columns={[
            { title: 'When', dataIndex: 'starts_at', render: fmt },
            { title: 'Doctor', dataIndex: 'doctor_name' },
            { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag>{s}</Tag> },
            { title: 'Source', dataIndex: 'source' },
          ]}
        />
      </Card>

      <Card title="Payments">
        <Table<Pay>
          rowKey="id"
          size="small"
          dataSource={payments}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: 'No payments yet.' }}
          columns={[
            { title: 'Paid at', dataIndex: 'paid_at', render: fmt },
            { title: 'Method', dataIndex: 'method', render: (m: string) => m.toUpperCase() },
            { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag>{s}</Tag> },
            { title: 'Amount', dataIndex: 'amount_inr', align: 'right', render: inr },
            { title: 'Note', dataIndex: 'note', render: (n: string | null) => n ?? '—' },
          ]}
        />
      </Card>
    </div>
  )
}