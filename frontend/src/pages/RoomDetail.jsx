import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, rp, fd } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Button, Badge } from '../components/UIComponents';

export default function RoomDetail() {
  const { roomNum } = useParams();
  const navigate = useNavigate();
  const { rooms, tenants, deleteRoom, getActiveTenantsByRoom } = useApp();

  const room = rooms.find((r) => r.n === roomNum);

  if (!room) {
    return (
      <div>
        <Header title="Kamar Tidak Ditemukan" />
        <div className="px-[18px] text-center py-10">
          <p className="text-mute">Kamar dengan nomor ini tidak ada.</p>
          <Button onClick={() => navigate('/kamar')}>Kembali ke Daftar Kamar</Button>
        </div>
      </div>
    );
  }

  const activeTenants = getActiveTenantsByRoom(roomNum);
  const historyTenants = tenants.filter((t) => t.room === roomNum && t.st === 'Keluar');

  const handleDelete = () => {
    const success = deleteRoom(roomNum);
    if (success) {
      navigate('/kamar');
    }
  };

  return (
    <div>
      <Header title={`Kamar ${roomNum}`} />

      <div className="px-[18px]">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-[30px] font-extrabold tracking-tight text-ink">
              {rp(room.p)}
            </div>
            <div className="text-mute text-[13px]">
              per bulan{room.note ? ` · ${room.note}` : ''}
            </div>
          </div>
          <button
            className="border border-line bg-card rounded-[14px] p-[10px_16px] font-bold text-ink text-[14px] cursor-pointer"
            onClick={() => navigate(`/kamar/${roomNum}/edit`)}
          >
            Edit
          </button>
        </div>

        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
          Penghuni aktif
        </h2>
        {activeTenants.length > 0 ? (
          activeTenants.map((x) => (
            <Card key={x.id} onClick={() => navigate(`/penghuni/${x.id}`)}>
              <div className="flex justify-between items-center">
                <div className="flex gap-[10px] items-center">
                  <div className="w-[40px] h-[40px] rounded-full bg-brand-soft text-brand-dark grid place-items-center font-extrabold flex-shrink-0">
                    {x.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-ink">{x.name.split(' ')[0]}</div>
                    <div className="text-[13px] text-mute">Masuk {fd(x.in)}</div>
                  </div>
                </div>
                <div className="text-mute">→</div>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-mute text-sm mb-2">Belum ada penghuni.</p>
        )}

        <Button onClick={() => navigate('/penghuni/tambah', { state: { room: roomNum } })}>
          + Tambah Penghuni
        </Button>

        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
          Riwayat penghuni
        </h2>
        {historyTenants.length > 0 ? (
          historyTenants.map((x) => (
            <Card key={x.id} flat>
              <div className="flex justify-between items-center">
                <div className="font-bold text-ink">{x.name}</div>
                <Badge status="Keluar" />
              </div>
              <div className="text-[13px] text-mute mt-1">
                {fd(x.in)} – {fd(x.out)}
              </div>
            </Card>
          ))
        ) : (
          <p className="text-mute text-sm mb-4">Belum ada riwayat.</p>
        )}

        <Button variant="ghost" className="!text-bad border-line" onClick={handleDelete}>
          Hapus kamar
        </Button>
      </div>
    </div>
  );
}
