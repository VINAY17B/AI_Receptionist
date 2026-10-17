import { createClient } from '@/lib/supabase/server'; // TODO: match your server client export
import InboxView from './InboxView';

export default async function InboxPage() {
  const supabase = await createClient(); // TODO: drop `await` if your helper is sync

  // RLS limits this to the user's clinic
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, clinic_id, contact_name, external_id, status, handoff_reason, last_message_at')
    .order('last_message_at', { ascending: false });

  return <InboxView initialConversations={conversations ?? []} />;
}