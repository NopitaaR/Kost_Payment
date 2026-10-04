import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Card } from '../components/UIComponents';

export default function More() {
  const navigate = useNavigate();

  const menuItems = [
    { icon: '📊', label: 'Laporan', path: '/laporan' },
    { icon: '⚙️', label: 'Pengaturan', path: '/pengaturan' },
    { icon: '🏠', label: 'Pilih / kembali ke rumah', path: '/pilih-rumah' },
  ];

  return (
    <div>
      <Header title="Lainnya" back={false} />

      <div className="px-[18px]">
        {menuItems.map((item) => (
          <Card key={item.path} onClick={() => navigate(item.path)}>
            <div className="flex items-center gap-[10px]">
              <span className="text-[20px] flex-shrink-0">{item.icon}</span>
              <span className="font-bold flex-1 text-ink">{item.label}</span>
              <span className="text-mute flex-shrink-0">→</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
