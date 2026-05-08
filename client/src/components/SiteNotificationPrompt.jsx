import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BellRing, X } from 'lucide-react';
import { ensurePushSubscription } from '../utils/pushNotifications.js';

const DISMISS_KEY = 'site-notification-prompt-dismissed';

export default function SiteNotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isHidden, setIsHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    const nextPermission = window.Notification.permission;

    setIsSupported(true);
    setPermission(nextPermission);
    setIsHidden(dismissed || nextPermission !== 'default');
  }, []);

  const dismissPrompt = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setIsHidden(true);
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('إشعارات المتصفح غير مدعومة على هذا الجهاز');
      return;
    }

    try {
      const nextPermission = await window.Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission === 'granted') {
        localStorage.removeItem(DISMISS_KEY);
        setIsHidden(true);
        const result = await ensurePushSubscription().catch(() => ({ ok: false, reason: 'sync-failed' }));
        if (result.ok) {
          toast.success('تم تفعيل إشعارات المتصفح');
          return;
        }
        if (result.reason === 'not-configured') {
          toast('تم السماح بالإشعارات، وبقي تفعيل مفاتيح Push على السيرفر');
          return;
        }
        toast.success('تم تفعيل إشعارات المتصفح');
        return;
      }

      if (nextPermission === 'denied') {
        localStorage.setItem(DISMISS_KEY, '1');
        setIsHidden(true);
        toast('يمكنك تفعيل الإشعارات لاحقًا من إعدادات المتصفح');
        return;
      }

      toast('لم يتم تفعيل الإشعارات بعد');
    } catch {
      toast.error('تعذر طلب إذن الإشعارات');
    }
  };

  if (!isSupported || isHidden || permission !== 'default') {
    return null;
  }

  return (
    <section className="site-notification-prompt">
      <div className="container">
        <div className="site-notification-card" role="status" aria-live="polite">
          <div className="site-notification-copy">
            <span className="site-notification-icon" aria-hidden="true">
              <BellRing size={20} />
            </span>
            <div>
              <strong>فعّل إشعارات الموقع</strong>
              <p>اسمح بإشعارات المتصفح لتصلك تحديثات حالة الطلب ورسائل الدعم والعروض الجديدة.</p>
            </div>
          </div>

          <div className="site-notification-actions">
            <button type="button" className="primary-btn site-notification-enable" onClick={requestPermission}>
              السماح بالإشعارات
            </button>
            <button
              type="button"
              className="site-notification-dismiss"
              onClick={dismissPrompt}
              aria-label="إغلاق اقتراح الإشعارات"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
