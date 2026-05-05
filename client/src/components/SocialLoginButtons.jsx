import React, { useEffect } from 'react';
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
  const { settings } = useStoreSettings();
  const { googleLogin } = useAuth();
  const googleClientId = settings?.googleClientId;

  useEffect(() => {
    let active = true;
    if (!googleClientId) return undefined;

    loadGoogleScript()
      .then(() => {
        if (!active || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              await googleLogin(response.credential);
            } catch (error) {
              toast.error(error.response?.data?.message || 'فشل تسجيل الدخول بجوجل');
            }
          }
        });
      })
      .catch(() => {
        if (active) toast.error('تعذر تحميل تسجيل الدخول بجوجل');
      });

    return () => {
      active = false;
    };
  }, [googleClientId, googleLogin]);

  const handleGoogleLogin = () => {
    if (!googleClientId || !window.google?.accounts?.id) {
      toast.error('تسجيل الدخول بجوجل غير متاح حاليًا');
      return;
    }

    window.google.accounts.id.prompt();
  };

  return <div className="social-login-stack icons-only-social-login">
    <button
      type="button"
      className={`social-icon-btn google-social-btn${googleClientId ? '' : ' social-icon-disabled'}`}
      onClick={handleGoogleLogin}
      title="تسجيل الدخول بجوجل"
      aria-label="تسجيل الدخول بجوجل"
    >
      <span className="google-icon-mark" aria-hidden="true">G</span>
    </button>
  </div>;
}
