import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Button } from '../components/UIComponents';

export default function HouseSettings() {
  const { index } = useParams();
  const navigate = useNavigate();
  const { houses, updateHouseName, showToast } = useApp();

  const houseIndex = parseInt(index, 10);
  const house = houses[houseIndex];

  if (!house) {
    return (
      <div>
        <Header title="Rumah Tidak Ditemukan" />
        <div className="px-[18px] text-center py-10">
          <p className="text-mute">Data rumah tidak ditemukan.</p>
          <Button onClick={() => navigate('/pengaturan')}>Kembali ke Pengaturan</Button>
        </div>
      </div>
    );
  }

  // Gunakan propertyId dari backend sebagai identitas utama
  const propertyId = house._id || house.id;

  // Statistics for this house - ambil dari data property
  const totalRooms = house._totalRooms !== undefined ? house._totalRooms : house.k || 0;
  const filledRooms = house._filledRooms !== undefined ? house._filledRooms : house.t || 0;
  const emptyRooms = house._emptyRooms !== undefined ? house._emptyRooms : totalRooms - filledRooms;

  const [houseName, setHouseName] = useState(house.n || house.name || '');
  const [err, setErr] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanName = houseName.trim();

    if (!cleanName) {
      setErr('Nama rumah wajib diisi.');
      return;
    }

    try {
      // Kirim ke backend menggunakan propertyId
      await updateHouseName(propertyId, cleanName);
      setHouseName(cleanName);
      if (showToast) showToast('Nama rumah disimpan');
      navigate(-1);
    } catch (err) {
      setErr('Gagal memperbarui nama rumah: ' + (err.message || ''));
    }
  };

  return (
    <div>
      <Header title={`Pengaturan ${house.n || ''}`} />

      <div className="px-[18px]">
        <form onSubmit={handleSave}>
          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Nama rumah
            </label>
            <input
              type="text"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
            />
          </div>

          {err && <div className="text-bad text-[13px] mb-2">{err}</div>}

          <Card flat className="mt-[14px] space-y-0 divide-y divide-line">
            <div className="flex justify-between py-[10px]">
              <span className="text-mute">Jumlah kamar</span>
              <span className="font-semibold text-ink">{totalRooms}</span>
            </div>
            <div className="flex justify-between py-[10px]">
              <span className="text-mute">Terisi</span>
              <span className="font-semibold text-ink">{filledRooms}</span>
            </div>
            <div className="flex justify-between py-[10px]">
              <span className="text-mute">Kosong</span>
              <span className="font-semibold text-ink">{emptyRooms}</span>
            </div>
          </Card>

          <Button type="submit" className="mt-4">
            Simpan
          </Button>
        </form>
      </div>
    </div>
  );
}
