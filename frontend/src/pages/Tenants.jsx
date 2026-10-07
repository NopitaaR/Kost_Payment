import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, isUUID } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Badge, Chip, FAB, Avatar } from '../components/UIComponents';
import { SkeletonLoader, ErrorState, EmptyState } from '../components/StateComponents';
import { getTenants } from '../api/tenants';

export default function Tenants() {
  const navigate = useNavigate();
  const { activePropertyId } = useApp();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Aktif'); // 'Aktif' | 'Keluar'

  const fetchTenants = useCallback(async () => {
    if (!activePropertyId || !isUUID(activePropertyId)) return;
    setLoading(true);
    setError(false);
    try {
      const statusParam = filter === 'Aktif' ? 'AKTIF' : 'KELUAR';
      const data = await getTenants(activePropertyId, {
        status: statusParam,
        search: query.trim() || undefined,
      });
      setTenants(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, filter, query]);

  useEffect(() => {
    if (!activePropertyId) {
      navigate('/pilih-rumah', { replace: true });
      return;
    }

    if (!isUUID(activePropertyId)) return;

    const timer = setTimeout(() => {
      fetchTenants();
    }, 200);

    return () => clearTimeout(timer);
  }, [activePropertyId, navigate, fetchTenants]);

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

        {loading && <SkeletonLoader />}

        {!loading && error && <ErrorState onRetry={fetchTenants} />}

        {!loading && !error && tenants.length === 0 && !query && (
          <EmptyState
            icon="👥"
            title="Belum ada penghuni"
            message={
              filter === 'Aktif'
                ? 'Tambahkan penghuni baru untuk mulai mengelola kost.'
                : 'Belum ada penghuni yang keluar.'
            }
          />
        )}

        {!loading && !error && (
          <div>
            {tenants.length === 0 && query ? (
              <p className="text-mute text-center py-[30px]">Tidak ada hasil.</p>
            ) : (
              tenants.map((x) => {
                const roomText = x.currentRoom ? `Kamar ${x.currentRoom.roomNumber}` : 'Tidak ada kamar';
                const statusBadge = x.status === 'AKTIF' ? 'Aktif' : 'Keluar';

                return (
                  <Card key={x.id} onClick={() => navigate(`/penghuni/${x.id}`)}>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-[10px] items-center">
                        <Avatar name={x.name} />
                        <div>
                          <div className="font-bold text-ink">{(x.name || '').split(' ')[0]}</div>
                          <div className="text-[13px] text-ink font-semibold">
                            {roomText}
                          </div>
                          <div className="text-[13px] text-mute">{x.phone}</div>
                        </div>
                      </div>
                      <Badge status={statusBadge} />
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
