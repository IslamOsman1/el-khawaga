import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Pencil, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordField from '../components/PasswordField.jsx';
import PhoneInputField from '../components/PhoneInputField.jsx';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStoreSettings } from '../context/StoreSettingsContext.jsx';
import { composePhoneNumber, phoneFormatHelpText, splitPhoneNumber } from '../utils/phone.js';

const avatarViewportSize = 320;

const emptyAddress = () => ({
  label: '',
  governorate: '',
  city: '',
  street: '',
  notes: '',
  address: ''
});

const normalizeAddress = (item = {}) => ({
  _id: item._id || '',
  label: item.label || '',
  governorate: item.governorate || '',
  city: item.city || '',
  street: item.street || item.address || '',
  notes: item.notes || '',
  address: item.address || item.street || ''
});

const createEmptyCropper = () => ({
  open: false,
  src: '',
  file: null,
  zoom: 1,
  baseScale: 1,
  offset: { x: 0, y: 0 },
  naturalWidth: 0,
  naturalHeight: 0
});

const getRenderedCropSize = (cropper) => ({
  width: cropper.naturalWidth * cropper.baseScale * cropper.zoom,
  height: cropper.naturalHeight * cropper.baseScale * cropper.zoom
});

const clampCropOffset = (offset, renderedSize) => {
  const maxX = Math.max(0, (renderedSize.width - avatarViewportSize) / 2);
  const maxY = Math.max(0, (renderedSize.height - avatarViewportSize) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y))
  };
};

