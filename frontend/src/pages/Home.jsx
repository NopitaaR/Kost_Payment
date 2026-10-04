import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, rp, left, fd } from '../context/AppContext';
import Header from '../components/Header';
import { StatCard, Card, Button } from '../components/UIComponents';
import { SkeletonLoader, ErrorState, EmptyState } from '../components/StateComponents';

export default function Home() {
  const navigate = useNavigate();
  const {
    selectedHouse,
    rooms,
    tenants,
    getUnpaidBills,
    mode,
    setMode,
    getActiveTenantsByRoom,
  } = useApp();

  const totalRooms = rooms.length;
  const filledRooms = rooms.filter((r) => getActiveTenantsByRoom(r.n).length > 0).length;
  const emptyRooms = totalRooms - filledRooms;

  const activeTenants = tenants.filter((t) => t.st === 'Aktif');
  const unpaidBills = getUnpaidBills();
  const totalUnpaidAmount = unpaidBills.reduce((acc, b) => acc + left(b), 0);

  const recentTenants = [...activeTenants]
    .sort((a, b) => b.in.localeCompare(a.in))
    .slice(0, 2);

  return (
    <div>
      <Header
        title={selectedHouse}
        back={true}
        onBack={() => navigate('/pilih-rumah')}
        right={
          <button
            className="w-[42px] h-[42px] border-0 bg-transparent rounded-[12px] text-[20px] cursor-pointer flex items-center justify-center text-ink active:bg-gray-soft"
            aria-label="Menu"
            onClick={() => navigate('/lainnya')}
          >
            ⋮
          </button>
        }
      />

      <div className="px-[18px]">
        {mode === 'loading' && <SkeletonLoader />}
        {mode === 'error' && <ErrorState onRetry={() => setMode('normal')} />}
        {mode === 'empty' && (
          <EmptyState
            icon="🏠"
            title="Rumah ini masih kosong"
            message="Mulai dengan menambahkan kamar pertama."
            actionButton={
              <Button onClick={() => navigate('/kamar/tambah')}>+ Tambah Kamar</Button>
            }
          />
        )}

        {mode === 'normal' && (
          <>
            <div className="grid grid-cols-2 gap-[10px]">
              <StatCard
                number={totalRooms}
                label="Kamar"
                detail={`${filledRooms} terisi · ${emptyRooms} kosong`}
              />
              <StatCard number={activeTenants.length} label="Penghuni aktif" />
            </div>

            <Card
              className="mt-[10px]"
              onClick={() => navigate('/keuangan', { state: { tab: 'unpaid' } })}
            >
              <div className="text-mute text-[13px]">Belum bayar</div>
              <div className="text-[30px] font-extrabold tracking-tight text-bad leading-tight">
                {rp(totalUnpaidAmount)}
              </div>
              <div className="text-[13px] font-bold text-ink">{unpaidBills.length} tagihan</div>
            </Card>

            <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
              Penghuni terbaru
            </h2>
            {recentTenants.map((x) => (
              <Card key={x.id} onClick={() => navigate(`/penghuni/${x.id}`)}>
                <div className="flex gap-[10px] items-center">
                  <div className="w-[40px] h-[40px] rounded-full bg-brand-soft text-brand-dark grid place-items-center font-extrabold flex-shrink-0">
                    {x.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-ink">{x.name.split(' ')[0]}</div>
                    <div className="text-[13px] text-mute">
                      Kamar {x.room} · Masuk {fd(x.in)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Button onClick={() => navigate('/penghuni/tambah')}>+ Tambah Penghuni</Button>
            <div className="flex gap-[10px]">
              <Button variant="ghost" onClick={() => navigate('/kamar/tambah')}>
                + Tambah Kamar
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/keuangan', { state: { tab: 'unpaid' } })}
              >
                Lihat Belum Bayar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
