import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Badge, Chip, FAB, Avatar } from '../components/UIComponents';
import { SkeletonLoader, ErrorState, EmptyState } from '../components/StateComponents';

export default function Tenants() {
  const navigate = useNavigate();
  const { tenants, mode, setMode } = useApp();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Aktif'); // 'Aktif' | 'Keluar'

  const filteredTenants = tenants.filter((t) => {
    const matchesQuery = (t.name + t.hp).toLowerCase().includes(query.toLowerCase());
    return t.st === filter && matchesQuery;
  });

  return (
    <div>
      <Header title="Penghuni" back={false} />

      <div className="px-[18px]">
        <input
          placeholder="🔍 Cari nama / nomor HP…"
          className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand mb-[10px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="flex gap-[8px] mb-[10px]">
          {['Aktif', 'Keluar'].map((c) => (
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
            icon="👥"
            title="Belum ada penghuni"
            message="Tambahkan penghuni baru untuk mulai mengelola kost."
          />
        )}

        {mode === 'normal' && (
          <div>
            {filteredTenants.length === 0 ? (
              <p className="text-mute text-center py-[30px]">Tidak ada hasil.</p>
            ) : (
              filteredTenants.map((x) => (
                <Card key={x.id} onClick={() => navigate(`/penghuni/${x.id}`)}>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-[10px] items-center">
                      <Avatar name={x.name} />
                      <div>
                        <div className="font-bold text-ink">{x.name.split(' ')[0]}</div>
                        <div className="text-[13px] text-ink font-semibold">
                          Kamar {x.room}
                        </div>
                        <div className="text-[13px] text-mute">{x.hp}</div>
                      </div>
                    </div>
                    <Badge status={x.st} />
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <FAB label="＋ Tambah" onClick={() => navigate('/penghuni/tambah')} />
    </div>
  );
}