export default function SettingsPage() {
  const { refreshProfile } = useAuth();
  const { settings } = useStoreSettings();
  const dragRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    avatar: '',
    addresses: []
  });
  const [countryCode, setCountryCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addressEditor, setAddressEditor] = useState({
    open: false,
    index: null,
    data: emptyAddress()
  });
  const [avatarCropper, setAvatarCropper] = useState(createEmptyCropper);

  const availableGovernorates = useMemo(
    () => settings?.checkout?.governorates || [],
    [settings]
  );

  const availableCities = useMemo(() => {
    const selectedGovernorate = availableGovernorates.find((item) => item.name === addressEditor.data.governorate);
    return selectedGovernorate?.cities || [];
  }, [addressEditor.data.governorate, availableGovernorates]);

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => {
        const parsedPhone = splitPhoneNumber(data.phone || '');
        setForm({
          name: data.name || '',
          email: data.email || '',
          password: '',
          avatar: data.avatar || '',
          addresses: data.addresses?.length ? data.addresses.map(normalizeAddress) : []
        });
        setCountryCode(parsedPhone.countryCode);
        setLocalPhone(parsedPhone.localNumber);
      })
      .catch(() => toast.error('تعذر تحميل إعدادات الملف الشخصي'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => {
    if (avatarCropper.src) URL.revokeObjectURL(avatarCropper.src);
  }, [avatarCropper.src]);

  useEffect(() => {
    if (!avatarCropper.open) return undefined;

    const handleMove = (event) => {
      if (!dragRef.current) return;

      const point = 'touches' in event ? event.touches[0] : event;
      if (!point) return;
      if ('preventDefault' in event) event.preventDefault();

      setAvatarCropper((current) => {
        const renderedSize = getRenderedCropSize(current);
        return {
          ...current,
          offset: clampCropOffset({
            x: dragRef.current.originX + (point.clientX - dragRef.current.clientX),
            y: dragRef.current.originY + (point.clientY - dragRef.current.clientY)
          }, renderedSize)
        };
      });
    };

    const stopDrag = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', stopDrag);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [avatarCropper.open]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openAddressEditor = (index = null) => {
    setAddressEditor({
      open: true,
      index,
      data: index === null ? emptyAddress() : normalizeAddress(form.addresses[index])
    });
  };

  const closeAddressEditor = () => {
    setAddressEditor({
      open: false,
      index: null,
      data: emptyAddress()
    });
  };

  const updateAddressDraft = (key, value) => {
    setAddressEditor((current) => {
      const nextData = { ...current.data, [key]: value };
      if (key === 'governorate') nextData.city = '';
      nextData.address = nextData.street;
      return { ...current, data: nextData };
    });
  };

  const saveAddressDraft = () => {
    const nextAddress = normalizeAddress(addressEditor.data);

    if (!nextAddress.label.trim()) {
      toast.error('أدخل اسم العنوان أولًا');
      return;
    }

    if (!nextAddress.governorate.trim() || !nextAddress.city.trim() || !nextAddress.street.trim()) {
      toast.error('أكمل بيانات العنوان قبل الحفظ');
      return;
    }

    setForm((current) => {
      const nextAddresses = [...current.addresses];
      if (addressEditor.index === null) {
        nextAddresses.unshift(nextAddress);
      } else {
        nextAddresses[addressEditor.index] = nextAddress;
      }
      return { ...current, addresses: nextAddresses };
    });

    closeAddressEditor();
    toast.success('تم تجهيز العنوان الجديد');
  };

  const removeAddress = (index) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const closeAvatarCropper = () => {
    setAvatarCropper((current) => {
      if (current.src) URL.revokeObjectURL(current.src);
      return createEmptyCropper();
    });
    dragRef.current = null;
  };

  const uploadAvatarFile = async (file) => {
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
    }
  };

  const openAvatarCropper = (file) => {
    const nextUrl = URL.createObjectURL(file);
    setAvatarCropper((current) => {
      if (current.src) URL.revokeObjectURL(current.src);
      return {
        open: true,
        src: nextUrl,
        file,
        zoom: 1,
        baseScale: 1,
        offset: { x: 0, y: 0 },
        naturalWidth: 0,
        naturalHeight: 0
      };
    });
  };

  const uploadAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    openAvatarCropper(file);
    event.target.value = '';
  };

  const handleCropImageLoad = (event) => {
    const naturalWidth = event.currentTarget.naturalWidth;
    const naturalHeight = event.currentTarget.naturalHeight;
    const baseScale = Math.max(
      avatarViewportSize / naturalWidth,
      avatarViewportSize / naturalHeight
    );

    setAvatarCropper((current) => ({
      ...current,
      naturalWidth,
      naturalHeight,
      baseScale,
      zoom: 1.05,
      offset: { x: 0, y: 0 }
    }));
  };

  const updateCropZoom = (value) => {
    const nextZoom = Number(value);
    setAvatarCropper((current) => {
      const renderedSize = {
        width: current.naturalWidth * current.baseScale * nextZoom,
        height: current.naturalHeight * current.baseScale * nextZoom
      };
      return {
        ...current,
        zoom: nextZoom,
        offset: clampCropOffset(current.offset, renderedSize)
      };
    });
  };

  const startCropDrag = (clientX, clientY) => {
    dragRef.current = {
      clientX,
      clientY,
      originX: avatarCropper.offset.x,
      originY: avatarCropper.offset.y
    };
  };

  const createCroppedAvatarFile = async () => {
    const cropper = avatarCropper;
    const renderScale = cropper.baseScale * cropper.zoom;
    const sourceSize = avatarViewportSize / renderScale;
    const sourceX = Math.max(
      0,
      Math.min(
        cropper.naturalWidth - sourceSize,
        (cropper.naturalWidth - sourceSize) / 2 - cropper.offset.x / renderScale
      )
    );
    const sourceY = Math.max(
      0,
      Math.min(
        cropper.naturalHeight - sourceSize,
        (cropper.naturalHeight - sourceSize) / 2 - cropper.offset.y / renderScale
      )
    );

    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = cropper.src;
    });

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const context = canvas.getContext('2d');
    if (!context) return cropper.file;

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, cropper.file?.type || 'image/jpeg', 0.92);
    });

    if (!blob) return cropper.file;

    return new File([blob], cropper.file?.name || 'avatar.jpg', {
      type: blob.type || cropper.file?.type || 'image/jpeg'
    });
  };

  const confirmAvatarCrop = async () => {
    if (!avatarCropper.file) return;
    const croppedFile = await createCroppedAvatarFile();
    await uploadAvatarFile(croppedFile);
    closeAvatarCropper();
  };

  const submit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await api.put('/users/me', {
        name: form.name,
        email: form.email,
        phone: composePhoneNumber(countryCode, localPhone),
        password: form.password,
        addresses: form.addresses.map((item) => ({
          label: item.label,
          governorate: item.governorate,
          city: item.city,
          street: item.street,
          notes: item.notes,
          address: item.street
        }))
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

  return (
    <main className="app-shell home-screen market-home settings-page-shell">
      {avatarCropper.open ? (
        <div className="avatar-crop-overlay" onClick={closeAvatarCropper}>
          <section className="avatar-crop-modal" onClick={(event) => event.stopPropagation()}>
            <div className="avatar-crop-head">
              <div>
                <h2>تحديد إطار الوجه</h2>
                <p>حرّك الصورة وكبّرها حتى يصبح الوجه داخل الإطار بالشكل المناسب.</p>
              </div>
              <button type="button" className="round-action avatar-crop-close" onClick={closeAvatarCropper}>
                <X size={18} />
              </button>
            </div>

            <div
              className="avatar-crop-stage"
              onMouseDown={(event) => startCropDrag(event.clientX, event.clientY)}
              onTouchStart={(event) => {
                const point = event.touches[0];
                if (!point) return;
                startCropDrag(point.clientX, point.clientY);
              }}
            >
              <div className="avatar-crop-frame">
                {avatarCropper.src ? (
                  <img
                    src={avatarCropper.src}
                    alt="معاينة الصورة الجديدة"
                    className="avatar-crop-image"
                    onLoad={handleCropImageLoad}
                    draggable="false"
                    style={{
                      width: `${avatarCropper.naturalWidth * avatarCropper.baseScale * avatarCropper.zoom}px`,
                      height: `${avatarCropper.naturalHeight * avatarCropper.baseScale * avatarCropper.zoom}px`,
                      transform: `translate(calc(-50% + ${avatarCropper.offset.x}px), calc(-50% + ${avatarCropper.offset.y}px))`
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div className="avatar-crop-controls">
              <label className="admin-field">
                <span className="admin-field-label">التكبير</span>
                <input
                  type="range"
                  min="1"
                  max="2.4"
                  step="0.01"
                  value={avatarCropper.zoom}
                  onChange={(event) => updateCropZoom(event.target.value)}
                />
              </label>
            </div>

            <div className="avatar-crop-actions">
              <button type="button" className="secondary-btn" onClick={closeAvatarCropper}>إلغاء</button>
              <button type="button" className="primary-btn" onClick={confirmAvatarCrop} disabled={uploading}>
                {uploading ? 'جارٍ الرفع...' : 'اعتماد الصورة'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="panel-card settings-page-panel">
        <div className="section-head">
          <div>
            <h1>الإعدادات</h1>
            <p>إعدادات الملف الشخصي</p>
          </div>
        </div>

        {loading ? (
          <p className="muted">جاري تحميل الإعدادات...</p>
        ) : (
          <form className="settings-form" onSubmit={submit}>
            <section className="settings-avatar-block">
              <div className="settings-avatar-preview">
                {form.avatar ? (
                  <img src={form.avatar} alt={form.name || 'Avatar'} className="settings-avatar-image" />
                ) : (
                  <span>{(form.name || 'AW').trim().slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="settings-avatar-copy">
                <strong>صورة الملف الشخصي</strong>
                <span>يمكنك رفع صورة جديدة للحساب، وبعد اختيارها سيظهر لك إطار لتحديد الوجه قبل الحفظ.</span>
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
                <PhoneInputField
                  countryCode={countryCode}
                  localNumber={localPhone}
                  onCountryCodeChange={setCountryCode}
                  onLocalNumberChange={setLocalPhone}
                  label=""
                  placeholder="رقم الهاتف"
                />
                <small className="muted">{phoneFormatHelpText}</small>
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
                <button type="button" className="secondary-btn settings-add-address" onClick={() => openAddressEditor()}>
                  <Plus size={16} />
                  <span>إضافة عنوان</span>
                </button>
              </div>

              {addressEditor.open ? (
                <div className="settings-address-editor">
                  <div className="settings-address-toolbar">
                    <strong>{addressEditor.index === null ? 'عنوان جديد' : 'تعديل العنوان'}</strong>
                    <button type="button" className="round-action settings-address-close" onClick={closeAddressEditor}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="settings-grid settings-address-grid">
                    <div className="admin-field">
                      <label className="admin-field-label">اسم العنوان</label>
                      <input
                        value={addressEditor.data.label}
                        onChange={(event) => updateAddressDraft('label', event.target.value)}
                        placeholder="مثال: المنزل أو العمل"
                      />
                    </div>

                    <div className="admin-field">
                      <label className="admin-field-label">المحافظة</label>
                      {availableGovernorates.length ? (
                        <select
                          value={addressEditor.data.governorate}
                          onChange={(event) => updateAddressDraft('governorate', event.target.value)}
                        >
                          <option value="">اختر المحافظة</option>
                          {availableGovernorates.map((governorate) => (
                            <option key={governorate.name} value={governorate.name}>{governorate.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={addressEditor.data.governorate}
                          onChange={(event) => updateAddressDraft('governorate', event.target.value)}
                          placeholder="ادخل اسم المحافظة"
                        />
                      )}
                    </div>

                    <div className="admin-field">
                      <label className="admin-field-label">المدينة</label>
                      {availableCities.length ? (
                        <select
                          value={addressEditor.data.city}
                          onChange={(event) => updateAddressDraft('city', event.target.value)}
                          disabled={!addressEditor.data.governorate}
                        >
                          <option value="">اختر المدينة</option>
                          {availableCities.map((cityName) => (
                            <option key={cityName} value={cityName}>{cityName}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={addressEditor.data.city}
                          onChange={(event) => updateAddressDraft('city', event.target.value)}
                          placeholder="ادخل اسم المدينة"
                        />
                      )}
                    </div>

                    <div className="admin-field">
                      <label className="admin-field-label">العنوان التفصيلي</label>
                      <input
                        value={addressEditor.data.street}
                        onChange={(event) => updateAddressDraft('street', event.target.value)}
                        placeholder="الشارع ورقم العقار والدور"
                      />
                    </div>
                  </div>

                  <div className="admin-field">
                    <label className="admin-field-label">ملاحظات</label>
                    <textarea
                      value={addressEditor.data.notes}
                      onChange={(event) => updateAddressDraft('notes', event.target.value)}
                      placeholder="أي ملاحظات إضافية عن العنوان"
                    />
                  </div>

                  <div className="settings-inline-actions">
                    <button type="button" className="secondary-btn" onClick={closeAddressEditor}>إلغاء</button>
                    <button type="button" className="primary-btn" onClick={saveAddressDraft}>
                      {addressEditor.index === null ? 'حفظ العنوان' : 'تحديث العنوان'}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="settings-addresses-stack">
                {form.addresses.length ? form.addresses.map((item, index) => (
                  <article key={`address-${item._id || index}`} className="settings-address-summary">
                    <div className="settings-address-icon">
                      <MapPin size={18} />
                    </div>
                    <div className="settings-address-copy">
                      <strong>{item.label || `عنوان ${index + 1}`}</strong>
                      <p>{[item.governorate, item.city].filter(Boolean).join(' - ')}</p>
                      <span>{item.street || item.address}</span>
                      {item.notes ? <small>{item.notes}</small> : null}
                    </div>
                    <div className="settings-address-actions">
                      <button type="button" className="table-action-btn edit" onClick={() => openAddressEditor(index)}>
                        <Pencil size={15} />
                        <span>تعديل</span>
                      </button>
                      <button type="button" className="table-action-btn danger" onClick={() => removeAddress(index)}>حذف</button>
                    </div>
                  </article>
                )) : (
                  <div className="settings-address-empty">
                    <MapPin size={20} />
                    <span>لم تضف أي عنوان بعد</span>
                  </div>
                )}
              </div>
            </section>

            <button className="primary-btn settings-save-btn" disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
