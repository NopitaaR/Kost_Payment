import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, rp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Badge, Chip, FAB } from '../components/UIComponents';
import { SkeletonLoader, ErrorState, EmptyState } from '../components/StateComponents';

export default function Rooms() {
  const navigate = useNavigate();
  const { rooms, getActiveTenantsByRoom, mode, setMode } = useApp();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua'); // 'Semua', 'Terisi', 'Kosong'

  const filteredRooms = rooms.filter((r) => {
    const activeTenants = getActiveTenantsByRoom(r.n);
    const matchesQuery = r.n.toLowerCase().includes(query.toLowerCase());

    if (filter === 'Terisi') return matchesQuery && activeTenants.length > 0;
    if (filter === 'Kosong') return matchesQuery && activeTenants.length === 0;
    return matchesQuery;
  });

  return (
    <div>
      <Header title="Kamar" back={false} />

      <div className="px-[18px]">
        <input
          placeholder="🔍 Cari nomor kamar…"
          className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand mb-[10px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex gap-[8px] mb-[10px]">
          {['Semua', 'Terisi', 'Kosong'].map((c) => (
            <Chip
              key={c}
              label={c}
              active={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>

        {mode === 'loading' && <SkeletonLoader />}
        {mode === 'error' && <ErrorState onRetry={() => setMode('normal')} />}
        {mode === 'empty' && (
          <EmptyState
            icon="🛏️"
            title="Belum ada kamar"
            message="Tambahkan kamar pertama untuk mulai mengelola kost."
          />
        )}

        {mode === 'normal' && (
          <div>
            {filteredRooms.length === 0 ? (
              <p className="text-mute text-center py-[30px]">Kamar tidak ditemukan.</p>
            ) : (
              filteredRooms.map((r) => {
                const activeTenants = getActiveTenantsByRoom(r.n);
                const isTerisi = activeTenants.length > 0;

                return (
                  <Card key={r.n} onClick={() => navigate(`/kamar/${r.n}`)}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[17px] text-ink">Kamar {r.n}</div>
                      <Badge isRoom status={isTerisi ? 'Terisi' : 'Kosong'} />
                    </div>

                    <div className="font-bold my-[6px] text-ink">
                      {rp(r.p)}{' '}
                      <span className="text-mute text-[13px] font-normal">/ bulan</span>
                    </div>

                    {isTerisi ? (
                      <div>
                        {activeTenants.map((x) => (
                          <div key={x.id} className="text-[13px] text-ink">
                            👤 {x.name.split(' ')[0]}
                          </div>
                        ))}
                        <div className="text-[13px] text-mute mt-[4px]">
                          {activeTenants.length} penghuni
                        </div>
                      </div>
                    ) : (
                      <div className="text-[13px] text-mute">Belum ada penghuni</div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      <FAB label="＋ Tambah Kamar" onClick={() => navigate('/kamar/tambah')} />
    </div>
  );
}
