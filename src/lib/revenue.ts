// Revenue windows are computed in IST so "today" matches the clinic's day.
const IST_MS = 5.5 * 60 * 60 * 1000;

function istShift(d: Date) {
  return new Date(d.getTime() + IST_MS);
}
function fromIst(shifted: Date) {
  return new Date(shifted.getTime() - IST_MS);
}

export function revenueWindows(now = new Date()) {
  const s = istShift(now);
  s.setUTCHours(0, 0, 0, 0);
  const today = fromIst(s);

  const w = new Date(s);
  w.setUTCDate(w.getUTCDate() - ((s.getUTCDay() + 6) % 7)); // Monday
  const week = fromIst(w);

  const m = new Date(s);
  m.setUTCDate(1);
  const month = fromIst(m);

  return { today, week, month };
}

type Row = { method: string; amount_inr: number; paid_at: string };

export function summarize(rows: Row[], now = new Date()) {
  const { today, week, month } = revenueWindows(now);
  const out = {
    today: 0,
    week: 0,
    month: 0,
    byMethod: { cash: 0, upi: 0, card: 0, other: 0 } as Record<string, number>,
  };
  for (const r of rows) {
    const t = new Date(r.paid_at);
    if (t >= today) out.today += r.amount_inr;
    if (t >= week) out.week += r.amount_inr;
    if (t >= month) {
      out.month += r.amount_inr;
      out.byMethod[r.method] = (out.byMethod[r.method] ?? 0) + r.amount_inr;
    }
  }
  return out;
}