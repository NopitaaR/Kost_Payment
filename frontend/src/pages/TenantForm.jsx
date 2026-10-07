import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp, rp, isUUID } from '../context/AppContext';
import Header from '../components/Header';
import { Button } from '../components/UIComponents';
import { getRooms } from '../api/rooms';
import { createTenant, uploadKtp } from '../api/tenants';

export default function TenantForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePropertyId, showToast } = useApp();

  const passedRoomId = location.state?.roomId;
  const passedRoomNumber = location.state?.roomNumber || location.state?.room;
  const passedRoomPrice = location.state?.roomPrice || location.state?.price;

  const [step, setStep] = useState(1);
  const [roomInfo, setRoomInfo] = useState(
    passedRoomId ? { id: passedRoomId, roomNumber: passedRoomNumber, price: passedRoomPrice } : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [ktpError, setKtpError] = useState('');

  const [draft, setDraft] = useState({
    name: '',
    hp: '',
    addr: '',
    job: '',
    in: new Date().toISOString().split('T')[0],
    roomId: passedRoomId || '',
    ktp: '',
    ktpDisplayName: '',
  });

  const [err, setErr] = useState('');

  useEffect(() => {
    if (!activePropertyId) {
      navigate('/pilih-rumah', { replace: true });
      return;
    }

    if (!isUUID(activePropertyId)) return;

    if (!passedRoomId) {
      return;
    }

    // Ambil info kamar jika nomor atau harga belum ada di state
    if (!roomInfo?.roomNumber || !roomInfo?.price) {
      (async () => {
        try {
          const fetchedRooms = await getRooms(activePropertyId);
          const match = fetchedRooms.find((r) => r.id === passedRoomId);
          if (match) {
            setRoomInfo({ id: match.id, roomNumber: match.roomNumber, price: match.price });
          }
        } catch (_) {}
      })();
    }
  }, [activePropertyId, passedRoomId, navigate]);

  if (!passedRoomId) {
    return (
      <div>
        <Header title="Tambah Penghuni" />
        <div className="px-[18px] text-center py-10">
          <p className="text-mute mb-4">
            Penghuni hanya dapat ditambahkan melalui Detail Kamar. Silakan pilih kamar terlebih dahulu.
          </p>
          <Button onClick={() => navigate('/kamar')}>Pilih Kamar</Button>
        </div>
      </div>
    );
  }

  const handleNext1 = () => {
    if (!draft.name.trim()) {
      setErr('Nama wajib diisi.');
      return;
    }
    if (!draft.hp.trim()) {
      setErr('Nomor HP wajib diisi.');
      return;
    }
    if (!draft.addr.trim()) {
      setErr('Alamat asal wajib diisi.');
      return;
    }
    if (!draft.job.trim()) {
      setErr('Pekerjaan wajib diisi.');
      return;
    }

    setErr('');
    setStep(2);
  };

  const handleKtpChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setKtpError('Format file tidak didukung. Gunakan JPG, JPEG, atau PNG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setKtpError('Ukuran file melebihi batas maksimal 5MB.');
      return;
    }

    setUploadingKtp(true);
    setKtpError('');
    try {
      const res = await uploadKtp(activePropertyId, file);
      setDraft((prev) => ({
        ...prev,
        ktp: res.filename,
        ktpDisplayName: file.name,
      }));
      showToast('Foto KTP berhasil diunggah');
    } catch (uploadError) {
      setKtpError(uploadError.message || 'Gagal mengunggah foto KTP.');
    } finally {
      setUploadingKtp(false);
    }
  };

  const handleSave = async () => {
    if (!passedRoomId) {
      setErr('Kamar wajib dipilih melalui Detail Kamar.');
      return;
    }
    if (!draft.in) {
      setErr('Tanggal masuk wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErr('');

    try {
      await createTenant(activePropertyId, {
        name: draft.name.trim(),
        phone: draft.hp.trim(),
        originAddress: draft.addr.trim(),
        occupation: draft.job.trim(),
        moveInDate: draft.in,
        roomId: passedRoomId,
        ktpPhoto: draft.ktp || null,
      });

      showToast('Penghuni disimpan');
      navigate(`/kamar/${passedRoomId}`);
    } catch (error) {
      setErr(error.message || 'Gagal menyimpan penghuni.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header title="Tambah Penghuni" />

      <div className="px-[18px]">
        <div className="flex gap-[6px] mt-[6px] mb-[4px]">
          <i className="flex-1 h-[4px] rounded-[4px] bg-brand not-italic"></i>
          <i className={`flex-1 h-[4px] rounded-[4px] not-italic ${step > 1 ? 'bg-brand' : 'bg-line'}`}></i>
        </div>
        <p className="text-[13px] text-mute my-1">
          Langkah {step} dari 2 · {step > 1 ? 'Hunian' : 'Data diri'}
        </p>

        {step === 1 ? (
          <div>
            <label className={`block border-2 dashed rounded-[16px] p-[26px] text-center font-semibold cursor-pointer mb-[6px] ${draft.ktp ? 'border-ok text-ok border-solid' : 'border-line text-mute'}`}>
              {uploadingKtp
                ? '⏳ Mengunggah foto KTP...'
                : (draft.ktp ? `✓ ${draft.ktpDisplayName || draft.ktp}` : '📷 Tambah foto KTP (opsional)')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                disabled={uploadingKtp}
                onChange={handleKtpChange}
              />
            </label>
            {ktpError && <div className="text-bad text-[13px] mb-[12px]">{ktpError}</div>}
            {!ktpError && <div className="mb-[14px]"></div>}

            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                Nama lengkap
              </label>
              <input
                className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>

            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                Nomor HP
              </label>
              <input
                inputMode="tel"
                className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
                value={draft.hp}
                onChange={(e) => setDraft({ ...draft, hp: e.target.value })}
              />
            </div>

            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                Alamat asal
              </label>
              <input
                className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
                value={draft.addr}
                onChange={(e) => setDraft({ ...draft, addr: e.target.value })}
              />
            </div>

            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                Pekerjaan
              </label>
              <input
                className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
                value={draft.job}
                onChange={(e) => setDraft({ ...draft, job: e.target.value })}
              />
            </div>

            {err && <div className="text-bad text-[13px] mb-2">{err}</div>}

            <Button onClick={handleNext1}>Lanjut</Button>
          </div>
        ) : (
          <div>
            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px] text-mute">
                Kamar
              </label>
              <div className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] font-bold text-ink">
                Kamar {roomInfo?.roomNumber || '—'} {roomInfo?.price ? `— ${rp(roomInfo.price)}` : ''}
              </div>
            </div>

            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                Tanggal masuk
              </label>
              <input
                type="date"
                className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
                value={draft.in}
                onChange={(e) => setDraft({ ...draft, in: e.target.value })}
              />
            </div>

            {err && <div className="text-bad text-[13px] mb-2">{err}</div>}

            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? 'Menyimpan…' : 'Simpan Penghuni'}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
              Kembali
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
