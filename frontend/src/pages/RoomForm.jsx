import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, isUUID, formatRupiah, parseRupiah } from '../context/AppContext';
import Header from '../components/Header';
import { Button } from '../components/UIComponents';
import { SkeletonLoader } from '../components/StateComponents';
import { getRoom, getRooms, createRoom, updateRoom } from '../api/rooms';

export default function RoomForm() {
  const { roomNum } = useParams();
  const navigate = useNavigate();
  const { activePropertyId, showToast } = useApp();

  const isEdit = Boolean(roomNum);

  const [roomId, setRoomId] = useState(null);
  const [n, setN] = useState('');
  const [p, setP] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  useEffect(() => {
    if (!activePropertyId) {
      navigate('/pilih-rumah', { replace: true });
      return;
    }

    if (!isUUID(activePropertyId)) return;

    if (isEdit && roomNum) {
      (async () => {
        setLoadingEdit(true);
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomNum);
          let targetId = roomNum;

          if (!isUuid) {
            const allRooms = await getRooms(activePropertyId);
            const match = allRooms.find((r) => r.roomNumber === roomNum || r.id === roomNum);
            if (!match) {
              setErr('Kamar tidak ditemukan.');
              setLoadingEdit(false);
              return;
            }
            targetId = match.id;
          }

          setRoomId(targetId);
          const data = await getRoom(activePropertyId, targetId);
          if (data) {
            setN(data.roomNumber || '');
            setP(formatRupiah(data.price));
            setNote(data.notes || '');
          }
        } catch (error) {
          setErr(error.message || 'Gagal memuat data kamar.');
        } finally {
          setLoadingEdit(false);
        }
      })();
    }
  }, [activePropertyId, isEdit, roomNum, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErr('');

    const cleanNumber = n.trim();
    const cleanPrice = parseRupiah(p);

    if (!cleanNumber) {
      setErr('Nomor kamar wajib diisi.');
      return;
    }
    if (!cleanPrice) {
      setErr('Harga kamar wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateRoom(activePropertyId, roomId || roomNum, {
          roomNumber: cleanNumber,
          price: cleanPrice,
          notes: note,
        });
      } else {
        await createRoom(activePropertyId, {
          roomNumber: cleanNumber,
          price: cleanPrice,
          notes: note,
        });
      }

      showToast('Kamar disimpan');
      navigate('/kamar');
    } catch (error) {
      setErr(error.message || 'Gagal menyimpan kamar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header title={isEdit ? 'Edit Kamar' : 'Tambah Kamar'} />

      <div className="px-[18px]">
        {loadingEdit ? (
          <div className="pt-4">
            <SkeletonLoader />
          </div>
        ) : (
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
                placeholder="Rp0"
                value={p}
                onChange={(e) => setP(formatRupiah(e.target.value))}
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

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Menyimpan…' : 'Simpan Kamar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
