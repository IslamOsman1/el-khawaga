import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve();
    return;
  }

  const existing = document.querySelector('script[data-google-gsi="true"]');
  if (existing) {
    existing.addEventListener('load', resolve, { once: true });
    existing.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.dataset.googleGsi = 'true';
  script.addEventListener('load', resolve, { once: true });
  script.addEventListener('error', reject, { once: true });
  document.head.appendChild(script);
});

export default function SocialLoginButtons() {
  const { settings, refresh } = useStoreSettings();
  const { googleLogin } = useAuth();
  const googleClientId = settings?.googleClientId;
  const initializedClientIdRef = useRef('');
  const buttonHostRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const ensureGoogleReady = async (clientId) => {
    await loadGoogleScript();
    if (!window.google?.accounts?.id) {
      throw new Error('google-sdk-unavailable');
    }

    if (initializedClientIdRef.current !== clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            await googleLogin(response.credential);
          } catch (error) {
            toast.error(error.response?.data?.message || 'فشل تسجيل الدخول بجوجل');
          }
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true
      });

      initializedClientIdRef.current = clientId;
    }

    if (buttonHostRef.current) {
      buttonHostRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonHostRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: Math.max(240, Math.min(buttonHostRef.current.offsetWidth || 320, 360)),
        logo_alignment: 'left'
      });
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    ensureGoogleReady(googleClientId).catch(() => {
      toast.error('تعذر تحميل تسجيل الدخول بجوجل');
    });
  }, [googleClientId]);

  const handleRetry = async () => {
    setLoading(true);
    let clientId = googleClientId;

    if (!clientId) {
      try {
        const freshSettings = await refresh();
        clientId = freshSettings?.googleClientId || '';
      } catch {
        clientId = '';
      }
    }

    if (!clientId) {
      toast.error('تسجيل الدخول بجوجل غير متاح حاليًا، تأكد من GOOGLE_CLIENT_ID وإعادة نشر السيرفر');
      setLoading(false);
      return;
    }

    try {
      await ensureGoogleReady(clientId);
      toast.success('زر Google جاهز الآن');
    } catch {
      toast.error('تعذر تحميل تسجيل الدخول بجوجل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="social-login-stack">
      <div ref={buttonHostRef} className="google-signin-host" />
      {!googleClientId ? (
        <button type="button" className="secondary-btn social-fallback-btn" onClick={handleRetry} disabled={loading}>
          {loading ? 'جارٍ التحميل...' : 'تسجيل الدخول بـ Google'}
        </button>
      ) : null}
    </div>
  );
}
