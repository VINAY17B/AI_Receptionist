import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PatientHistory from './PatientHistory';

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next 15; on Next 14 use { id: string } and drop the await
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, phone, preferred_language, notes, consent_at, created_at')
    .eq('id', id)
    .single();
  if (!patient) notFound();

  const [{ data: appts }, { data: payments }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, status, source, starts_at, doctors(full_name)') // TODO(verify): time column and doctor name column
      .eq('patient_id', id)
      .order('starts_at', { ascending: false }), // TODO(verify): same time column
    supabase
      .from('payments')
      .select('id, amount_inr, method, status, note, paid_at')
      .eq('patient_id', id)
      .order('paid_at', { ascending: false }),
  ]);

  const totalPaid = (payments ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.amount_inr, 0);

  return (
    <PatientHistory
      patient={patient}
      appointments={(appts ?? []).map((a) => ({
        id: a.id,
        status: a.status as string,
        source: a.source as string,
        starts_at: a.starts_at as string,
        doctor_name: (a.doctors as unknown as { full_name: string } | null)?.full_name ?? '—',
      }))}
      payments={payments ?? []}
      totalPaid={totalPaid}
    />
  );
}