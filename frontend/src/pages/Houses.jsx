import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getProperties } from '../api/properties';
import { SkeletonLoader, ErrorState, EmptyState } from '../components/StateComponents';

export default function Houses() {
  const navigate = useNavigate();
  const { setActivePropertyId, setSelectedHouse } = useApp();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getProperties();
      setProperties(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSelectHouse = (property) => {
    setActivePropertyId(property.id);
    setSelectedHouse(property.name);
    navigate('/');
  };

  return (
    <div className="px-[18px] pt-[28px]">
      <h1 className="text-[26px] font-extrabold m-0 text-ink">Selamat datang 👋</h1>
      <p className="text-mute mb-[14px]">Pilih rumah kost</p>

      {loading && <SkeletonLoader />}

      {!loading && error && <ErrorState onRetry={fetchProperties} />}

      {!loading && !error && properties.length === 0 && (
        <EmptyState
          icon="🏠"
          title="Belum ada rumah"
          message="Anda belum memiliki rumah kost yang terdaftar."
        />
      )}

      {!loading && !error && properties.length > 0 && (
        <div className="space-y-[10px]">
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectHouse(p)}
              className="bg-card border border-line rounded-[16px] p-[14px_16px] block w-full text-left cursor-pointer hover:border-brand-dark transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-[18px] text-ink">🏠 {p.name}</div>
                  <div className="text-mute text-sm mt-2">{p.totalRooms} kamar</div>
                  <div className="font-bold text-sm text-ink">
                    {p.filledRooms} terisi · {p.emptyRooms} kosong
                  </div>
                  {p.activeTenants !== undefined && (
                    <div className="text-mute text-xs mt-1">
                      {p.activeTenants} penghuni aktif
                    </div>
                  )}
                </div>
                <div className="text-mute text-[22px]">→</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
