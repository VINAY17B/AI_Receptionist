import { createClient } from '@/lib/supabase/server';
import PaymentsTable from './PaymentsTable';

const IST = 19800000; // +5:30 in ms (India has no DST)

function istBoundaries() {
  const now = Date.now();
  const shifted = new Date(now + IST);
  const dayStart = Math.floor((now + IST) / 86400000) * 86400000 - IST;
  const dow = (shifted.getUTCDay() + 6) % 7; // Monday = 0
  const weekStart = dayStart - dow * 86400000;
  const monthStart = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - IST;
  return { dayStart, weekStart, monthStart };
}

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { dayStart, weekStart, monthStart } = istBoundaries();

  const [{ data: rows }, { data: patients }, { data: monthPaid }] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount_inr, method, status, note, paid_at, patients(full_name)')
      .order('paid_at', { ascending: false })
      .limit(100),
    supabase.from('patients').select('id, full_name, phone').order('full_name'),
    supabase
      .from('payments')
      .select('amount_inr, paid_at, method')
      .eq('status', 'paid')
      .gte('paid_at', new Date(Math.min(weekStart, monthStart)).toISOString()),
  ]);
  
    const byMethod: Record<string, number> = {};
  for (const r of monthPaid ?? []) {
    if (new Date(r.paid_at).getTime() < monthStart) continue;
    byMethod[r.method] = (byMethod[r.method] ?? 0) + r.amount_inr;
  }

  const sumFrom = (from: number) =>
    (monthPaid ?? [])
      .filter((r) => new Date(r.paid_at).getTime() >= from)
      .reduce((s, r) => s + r.amount_inr, 0);

  const payments = (rows ?? []).map((r) => ({
    id: r.id,
    amount_inr: r.amount_inr,
    method: r.method as string,
    status: r.status as string,
    note: r.note as string | null,
    paid_at: r.paid_at as string,
    patient_name: (r.patients as unknown as { full_name: string } | null)?.full_name ?? '—',
  }));

  return (
    <PaymentsTable
      payments={payments}
      patients={patients ?? []}
      totals={{ today: sumFrom(dayStart), week: sumFrom(weekStart), month: sumFrom(monthStart) }}
      byMethod={byMethod}
    />
  );
}