'use client';

import { useState, useTransition } from 'react';
import { Button, Empty, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography, message as toast } from 'antd';
import {
  CalendarOutlined, CheckOutlined, CreditCardOutlined, DollarOutlined, EllipsisOutlined,
  FieldTimeOutlined, PlusOutlined, QrcodeOutlined, RiseOutlined,
} from '@ant-design/icons';
import { addPayment, markPaid } from './actions';

type Payment = {
  id: string; amount_inr: number; method: string; status: string;
  note: string | null; paid_at: string; patient_name: string;
};
type Patient = { id: string; full_name: string; phone: string };

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const TZ = 'Asia/Kolkata';

const METHODS = [
  { key: 'cash', label: 'Cash', icon: <DollarOutlined /> },
  { key: 'upi', label: 'UPI', icon: <QrcodeOutlined /> },
  { key: 'card', label: 'Card', icon: <CreditCardOutlined /> },
  { key: 'other', label: 'Other', icon: <EllipsisOutlined /> },
];

const statusColor = (s: string) => (s === 'paid' ? 'green' : s === 'pending' ? 'orange' : 'default');

export default function PaymentsTable({
  payments, patients, totals, byMethod,
}: {
  payments: Payment[];
  patients: Patient[];
  totals: { today: number; week: number; month: number };
  byMethod: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [pending, startTransition] = useTransition();

  const submit = (values: {
    patient_id: string; amount_inr: number;
    method: 'cash' | 'upi' | 'card' | 'other'; status: 'paid' | 'pending'; note?: string;
  }) => {
    startTransition(async () => {
      const res = await addPayment(values);
      if (res.error) return toast.error(res.error);
      toast.success('Payment added');
      form.resetFields();
      setOpen(false);
    });
  };

  const maxMethod = Math.max(0, ...METHODS.map((m) => byMethod[m.key] ?? 0));

  const tiles = [
    { title: 'Today', value: totals.today, icon: <CalendarOutlined />, tone: 'teal' },
    { title: 'This week', value: totals.week, icon: <FieldTimeOutlined />, tone: 'blue' },
    { title: 'This month', value: totals.month, icon: <RiseOutlined />, tone: 'green' },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Payments
          </Typography.Title>
          <div className="page-sub">{payments.length} recorded</div>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Add payment
        </Button>
      </div>

      <div className="stat-grid">
        {tiles.map((t, i) => (
          <div key={t.title} className={`stat-card tone-${t.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
            <span className="stat-icon">{t.icon}</span>
            <div>
              <div className="stat-value">{inr(t.value)}</div>
              <div className="stat-title">{t.title}</div>
            </div>
          </div>
        ))}
        <div className="stat-card method-card" style={{ animationDelay: '180ms' }}>
          <div style={{ width: '100%' }}>
            <div className="stat-title" style={{ marginBottom: 10 }}>This month by method</div>
            {METHODS.map((m) => {
              const v = byMethod[m.key] ?? 0;
              return (
                <div key={m.key} className="method-row">
                  <span className="method-label">{m.icon} {m.label}</span>
                  <span className="method-bar">
                    <i className={`m-${m.key}`} style={{ width: `${maxMethod ? (v / maxMethod) * 100 : 0}%` }} />
                  </span>
                  <span className="method-val">{inr(v)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="surface">
        <Table
          rowKey="id"
          dataSource={payments}
          pagination={{ pageSize: 15, hideOnSinglePage: true }}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description="No payments yet" style={{ padding: '32px 0' }} /> }}
          rowClassName={() => 'row-anim'}
          onRow={(_, i) => ({ style: { animationDelay: `${Math.min(i ?? 0, 12) * 30}ms` } })}
          columns={[
            { title: 'Date', dataIndex: 'paid_at',
              render: (v: string) => (
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })}
                  </div>
                  <div className="patient-phone">
                    {new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ })}
                  </div>
                </div>
              ) },
            { title: 'Patient', dataIndex: 'patient_name',
              render: (v: string) => (
                <div className="patient-cell">
                  <span className="avatar">{(v ?? '?').charAt(0).toUpperCase()}</span>
                  <span className="patient-name">{v}</span>
                </div>
              ) },
            { title: 'Amount', dataIndex: 'amount_inr',
              render: (v: number) => <span className="amount">{inr(v)}</span> },
            { title: 'Method', dataIndex: 'method',
              render: (v: string) => <span className={`method-badge m-${v}`}>{v.toUpperCase()}</span> },
            { title: 'Status', dataIndex: 'status',
              render: (v: string) => <Tag bordered={false} color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v}</Tag> },
            { title: 'Note', dataIndex: 'note',
              render: (v: string | null) => <span className="muted-text">{v ?? '-'}</span> },
            { title: '', key: 'act', width: 120,
              render: (_: unknown, r: Payment) =>
                r.status === 'pending' ? (
                  <Button size="small" type="primary" ghost icon={<CheckOutlined />} onClick={async () => {
                    const res = await markPaid(r.id);
                    if (res.error) toast.error(res.error);
                  }}>Mark paid</Button>
                ) : null },
          ]}
        />
      </div>

      <Modal title="Add payment" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={pending} okText="Save" centered destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={submit} preserve={false}
          initialValues={{ method: 'cash', status: 'paid' }}>
          <Form.Item name="patient_id" label="Patient" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.phone})` }))} />
          </Form.Item>
          <Form.Item name="amount_inr" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="method" label="Method">
            <Select options={[
              { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' },
            ]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }]} />
          </Form.Item>
          <Form.Item name="note" label="Note"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}