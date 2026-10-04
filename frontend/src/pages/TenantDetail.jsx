import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, fd, rp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Badge, Avatar, Button } from '../components/UIComponents';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    tenants,
    rooms,
    openSheet,
    closeSheet,
    confirmDialog,
    moveTenant,
    exitTenant,
  } = useApp();

  const tenantId = Number(id);
  const tenant = tenants.find((t) => t.id === tenantId);

  if (!tenant) {
    return (
      <div>
        <Header title="Penghuni Tidak Ditemukan" />
        <div className="px-[18px] text-center py-10">
          <p className="text-mute">Data penghuni tidak ditemukan.</p>
          <Button onClick={() => navigate('/penghuni')}>Kembali ke Daftar Penghuni</Button>
        </div>
      </div>
    );
  }

  const room = rooms.find((r) => r.n === tenant.room) || { p: 0 };

  const handleShowKtp = () => {
    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Foto KTP</h3>
        <div className="border-2 dashed border-line rounded-[16px] p-[60px] text-center text-mute font-semibold">
          🪪 Pratinjau KTP
          <br />
          <span className="text-[13px] text-mute font-normal">
            Hanya terlihat oleh pemilik ({tenant.ktp || 'File KTP'})
          </span>
        </div>
        <Button className="mt-[14px]" onClick={closeSheet}>
          Tutup
        </Button>
      </div>
    );
  };

  const handleMoveSheet = () => {
    const availableRooms = rooms.filter((r) => r.n !== tenant.room);
    let selectedRoom = availableRooms[0]?.n || '';
    let moveDate = '2026-10-10';

    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Pindah Kamar</h3>
        <p className="text-mute text-[13px] mb-3">
          {tenant.name.split(' ')[0]} · Kamar saat ini: {tenant.room}
        </p>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Kamar baru
          </label>
          <select
            id="mr"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={selectedRoom}
            onChange={(e) => {
              selectedRoom = e.target.value;
            }}
          >
            {availableRooms.map((r) => (
              <option key={r.n} value={r.n}>
                Kamar {r.n} — {rp(r.p)}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Tanggal pindah
          </label>
          <input
            id="md"
            type="date"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={moveDate}
          />
        </div>

        <Button
          onClick={() => {
            const finalRoom = document.getElementById('mr')?.value || selectedRoom;
            closeSheet();
            confirmDialog(
              `Pindahkan ${tenant.name.split(' ')[0]}?`,
              `Kamar ${tenant.room} → Kamar ${finalRoom}<br><br>Tagihan berikutnya akan mengikuti harga Kamar ${finalRoom}. Tagihan lama tidak berubah.`,
              'Ya, pindahkan',
              () => moveTenant(tenant.id, finalRoom),
              'brand'
            );
          }}
        >
          Pindahkan
        </Button>
        <Button variant="ghost" onClick={closeSheet}>
          Batal
        </Button>
      </div>
    );
  };

  const handleExitSheet = () => {
    let exitDate = '2026-10-04';

    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Penghuni Keluar</h3>
        <p className="text-mute text-[13px] mb-3">
          {tenant.name.split(' ')[0]} · Kamar {tenant.room}
        </p>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Tanggal keluar
          </label>
          <input
            id="xd"
            type="date"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={exitDate}
          />
        </div>

        <p className="text-mute text-[13px] mb-4">
          Apakah penghuni ini benar-benar sudah keluar? Data tidak dihapus dan tetap ada di riwayat.
        </p>

        <div className="flex gap-[10px]">
          <Button variant="ghost" onClick={closeSheet}>
            Batal
          </Button>
          <Button
            variant="bad"
            onClick={() => {
              const finalDate = document.getElementById('xd')?.value || exitDate;
              closeSheet();
              exitTenant(tenant.id, finalDate);
            }}
          >
            Ya, penghuni keluar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <Header title="Detail Penghuni" />

      <div className="px-[18px] text-center">
        <Avatar name={tenant.name} size="lg" />
        <div className="font-bold text-[20px] text-ink">{tenant.name}</div>
        <div className="text-mute">Kamar {tenant.room}</div>
        <div className="mt-[6px]">
          <Badge status={tenant.st} />
        </div>
      </div>

      <div className="px-[18px] mt-[14px]">
        <h2 className="text-[13px] font-bold text-mute mb-[8px]">Informasi</h2>
        <Card flat className="space-y-0 divide-y divide-line">
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">No. HP</span>
            <span className="font-semibold text-ink">{tenant.hp}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Alamat asal</span>
            <span className="font-semibold text-ink">{tenant.addr}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Pekerjaan</span>
            <span className="font-semibold text-ink">{tenant.job}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Tanggal masuk</span>
            <span className="font-semibold text-ink">{fd(tenant.in)}</span>
          </div>
          {tenant.out && (
            <div className="flex justify-between py-[10px]">
              <span className="text-mute">Tanggal keluar</span>
              <span className="font-semibold text-ink">{fd(tenant.out)}</span>
            </div>
          )}
        </Card>

        <Button variant="ghost" onClick={handleShowKtp}>
          Lihat Foto KTP
        </Button>

        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">Kamar</h2>
        <Card flat onClick={() => navigate(`/kamar/${tenant.room}`)}>
          <div className="font-bold text-ink">Kamar {tenant.room}</div>
          <div className="text-mute text-[13px]">{rp(room.p)} / bulan</div>
        </Card>

        {tenant.st === 'Aktif' && (
          <div className="space-y-[10px] mt-4">
            <Button variant="ghost" onClick={handleMoveSheet}>
              Pindah Kamar
            </Button>
            <Button variant="bad" onClick={handleExitSheet}>
              Penghuni Keluar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
