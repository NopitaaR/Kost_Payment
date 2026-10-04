import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Houses() {
  const navigate = useNavigate();
  const { houses, setSelectedHouse, rooms, tenants } = useApp();

  const handleSelectHouse = (houseName) => {
    setSelectedHouse(houseName);
    navigate('/');
  };

  const getHouseStats = (house, index) => {
    if (index === 0) {
      const totalRooms = rooms.length;
      const filledRooms = rooms.filter((r) =>
        tenants.some((t) => t.room === r.n && t.st === 'Aktif')
      ).length;
      return { totalRooms, filledRooms };
    }
    return {
      totalRooms: house.k || 0,
      filledRooms: house.t || 0,
    };
  };

  return (
    <div className="px-[18px] pt-[28px]">
      <h1 className="text-[26px] font-extrabold m-0 text-ink">Selamat datang 👋</h1>
      <p className="text-mute mb-[14px]">Pilih rumah kost</p>

      <div className="space-y-[10px]">
        {houses.map((h, i) => {
          const { totalRooms, filledRooms } = getHouseStats(h, i);
          const emptyRooms = totalRooms - filledRooms;

          return (
            <button
              key={h.n}
              onClick={() => handleSelectHouse(h.n)}
              className="bg-card border border-line rounded-[16px] p-[14px_16px] block w-full text-left cursor-pointer hover:border-brand-dark transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-[18px] text-ink">🏠 {h.n}</div>
                  <div className="text-mute text-sm mt-2">{totalRooms} kamar</div>
                  <div className="font-bold text-sm text-ink">
                    {filledRooms} terisi · {emptyRooms} kosong
                  </div>
                </div>
                <div className="text-mute text-[22px]">→</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
