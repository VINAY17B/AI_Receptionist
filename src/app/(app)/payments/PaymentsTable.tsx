'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Statistic, Table, Tag, message as toast } from 'antd';
import { addPayment, markPaid } from './actions';

type Payment = {
  id: string; amount_inr: number; method: string; status: string;
  note: string | null; paid_at: string; patient_name: string;
};
type Patient = { id: string; full_name: string; phone: string };

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

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

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <Card><Statistic title="Today" value={inr(totals.today)} /></Card>
        <Card><Statistic title="This week" value={inr(totals.week)} /></Card>
        <Card><Statistic title="This month" value={inr(totals.month)} /></Card>
        <Card>
          <Statistic
            title="This month by method"
            value={['cash', 'upi', 'card', 'other']
              .map((m) => `${m.toUpperCase()} ${inr(byMethod[m] ?? 0)}`)
              .join(' · ')}
            valueStyle={{ fontSize: 16 }}
          />
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Payments</h2>
        <Button type="primary" onClick={() => setOpen(true)}>Add payment</Button>
      </div>

      <Table
        rowKey="id"
        dataSource={payments}
        pagination={{ pageSize: 15 }}
        columns={[
          { title: 'Date', dataIndex: 'paid_at',
            render: (v: string) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) },
          { title: 'Patient', dataIndex: 'patient_name' },
          { title: 'Amount', dataIndex: 'amount_inr', render: (v: number) => inr(v) },
          { title: 'Method', dataIndex: 'method', render: (v: string) => v.toUpperCase() },
          { title: 'Status', dataIndex: 'status',
            render: (v: string) => <Tag color={v === 'paid' ? 'green' : v === 'pending' ? 'orange' : 'default'}>{v}</Tag> },
          { title: 'Note', dataIndex: 'note' },
          { title: '', key: 'act',
            render: (_: unknown, r: Payment) =>
              r.status === 'pending' ? (
                <Button size="small" onClick={async () => {
                  const res = await markPaid(r.id);
                  if (res.error) toast.error(res.error);
                }}>Mark paid</Button>
              ) : null },
        ]}
      />

      <Modal title="Add payment" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={pending} okText="Save">
        <Form form={form} layout="vertical" onFinish={submit}
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