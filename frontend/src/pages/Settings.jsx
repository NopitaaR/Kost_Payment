import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Button } from '../components/UIComponents';

export default function Settings() {
  const navigate = useNavigate();
  const { owner, houses, openSheet, closeSheet, confirmDialog, logout } = useApp();

  const handleInstallApp = () => {
    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px] text-ink">Install aplikasi</h3>
        <p className="text-mute text-[13px] mb-4">
          Pasang Kost Manager di layar utama supaya terbuka seperti aplikasi biasa.
        </p>

        <Card flat className="mb-2">
          <div className="font-bold text-ink">Android (Chrome)</div>
          <div className="text-[13px] text-mute">
            Ketuk menu ⋮ → Install aplikasi atau Tambahkan ke Layar Utama.
          </div>
        </Card>

        <Card flat className="mb-4">
          <div className="font-bold text-ink">iPhone (Safari)</div>
          <div className="text-[13px] text-mute">
            Ketuk tombol Bagikan → Tambah ke Layar Utama.
          </div>
        </Card>

        <Button onClick={closeSheet}>Mengerti</Button>
      </div>
    );
  };

  const handleLogout = () => {
    confirmDialog(
      'Keluar dari aplikasi?',
      'Kamu perlu login lagi untuk membuka data kost.',
      'Ya, keluar',
      () => {
        logout();
        navigate('/login');
      }
    );
  };

  return (
    <div>
      <Header title="Pengaturan" />

      <div className="px-[18px]">
        {/* Grup Akun */}
        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">Akun</h2>
        <Card onClick={() => navigate('/pengaturan/profil')}>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold text-ink">Profil pemilik</div>
              <div className="text-[13px] text-mute">{owner.name}</div>
            </div>
            <div className="text-mute">→</div>
          </div>
        </Card>

        {/* Grup Rumah */}
        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">Rumah</h2>
        {houses.map((h, i) => (
          <Card key={i} onClick={() => navigate(`/pengaturan/rumah/${i}`)}>
            <div className="flex justify-between items-center">
              <div className="font-bold text-ink">{h.n}</div>
              <div className="text-mute">→</div>
            </div>
          </Card>
        ))}

        {/* Grup Keamanan */}
        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">Keamanan</h2>
        <Card onClick={() => navigate('/pengaturan/password')}>
          <div className="flex justify-between items-center">
            <div className="font-bold text-ink">Ubah password</div>
            <div className="text-mute">→</div>
          </div>
        </Card>

        {/* Grup Aplikasi */}
        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">Aplikasi</h2>
        <Card onClick={handleInstallApp}>
          <div className="flex justify-between items-center">
            <div className="font-bold text-ink">Install aplikasi</div>
            <div className="text-mute">→</div>
          </div>
        </Card>

        {/* Tombol Keluar */}
        <Button
          variant="ghost"
          className="!text-bad border-line mt-6"
          onClick={handleLogout}
        >
          Keluar
        </Button>
      </div>
    </div>
  );
}
