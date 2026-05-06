import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PasswordField from '../components/PasswordField.jsx';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyAddress = () => ({ label: '', address: '' });

export default function SettingsPage() {
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    avatar: '',
    addresses: [emptyAddress()]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => {
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          password: '',
          avatar: data.avatar || '',
          addresses: data.addresses?.length ? data.addresses.map((item) => ({
            label: item.label || '',
            address: item.address || ''
          })) : [emptyAddress()]
        });
      })
      .catch(() => toast.error('تعذر تحميل إعدادات الملف الشخصي'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateAddress = (index, key, value) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)
    }));
  };

  const addAddress = () => {
    setForm((current) => ({ ...current, addresses: [...current.addresses, emptyAddress()] }));
  };

  const removeAddress = (index) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.length === 1
        ? [emptyAddress()]
        : current.addresses.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const body = new FormData();
      body.append('image', file);
      const { data } = await api.post('/users/me/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm((current) => ({ ...current, avatar: data.user?.avatar || current.avatar }));
      await refreshProfile();
      toast.success('تم تحديث صورة الملف الشخصي');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر رفع الصورة');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await api.put('/users/me', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        addresses: form.addresses
      });
      await refreshProfile();
      updateField('password', '');
      toast.success('تم حفظ إعدادات الملف الشخصي');
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return <main className="app-shell home-screen market-home settings-page-shell">
    <section className="panel-card settings-page-panel">
      <div className="section-head">
        <div>
          <h1>الإعدادات</h1>
          <p>إعدادات الملف الشخصي</p>
        </div>
      </div>

      {loading
        ? <p className="muted">جاري تحميل الإعدادات...</p>
        : <form className="settings-form" onSubmit={submit}>
          <section className="settings-avatar-block">
            <div className="settings-avatar-preview">
              {form.avatar ? <img src={form.avatar} alt={form.name || 'Avatar'} className="settings-avatar-image" /> : <span>{(form.name || 'AW').trim().slice(0, 2).toUpperCase()}</span>}
            </div>
            <div className="settings-avatar-copy">
              <strong>صورة الملف الشخصي</strong>
              <span>يمكنك رفع صورة جديدة للحساب.</span>
            </div>
            <label className="admin-file-pill settings-upload-pill">
              <input type="file" accept="image/*" onChange={uploadAvatar} />
              {uploading ? 'جارٍ الرفع...' : 'تغيير الصورة'}
            </label>
          </section>

          <div className="settings-grid">
            <div className="admin-field">
              <label className="admin-field-label">الاسم</label>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">رقم الهاتف</label>
              <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-field-label">كلمة المرور الجديدة</label>
              <PasswordField
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="اتركها فارغة إذا لا تريد التغيير"
                autoComplete="new-password"
              />
            </div>
          </div>

          <section className="settings-addresses-block">
            <div className="section-head compact">
              <h2>العناوين</h2>
              <button type="button" className="secondary-btn settings-add-address" onClick={addAddress}>إضافة عنوان جديد</button>
            </div>

            <div className="settings-addresses-stack">
              {form.addresses.map((item, index) => <div key={`address-${index}`} className="settings-address-card">
                <div className="admin-field">
                  <label className="admin-field-label">اسم العنوان</label>
                  <input
                    value={item.label}
                    onChange={(event) => updateAddress(index, 'label', event.target.value)}
                    placeholder="مثال: المنزل أو العمل"
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-field-label">العنوان</label>
                  <textarea
                    value={item.address}
                    onChange={(event) => updateAddress(index, 'address', event.target.value)}
                    placeholder="اكتب العنوان بالتفصيل"
                  />
                </div>
                <button type="button" className="table-action-btn danger" onClick={() => removeAddress(index)}>حذف</button>
              </div>)}
            </div>
          </section>

          <button className="primary-btn settings-save-btn" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</button>
        </form>}
    </section>
  </main>;
}
