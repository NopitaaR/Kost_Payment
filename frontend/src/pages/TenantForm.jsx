import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp, rp } from '../context/AppContext';
import Header from '../components/Header';
import { Button } from '../components/UIComponents';

export default function TenantForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { rooms, addTenant } = useApp();

  const preselectedRoom = location.state?.room || (rooms[0] ? rooms[0].n : '01');

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({
    name: '',
    hp: '',
    addr: '',
    job: '',
    in: '2026-10-04',
    room: preselectedRoom,
    ktp: '',
  });

  const [err, setErr] = useState('');

  const handleNext1 = () => {
    if (!draft.ktp) {
      setErr('Foto KTP wajib diunggah.');
      return;
    }
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

  const handleSave = () => {
    addTenant(draft);
    navigate('/penghuni');
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
            <label className={`block border-2 dashed rounded-[16px] p-[26px] text-center font-semibold cursor-pointer mb-[14px] ${draft.ktp ? 'border-ok text-ok border-solid' : 'border-line text-mute'}`}>
              {draft.ktp ? `✓ ${draft.ktp}` : '📷 Tambah foto KTP'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const filename = e.target.files[0]?.name || 'ktp-upload.jpg';
                  setDraft((prev) => ({ ...prev, ktp: filename }));
                }}
              />
            </label>

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

            <div className="mb-[14px]">
              <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                Pilih kamar
              </label>
              <select
                className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
                value={draft.room}
                onChange={(e) => setDraft({ ...draft, room: e.target.value })}
              >
                {rooms.map((r) => (
                  <option key={r.n} value={r.n}>
                    Kamar {r.n} — {rp(r.p)}
                  </option>
                ))}
              </select>
              <p className="text-[13px] text-mute mt-[6px]">
                Jika kamar sudah berpenghuni, tagihan tetap satu untuk kamar.
              </p>
            </div>

            <Button onClick={handleSave}>Simpan Penghuni</Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Kembali
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
