import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';

export default function SupportChatWidget() {
  const { user } = useAuth();
  const { settings } = useStoreSettings();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const previousUnreadRef = useRef(0);
  const audioContextRef = useRef(null);
  const inputRef = useRef(null);

  const isCustomer = user?.role === 'user';
  const supportName = useMemo(
    () => conversation?.assignedEmployee?.name || 'موظف الدعم',
    [conversation]
  );
  const unreadCount = Number(conversation?.customerUnreadCount || 0);

  const playNotificationTone = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const context = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = context;

      if (context.state === 'suspended') {
        context.resume().catch(() => undefined);
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.22);
    } catch {
      // Keep the visual notification even if the sound cannot be played.
    }
  };

  const loadConversation = async () => {
    if (!isCustomer) return null;
    const { data } = await api.get('/support/my');
    setConversation(data);
    return data;
  };

  useEffect(() => {
    if (!open || !isCustomer) return undefined;
    loadConversation()
      .then(() => api.put('/support/my/read').catch(() => undefined))
      .catch(() => undefined);

    const timer = window.setInterval(() => {
      loadConversation().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [open, isCustomer]);

  useEffect(() => {
    if (open && unreadCount > 0) {
      api.put('/support/my/read').catch(() => undefined);
      setConversation((current) => current ? { ...current, customerUnreadCount: 0 } : current);
    }
  }, [open, unreadCount]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!isCustomer) return;
    if (unreadCount > previousUnreadRef.current && !open) {
      playNotificationTone();
      toast.success('لديك رسالة جديدة من الدعم');
    }
    previousUnreadRef.current = unreadCount;
  }, [isCustomer, open, unreadCount]);

  useEffect(() => {
    const handlePrefill = async (event) => {
      const text = event?.detail?.text?.trim() || '';
      setOpen(true);
      setMessage(text);

      if (!isCustomer) return;

      try {
        const data = await loadConversation();
        if (data?.status === 'closed') {
          const reopened = await api.put('/support/my/status', { status: 'open' });
          setConversation(reopened.data);
        }
      } catch {
        // The widget still opens with the prefilled text.
      }
    };

    window.addEventListener('support-chat:prefill', handlePrefill);
    return () => window.removeEventListener('support-chat:prefill', handlePrefill);
  }, [isCustomer]);

  const submitMessage = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    setSending(true);
    try {
      const { data } = await api.post('/support/my/message', { text });
      setConversation(data);
      setMessage('');
      toast.success('تم إرسال الرسالة');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async (status) => {
    try {
      const { data } = await api.put('/support/my/status', { status });
      setConversation(data);
      toast.success(status === 'closed' ? 'تم إغلاق المحادثة' : 'تمت إعادة فتح المحادثة');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث حالة المحادثة');
    }
  };

  if (user?.role === 'admin' || user?.role === 'employee') return null;

  return (
    <div className={`support-chat-widget${open ? ' open' : ''}${unreadCount > 0 && !open ? ' has-unread' : ''}`}>
      {open ? (
        <div className="support-chat-panel">
          <div className="support-chat-head">
            <div>
              <strong>الدعم الفني</strong>
              <span>{isCustomer ? supportName : 'تحتاج إلى تسجيل الدخول لبدء المحادثة'}</span>
            </div>
            <button type="button" className="support-chat-close" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {isCustomer ? (
            <>
              <div className="support-chat-toolbar">
                <span className={`support-chat-status ${conversation?.status === 'closed' ? 'closed' : ''}`}>
                  {conversation?.status === 'closed' ? 'المحادثة مغلقة' : 'المحادثة مفتوحة'}
                </span>
                {conversation ? (
                  <button
                    type="button"
                    className="support-chat-inline-btn"
                    onClick={() => toggleStatus(conversation.status === 'closed' ? 'open' : 'closed')}
                  >
                    <RotateCcw size={14} />
                    {conversation.status === 'closed' ? 'إعادة فتح' : 'إغلاق'}
                  </button>
                ) : null}
              </div>

              <div className="support-chat-messages">
                {conversation?.messages?.length ? conversation.messages.map((item) => (
                  <article
                    key={item._id}
                    className={`support-chat-bubble${item.senderRole === 'customer' ? ' mine' : ''}`}
                  >
                    <strong>{item.senderRole === 'customer' ? 'أنت' : (conversation.assignedEmployee?.name || 'الدعم')}</strong>
                    <p>{item.text}</p>
                  </article>
                )) : (
                  <div className="support-chat-empty">
                    <p>ابدأ المحادثة الآن وسيتم ربطك بموظف دعم للرد عليك.</p>
                  </div>
                )}
              </div>

              <form className="support-chat-form" onSubmit={submitMessage}>
                <input
                  ref={inputRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={conversation?.status === 'closed' ? 'أعد فتح المحادثة أولًا...' : 'اكتب رسالتك هنا...'}
                  disabled={conversation?.status === 'closed'}
                />
                <button type="submit" disabled={sending || conversation?.status === 'closed'}>
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="support-chat-guest">
              <p>سجل الدخول أولًا حتى نربط محادثتك بموظف دعم ونحفظها داخل حسابك.</p>
              <div className="support-chat-guest-actions">
                <Link to="/login" className="primary-btn" onClick={() => setOpen(false)}>تسجيل الدخول</Link>
                {settings?.whatsapp ? (
                  <a
                    href={`https://wa.me/${String(settings.whatsapp).replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-btn"
                  >
                    واتساب
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="support-chat-fab"
        onClick={() => setOpen((current) => !current)}
        aria-label="الدعم الفني"
      >
        {unreadCount > 0 && !open ? <BellRing size={22} /> : <MessageCircle size={22} />}
        {unreadCount > 0 && !open ? <span className="support-chat-badge">{unreadCount}</span> : null}
      </button>
    </div>
  );
}
