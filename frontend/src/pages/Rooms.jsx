import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, rp } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Badge, Chip, FAB, Button } from '../components/UIComponents';
import { SkeletonLoader, ErrorState, EmptyState } from '../components/StateComponents';
import { getRooms } from '../api/rooms';

export default function Rooms() {
  const navigate = useNavigate();
  const { activePropertyId } = useApp();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Semua'); // 'Semua', 'Terisi', 'Kosong'

  const fetchRooms = useCallback(async () => {
    if (!activePropertyId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getRooms(activePropertyId);
      setRooms(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId]);

  useEffect(() => {
    if (!activePropertyId) {
      navigate('/pilih-rumah', { replace: true });
      return;
    }
    fetchRooms();
  }, [activePropertyId, navigate, fetchRooms]);

  const filteredRooms = rooms.filter((r) => {
    const isTerisi = r.status === 'TERISI';
    const matchesQuery = (r.roomNumber || '').toLowerCase().includes(query.toLowerCase());

    if (filter === 'Terisi') return matchesQuery && isTerisi;
    if (filter === 'Kosong') return matchesQuery && !isTerisi;
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

        {loading && <SkeletonLoader />}

        {!loading && error && <ErrorState onRetry={fetchRooms} />}

        {!loading && !error && rooms.length === 0 && (
          <EmptyState
            icon="🛏️"
            title="Belum ada kamar"
            message="Tambahkan kamar pertama untuk mulai mengelola kost."
            actionButton={
              <Button onClick={() => navigate('/kamar/tambah')}>
                + Tambah Kamar
              </Button>
            }
          />
        )}

        {!loading && !error && rooms.length > 0 && (
          <div>
            {filteredRooms.length === 0 ? (
              <p className="text-mute text-center py-[30px]">Kamar tidak ditemukan.</p>
            ) : (
              filteredRooms.map((r) => {
                const isTerisi = r.status === 'TERISI';
                const activeTenants = r.activeTenants || [];

                return (
                  <Card key={r.id} onClick={() => navigate(`/kamar/${r.id}`)}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[17px] text-ink">Kamar {r.roomNumber}</div>
                      <Badge isRoom status={isTerisi ? 'Terisi' : 'Kosong'} />
                    </div>

                    <div className="font-bold my-[6px] text-ink">
                      {rp(r.price)}{' '}
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
