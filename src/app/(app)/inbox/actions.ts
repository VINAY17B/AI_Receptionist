'use server';

import { createClient } from '@/lib/supabase/server';

// Matches the DB enums: conv_status = bot/needs_human/closed
const HUMAN_STATUS = 'needs_human'; // staff replied → bot stays paused

export async function sendReply(conversationId: string, body: string) {
  const text = body.trim();
  if (!text) return { error: 'Message is empty' };

  const supabase = await createClient();

  // RLS: the user can only see conversations of their own clinic
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) return { error: 'Conversation not found' };

  let res: Response;
  try {
    res = await fetch(`${process.env.BOT_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.BOT_INTERNAL_KEY ?? '',
      },
      body: JSON.stringify({ conversation_id: conv.id, body: text }),
      cache: 'no-store',
    });
  } catch {
    return { error: 'Bot service is not reachable' };
  }
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    return { error: j?.detail ?? `Send failed (${res.status})` };
  }

  await supabase.from('conversations').update({ status: HUMAN_STATUS }).eq('id', conv.id);
  return { error: null };
}

export async function setConversationStatus(
  conversationId: string,
  status: 'bot' | 'needs_human' | 'closed',
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', conversationId);
  return { error: error?.message ?? null };
}