import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Button } from '../components/UIComponents';

export default function RoomForm() {
  const { roomNum } = useParams();
  const navigate = useNavigate();
  const { rooms, saveRoom } = useApp();

  const isEdit = Boolean(roomNum);
  const existingRoom = isEdit ? rooms.find((r) => r.n === roomNum) : null;

  const [n, setN] = useState(existingRoom ? existingRoom.n : '');
  const [p, setP] = useState(existingRoom ? existingRoom.p : '');
  const [note, setNote] = useState(existingRoom ? existingRoom.note : '');
  const [err, setErr] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    const cleanNumber = n.trim();
    const cleanPrice = parseInt(String(p).replace(/\D/g, ''), 10) || 0;

    if (!cleanNumber) {
      setErr('Nomor kamar wajib diisi.');
      return;
    }
    if (!cleanPrice) {
      setErr('Harga kamar wajib diisi.');
      return;
    }

    const isDuplicate = rooms.some(
      (r) => r.n === cleanNumber && r.n !== roomNum
    );

    if (isDuplicate) {
      setErr('Nomor kamar sudah dipakai di rumah ini.');
      return;
    }

    saveRoom(roomNum || null, { n: cleanNumber, p: cleanPrice, note });
    navigate('/kamar');
  };

  return (
    <div>
      <Header title={isEdit ? 'Edit Kamar' : 'Tambah Kamar'} />

      <div className="px-[18px]">
        <form onSubmit={handleSave}>
          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Nomor kamar
            </label>
            <input
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              placeholder="Contoh: 06"
              value={n}
              onChange={(e) => setN(e.target.value)}
            />
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Harga kamar / bulan
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              placeholder="Rp 800000"
              value={p}
              onChange={(e) => setP(e.target.value)}
            />
            <p className="text-[13px] text-mute mt-[6px]">
              Perubahan harga tidak mengubah tagihan lama.
            </p>
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Catatan (opsional)
            </label>
            <textarea
              rows={2}
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {err && <div className="text-bad text-[13px] mb-2">{err}</div>}

          <Button type="submit">Simpan Kamar</Button>
        </form>
      </div>
    </div>
  );
}
