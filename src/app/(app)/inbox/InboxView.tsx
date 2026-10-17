'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Button, Empty, Input, List, Select, Tag, Typography, message as toast } from 'antd';
import { createClient } from '@/lib/supabase/client'; // TODO: match your browser client export
import { sendReply, setConversationStatus } from './actions';

type Conv = {
  id: string;
  clinic_id: string;
  contact_name: string | null;
  external_id: string;
  status: string;
  handoff_reason: string | null;
  last_message_at: string;
};
type Msg = {
  id: string;
  conversation_id: string;
  direction: string;
  body: string;
  created_at: string;
};

const OUTBOUND = 'out';

const statusColor = (s: string) =>
  s === 'bot' ? 'green' : s === 'needs_human' ? 'orange' : 'default';

export default function InboxView({ initialConversations }: { initialConversations: Conv[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [convs, setConvs] = useState<Conv[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = convs.find((c) => c.id === activeId) ?? null;

  // Keep the conversation list fresh
  useEffect(() => {
    const reload = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id, clinic_id, contact_name, external_id, status, handoff_reason, last_message_at')
        .order('last_message_at', { ascending: false });
      if (data) setConvs(data);
    };
    const ch = supabase
      .channel('inbox-convs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase]);

  // Load and stream messages for the selected conversation
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;

    supabase
      .from('messages')
      .select('id, conversation_id, direction, body, created_at')
      .eq('conversation_id', activeId)
      .order('created_at')
      .then(({ data }) => {
        if (!cancelled) setMsgs(data ?? []);
      });

    const ch = supabase
      .channel(`inbox-msgs-${activeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [activeId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const onSend = () => {
    if (!activeId || !draft.trim()) return;
    const text = draft;
    startTransition(async () => {
      const res = await sendReply(activeId, text);
      if (res.error) toast.error(res.error);
      else setDraft('');
    });
  };

  const onStatusChange = async (v: 'bot' | 'needs_human' | 'closed') => {
    if (!activeId) return;
    const res = await setConversationStatus(activeId, v);
    if (res.error) toast.error(res.error);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8 }}>
      <div style={{ width: 320, overflow: 'auto', borderRight: '1px solid #f0f0f0' }}>
        <List
          dataSource={convs}
          locale={{ emptyText: 'No conversations yet' }}
          renderItem={(c) => (
            <List.Item
              onClick={() => setActiveId(c.id)}
              style={{ cursor: 'pointer', padding: 12, background: c.id === activeId ? '#e6f4ff' : undefined }}
            >
              <List.Item.Meta
                title={c.contact_name ?? c.external_id}
                description={new Date(c.last_message_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              />
              <Tag color={statusColor(c.status)}>{c.status.replace('_', ' ')}</Tag>
            </List.Item>
          )}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, minWidth: 0 }}>
        {!active ? (
          <Empty description="Select a conversation" style={{ margin: 'auto' }} />
        ) : (
          <>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {active.contact_name ?? active.external_id}
              {active.handoff_reason && (
                <Tag color="red" style={{ marginLeft: 8 }}>
                  {active.handoff_reason}
                </Tag>
              )}
              <Select
                size="small"
                style={{ marginLeft: 12, width: 130 }}
                value={active.status}
                onChange={onStatusChange}
                options={[
                  { value: 'bot', label: 'Bot handles' },
                  { value: 'needs_human', label: 'Needs human' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
            </Typography.Title>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {msgs.map((m) => (
                <div
                  key={m.id}
                  style={{ display: 'flex', justifyContent: m.direction === OUTBOUND ? 'flex-end' : 'flex-start', margin: '6px 0' }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '8px 12px',
                      borderRadius: 12,
                      whiteSpace: 'pre-wrap',
                      background: m.direction === OUTBOUND ? '#d9f7be' : '#f5f5f5',
                    }}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder="Type a reply (Enter to send, Shift+Enter for new line)"
              />
              <Button type="primary" loading={pending} onClick={onSend}>
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}