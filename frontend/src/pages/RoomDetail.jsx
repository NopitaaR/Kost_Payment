import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, rp, fd, isUUID } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Button, Badge } from '../components/UIComponents';
import { SkeletonLoader, ErrorState } from '../components/StateComponents';
import { getRoom, getRooms, deleteRoom as deleteRoomApi } from '../api/rooms';

export default function RoomDetail() {
  const { roomNum } = useParams();
  const navigate = useNavigate();
  const { activePropertyId, confirmDialog, showToast } = useApp();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchRoomDetail = useCallback(async () => {
    if (!activePropertyId || !roomNum || !isUUID(activePropertyId)) return;
    setLoading(true);
    setError(false);
    setNotFound(false);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomNum);
      let targetRoomId = roomNum;

      if (!isUuid) {
        // Jika parameter di URL adalah roomNumber (misal: '01'), cari UUID-nya terlebih dahulu
        const allRooms = await getRooms(activePropertyId);
        const match = allRooms.find((r) => r.roomNumber === roomNum || r.id === roomNum);
        if (!match) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        targetRoomId = match.id;
      }

      const roomData = await getRoom(activePropertyId, targetRoomId);
      if (!roomData) {
        setNotFound(true);
      } else {
        setRoom(roomData);
      }
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, roomNum]);

  useEffect(() => {
    if (!activePropertyId) {
      navigate('/pilih-rumah', { replace: true });
      return;
    }
    if (isUUID(activePropertyId)) {
      fetchRoomDetail();
    }
  }, [activePropertyId, navigate, fetchRoomDetail]);

  const handleDelete = () => {
    if (!room) return;
    confirmDialog(
      `Hapus Kamar ${room.roomNumber}?`,
      'Kamar yang dihapus tidak dapat dikembalikan. Pastikan kamar tidak memiliki riwayat hunian atau tagihan.',
      'Ya, hapus',
      async () => {
        try {
          await deleteRoomApi(activePropertyId, room.id);
          showToast('Kamar dihapus');
          navigate('/kamar');
        } catch (err) {
          showToast(err.message || 'Gagal menghapus kamar.');
        }
      }
    );
  };

  if (loading) {
    return (
      <div>
        <Header title="Memuat Kamar…" />
        <div className="px-[18px] pt-4">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Kamar" />
        <div className="px-[18px] pt-4">
          <ErrorState onRetry={fetchRoomDetail} />
        </div>
      </div>
    );
  }

  if (notFound || !room) {
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

  const activeTenants = room.activeTenants || [];
  const historyTenants = (room.occupancyHistory || []).filter((h) => h.status !== 'AKTIF');

  return (
    <div>
      <Header title={`Kamar ${room.roomNumber}`} />

      <div className="px-[18px]">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-[30px] font-extrabold tracking-tight text-ink">
              {rp(room.price)}
            </div>
            <div className="text-mute text-[13px]">
              per bulan{room.notes ? ` · ${room.notes}` : ''}
            </div>
          </div>
          <button
            className="border border-line bg-card rounded-[14px] p-[10px_16px] font-bold text-ink text-[14px] cursor-pointer hover:border-brand-dark transition-colors"
            onClick={() => navigate(`/kamar/${room.id}/edit`)}
          >
            Edit
          </button>
        </div>

        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
          Penghuni aktif
        </h2>
        {activeTenants.length > 0 ? (
          activeTenants.map((x) => (
            <Card key={x.occupancyId || x.id} onClick={() => navigate(`/penghuni/${x.tenantId || x.id}`)}>
              <div className="flex justify-between items-center">
                <div className="flex gap-[10px] items-center">
                  <div className="w-[40px] h-[40px] rounded-full bg-brand-soft text-brand-dark grid place-items-center font-extrabold flex-shrink-0">
                    {(x.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-ink">{(x.name || '').split(' ')[0]}</div>
                    <div className="text-[13px] text-mute">
                      {x.startDate ? `Masuk ${fd(x.startDate)}` : 'Aktif'}
                    </div>
                  </div>
                </div>
                <div className="text-mute">→</div>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-mute text-sm mb-2">Belum ada penghuni.</p>
        )}

        <Button onClick={() => navigate('/penghuni/tambah', { state: { roomId: room.id, roomNumber: room.roomNumber, roomPrice: room.price } })}>
          + Tambah Penghuni
        </Button>

        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
          Riwayat penghuni
        </h2>
        {historyTenants.length > 0 ? (
          historyTenants.map((x) => (
            <Card key={x.id} flat>
              <div className="flex justify-between items-center">
                <div className="font-bold text-ink">{x.tenant?.name || 'Penghuni'}</div>
                <Badge status={x.status === 'KELUAR' ? 'Keluar' : x.status} />
              </div>
              <div className="text-[13px] text-mute mt-1">
                {fd(x.startDate)} – {x.endDate ? fd(x.endDate) : '—'}
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
