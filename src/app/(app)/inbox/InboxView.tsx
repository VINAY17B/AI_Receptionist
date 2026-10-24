'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Button, Empty, Input, Select, Tag, message as toast } from 'antd';
import { ArrowLeftOutlined, MessageOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons';
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
const TZ = 'Asia/Kolkata';

const STATUS_META: Record<string, { label: string; color: string }> = {
  bot: { label: 'Bot handles', color: '#16a34a' },
  needs_human: { label: 'Needs human', color: '#d97706' },
  closed: { label: 'Closed', color: '#94a3b8' },
};
const meta = (s: string) => STATUS_META[s] ?? { label: s.replace('_', ' '), color: '#94a3b8' };

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({
  value,
  label: (
    <span className="status-opt">
      <i className="status-dot" style={{ background: m.color }} />
      {m.label}
    </span>
  ),
}));

const nameOf = (c: Conv) => c.contact_name ?? c.external_id;
const initialOf = (c: Conv) => nameOf(c).replace(/^\+/, '').charAt(0).toUpperCase() || '?';
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ });
const listTime = (iso: string) =>
  dayKey(iso) === dayKey(new Date().toISOString()) ? timeLabel(iso) : dayLabel(iso);

export default function InboxView({ initialConversations }: { initialConversations: Conv[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [convs, setConvs] = useState<Conv[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = convs.find((c) => c.id === activeId) ?? null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter((c) => nameOf(c).toLowerCase().includes(q) || c.external_id.includes(q));
  }, [convs, query]);

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
    <div className={`inbox${activeId ? ' has-active' : ''}`}>
      <div className="inbox-list">
        <div className="inbox-search">
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search conversations"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="inbox-items">
          {visible.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={query.trim() ? 'No matches' : 'No conversations yet'}
              style={{ padding: '40px 0' }}
            />
          ) : (
            visible.map((c, i) => (
              <div
                key={c.id}
                className={`conv${c.id === activeId ? ' active' : ''}`}
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                onClick={() => setActiveId(c.id)}
              >
                <span className="avatar avatar-lg">{initialOf(c)}</span>
                <div className="conv-body">
                  <div className="conv-top">
                    <span className="conv-name">{nameOf(c)}</span>
                    <span className="conv-time">{listTime(c.last_message_at)}</span>
                  </div>
                  <div className="conv-bottom">
                    <i className="status-dot" style={{ background: meta(c.status).color }} />
                    {meta(c.status).label}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="chat">
        {!active ? (
          <Empty
            image={<MessageOutlined style={{ fontSize: 44, color: '#cbd5e1' }} />}
            description="Select a conversation to start"
            style={{ margin: 'auto' }}
          />
        ) : (
          <>
            <div className="chat-head">
              <Button className="back-btn" type="text" icon={<ArrowLeftOutlined />} onClick={() => setActiveId(null)} />
              <span className="avatar avatar-lg">{initialOf(active)}</span>
              <div className="chat-title">
                <div className="patient-name">{nameOf(active)}</div>
                <div className="patient-phone">{active.external_id}</div>
              </div>
              {active.handoff_reason && (
                <Tag color="red" bordered={false} style={{ margin: 0 }}>
                  {active.handoff_reason}
                </Tag>
              )}
              <Select
                size="small"
                style={{ marginLeft: 'auto', width: 150 }}
                value={active.status as 'bot' | 'needs_human' | 'closed'}
                onChange={onStatusChange}
                options={STATUS_OPTIONS}
              />
            </div>

            <div className="chat-scroll">
              {msgs.map((m, i) => {
                const out = m.direction === OUTBOUND;
                const newDay = i === 0 || dayKey(msgs[i - 1].created_at) !== dayKey(m.created_at);
                return (
                  <div key={m.id}>
                    {newDay && <div className="day-sep"><span>{dayLabel(m.created_at)}</span></div>}
                    <div className={`bubble-row ${out ? 'out' : 'in'}`}>
                      <div className="bubble">
                        {m.body}
                        <div className="bubble-time">{timeLabel(m.created_at)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="composer">
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
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<SendOutlined />}
                loading={pending}
                disabled={!draft.trim()}
                onClick={onSend}
                aria-label="Send"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}