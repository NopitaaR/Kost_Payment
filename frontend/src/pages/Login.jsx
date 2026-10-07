import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, authLoading, authError, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) navigate('/pilih-rumah');
  };

  return (
    <div className="px-[18px] pt-[12vh]">
      <div className="w-[48px] h-[48px] rounded-[14px] bg-brand-soft text-brand-dark grid place-items-center text-[24px]">
        🏠
      </div>
      <h1 className="text-[30px] font-extrabold mt-[14px] mb-[4px] tracking-tight text-ink">
        Kost Manager
      </h1>
      <p className="text-mute mb-[20px]">Kelola kost dengan lebih mudah.</p>

      <form onSubmit={handleLogin}>
        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Email / Username
          </label>
          <input
            type="text"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Password
          </label>
          <input
            type="password"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {authError && (
            <p className="text-bad text-[13px] mt-[6px]">{authError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="block w-full border-0 rounded-[14px] p-[14px] font-bold bg-brand text-on-brand cursor-pointer mt-[10px] text-center text-[15px] disabled:opacity-60"
        >
          {authLoading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <p className="text-center mt-[14px]">
        <button
          type="button"
          className="text-mute text-sm bg-transparent border-0 cursor-pointer"
          onClick={() => showToast('Hubungi admin untuk reset password')}
        >
          Lupa password
        </button>
      </p>
    </div>
  );
}
