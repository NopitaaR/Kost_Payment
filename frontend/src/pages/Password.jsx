import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Button } from '../components/UIComponents';

export default function Password() {
  const navigate = useNavigate();
  const { showToast, changePassword } = useApp();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();

    if (!oldPassword) {
      setErr('Masukkan password lama.');
      return;
    }
    if (newPassword.length < 8) {
      setErr('Password baru minimal 8 karakter.');
      return;
    }
    if (newPassword === oldPassword) {
      setErr('Password baru harus berbeda dari password lama.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('Ulangi password baru dengan sama persis.');
      return;
    }

    setErr('');
    try {
      await changePassword(oldPassword, newPassword);
      showToast('Password berhasil diubah');
      navigate(-1);
    } catch (err) {
      setErr('Gagal mengganti password: ' + (err.message || ''));
    }
  };

  return (
    <div>
      <Header title="Ubah Password" />

      <div className="px-[18px]">
        <form onSubmit={handleSave}>
          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Password lama
            </label>
            <input
              type="password"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Password baru
            </label>
            <input
              type="password"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-[13px] text-mute mt-[6px]">Minimal 8 karakter.</p>
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Ulangi password baru
            </label>
            <input
              type="password"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {err && <div className="text-bad text-[13px] mb-2">{err}</div>}

          <Button type="submit">Simpan Password</Button>
        </form>
      </div>
    </div>
  );
}
