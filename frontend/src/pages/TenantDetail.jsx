import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, fd, rp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Badge, Avatar, Button } from '../components/UIComponents';
import { SkeletonLoader, ErrorState } from '../components/StateComponents';
import { getRooms } from '../api/rooms';
import { getTenant, updateTenant, moveTenant as moveTenantApi, exitTenant as exitTenantApi } from '../api/tenants';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    activePropertyId,
    openSheet,
    closeSheet,
    confirmDialog,
    showToast,
  } = useApp();

  const [tenant, setTenant] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchTenantDetail = useCallback(async () => {
    if (!activePropertyId || !id) return;
    setLoading(true);
    setError(false);
    setNotFound(false);

    try {
      const [tenantData, roomsData] = await Promise.all([
        getTenant(activePropertyId, id),
        getRooms(activePropertyId).catch(() => []),
      ]);

      if (!tenantData) {
        setNotFound(true);
      } else {
        setTenant(tenantData);
        setRooms(roomsData);
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
  }, [activePropertyId, id]);

  useEffect(() => {
    if (!activePropertyId) {
      navigate('/pilih-rumah', { replace: true });
      return;
    }
    fetchTenantDetail();
  }, [activePropertyId, navigate, fetchTenantDetail]);

  const handleShowKtp = () => {
    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Foto KTP</h3>
        <div className="border-2 dashed border-line rounded-[16px] p-[50px_20px] text-center text-mute font-semibold">
          🪪 Pratinjau KTP
          <br />
          <span className="text-[13px] text-mute font-normal block mt-2">
            {tenant?.ktpPhoto
              ? `Nama berkas: ${tenant.ktpPhoto}`
              : 'Foto KTP belum diunggah.'}
          </span>
        </div>
        <Button className="mt-[14px]" onClick={closeSheet}>
          Tutup
        </Button>
      </div>
    );
  };

  const handleEditSheet = () => {
    let editName = tenant.name;
    let editPhone = tenant.phone;
    let editAddr = tenant.originAddress;
    let editJob = tenant.occupation;

    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[10px]">Edit Data Penghuni</h3>
        
        <div className="mb-[12px]">
          <label className="block text-[13px] font-semibold mb-[4px] text-ink">Nama lengkap</label>
          <input
            id="et-name"
            defaultValue={editName}
            className="w-full border border-line bg-card rounded-[12px] p-[10px_14px] outline-none"
          />
        </div>

        <div className="mb-[12px]">
          <label className="block text-[13px] font-semibold mb-[4px] text-ink">Nomor HP</label>
          <input
            id="et-phone"
            defaultValue={editPhone}
            className="w-full border border-line bg-card rounded-[12px] p-[10px_14px] outline-none"
          />
        </div>

        <div className="mb-[12px]">
          <label className="block text-[13px] font-semibold mb-[4px] text-ink">Alamat asal</label>
          <input
            id="et-addr"
            defaultValue={editAddr}
            className="w-full border border-line bg-card rounded-[12px] p-[10px_14px] outline-none"
          />
        </div>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[4px] text-ink">Pekerjaan</label>
          <input
            id="et-job"
            defaultValue={editJob}
            className="w-full border border-line bg-card rounded-[12px] p-[10px_14px] outline-none"
          />
        </div>

        <Button
          onClick={async () => {
            const finalName = document.getElementById('et-name')?.value || editName;
            const finalPhone = document.getElementById('et-phone')?.value || editPhone;
            const finalAddr = document.getElementById('et-addr')?.value || editAddr;
            const finalJob = document.getElementById('et-job')?.value || editJob;

            closeSheet();
            try {
              await updateTenant(activePropertyId, tenant.id, {
                name: finalName.trim(),
                phone: finalPhone.trim(),
                originAddress: finalAddr.trim(),
                occupation: finalJob.trim(),
              });
              showToast('Data penghuni diperbarui');
              fetchTenantDetail();
            } catch (err) {
              showToast(err.message || 'Gagal memperbarui data penghuni.');
            }
          }}
        >
          Simpan Perubahan
        </Button>
        <Button variant="ghost" onClick={closeSheet}>
          Batal
        </Button>
      </div>
    );
  };

  const handleMoveSheet = () => {
    const currentRoomId = tenant.currentRoom?.id;
    const availableRooms = rooms.filter((r) => r.id !== currentRoomId);
    let selectedRoomId = availableRooms[0]?.id || '';
    let moveDate = new Date().toISOString().split('T')[0];

    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Pindah Kamar</h3>
        <p className="text-mute text-[13px] mb-3">
          {tenant.name.split(' ')[0]} · Kamar saat ini: {tenant.currentRoom?.roomNumber || '—'}
        </p>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Kamar baru
          </label>
          <select
            id="mr"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={selectedRoomId}
            onChange={(e) => {
              selectedRoomId = e.target.value;
            }}
          >
            {availableRooms.map((r) => (
              <option key={r.id} value={r.id}>
                Kamar {r.roomNumber} — {rp(r.price)}
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
            const finalRoomId = document.getElementById('mr')?.value || selectedRoomId;
            const finalDate = document.getElementById('md')?.value || moveDate;
            const targetRoomObj = rooms.find((r) => r.id === finalRoomId);
            const targetRoomNumber = targetRoomObj ? targetRoomObj.roomNumber : '';

            closeSheet();
            confirmDialog(
              `Pindahkan ${tenant.name.split(' ')[0]}?`,
              `Kamar ${tenant.currentRoom?.roomNumber || '—'} → Kamar ${targetRoomNumber}<br><br>Tagihan berikutnya akan mengikuti harga Kamar ${targetRoomNumber}. Tagihan lama tidak berubah.`,
              'Ya, pindahkan',
              async () => {
                try {
                  await moveTenantApi(activePropertyId, tenant.id, {
                    newRoomId: finalRoomId,
                    moveDate: finalDate,
                  });
                  showToast('Penghuni berhasil dipindahkan');
                  fetchTenantDetail();
                } catch (err) {
                  showToast(err.message || 'Gagal memindahkan penghuni.');
                }
              },
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
    let exitDate = new Date().toISOString().split('T')[0];

    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Penghuni Keluar</h3>
        <p className="text-mute text-[13px] mb-3">
          {tenant.name.split(' ')[0]} · Kamar {tenant.currentRoom?.roomNumber || '—'}
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
            onClick={async () => {
              const finalDate = document.getElementById('xd')?.value || exitDate;
              closeSheet();
              try {
                await exitTenantApi(activePropertyId, tenant.id, {
                  exitDate: finalDate,
                });
                showToast('Penghuni berhasil dicatat keluar');
                fetchTenantDetail();
              } catch (err) {
                showToast(err.message || 'Gagal mencatat penghuni keluar.');
              }
            }}
          >
            Ya, penghuni keluar
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <Header title="Memuat Penghuni…" />
        <div className="px-[18px] pt-4">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Penghuni" />
        <div className="px-[18px] pt-4">
          <ErrorState onRetry={fetchTenantDetail} />
        </div>
      </div>
    );
  }

  if (notFound || !tenant) {
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

  const roomDisplay = tenant.currentRoom
    ? `Kamar ${tenant.currentRoom.roomNumber}`
    : 'Belum ada kamar';
  const statusBadge = tenant.status === 'AKTIF' ? 'Aktif' : 'Keluar';
  const historyList = tenant.occupancyHistory || [];

  return (
    <div>
      <Header
        title="Detail Penghuni"
        right={
          <button
            className="border border-line bg-card rounded-[14px] p-[8px_14px] font-bold text-ink text-[13px] cursor-pointer hover:border-brand-dark transition-colors mr-2"
            onClick={handleEditSheet}
          >
            Edit
          </button>
        }
      />

      <div className="px-[18px] text-center">
        <Avatar name={tenant.name} size="lg" />
        <div className="font-bold text-[20px] text-ink">{tenant.name}</div>
        <div className="text-mute">{roomDisplay}</div>
        <div className="mt-[6px]">
          <Badge status={statusBadge} />
        </div>
      </div>

      <div className="px-[18px] mt-[14px]">
        <h2 className="text-[13px] font-bold text-mute mb-[8px]">Informasi</h2>
        <Card flat className="space-y-0 divide-y divide-line">
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">No. HP</span>
            <span className="font-semibold text-ink">{tenant.phone}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Alamat asal</span>
            <span className="font-semibold text-ink">{tenant.originAddress}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Pekerjaan</span>
            <span className="font-semibold text-ink">{tenant.occupation}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Tanggal masuk</span>
            <span className="font-semibold text-ink">{fd(tenant.moveInDate)}</span>
          </div>
          {tenant.exitDate && (
            <div className="flex justify-between py-[10px]">
              <span className="text-mute">Tanggal keluar</span>
              <span className="font-semibold text-ink">{fd(tenant.exitDate)}</span>
            </div>
          )}
        </Card>

        <Button variant="ghost" onClick={handleShowKtp}>
          Lihat Foto KTP
        </Button>

        {tenant.currentRoom && (
          <>
            <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">Kamar Saat Ini</h2>
            <Card flat onClick={() => navigate(`/kamar/${tenant.currentRoom.id}`)}>
              <div className="font-bold text-ink">Kamar {tenant.currentRoom.roomNumber}</div>
              <div className="text-mute text-[13px]">
                {rp(tenant.currentRoomPrice || 0)} / bulan
              </div>
            </Card>
          </>
        )}

        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">Riwayat Hunian</h2>
        {historyList.length > 0 ? (
          historyList.map((occ) => {
            const occStatus =
              occ.status === 'AKTIF'
                ? 'Aktif'
                : occ.status === 'PINDAH'
                ? 'Pindah'
                : 'Keluar';

            return (
              <Card key={occ.id} flat>
                <div className="flex justify-between items-center">
                  <div className="font-bold text-ink">
                    Kamar {occ.roomNumber || '—'}
                  </div>
                  <Badge status={occStatus} />
                </div>
                <div className="text-[13px] text-mute mt-1">
                  {fd(occ.startDate)} – {occ.endDate ? fd(occ.endDate) : 'Sekarang'}
                </div>
                {occ.price && (
                  <div className="text-[12px] text-mute mt-[2px]">
                    {rp(occ.price)} / bulan
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <p className="text-mute text-sm mb-4">Belum ada riwayat hunian.</p>
        )}

        {tenant.status === 'AKTIF' && (
          <div className="space-y-[10px] mt-4 mb-6">
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
