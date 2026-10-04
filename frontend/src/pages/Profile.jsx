import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Avatar, Button } from '../components/UIComponents';

export default function Profile() {
  const navigate = useNavigate();
  const { owner, updateOwner } = useApp();

  const [name, setName] = useState(owner.name || '');
  const [email, setEmail] = useState(owner.email || '');
  const [hp, setHp] = useState(owner.hp || '');
  const [err, setErr] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanHp = hp.trim();

    if (!cleanName) {
      setErr('Nama wajib diisi.');
      return;
    }
    if (!cleanEmail) {
      setErr('Email / username wajib diisi.');
      return;
    }

    setErr('');
    updateOwner({ name: cleanName, email: cleanEmail, hp: cleanHp });
    navigate(-1);
  };

  return (
    <div>
      <Header title="Profil Pemilik" />

      <div className="px-[18px] text-center mb-4">
        <Avatar name={name || 'Pemilik'} size="lg" />
      </div>

      <div className="px-[18px]">
        <form onSubmit={handleSave}>
          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Nama
            </label>
            <input
              type="text"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Email / Username
            </label>
            <input
              type="text"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Nomor HP (opsional)
            </label>
            <input
              type="text"
              inputMode="tel"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
          </div>

          {err && <div className="text-bad text-[13px] mb-2">{err}</div>}

          <Button type="submit">Simpan Profil</Button>
        </form>
      </div>
    </div>
  );
}
