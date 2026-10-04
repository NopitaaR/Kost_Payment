import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = location.pathname;

  const items = [
    { key: '/', label: 'Beranda', icon: '🏠', path: '/' },
    { key: '/kamar', label: 'Kamar', icon: '🛏', path: '/kamar' },
    { key: '/penghuni', label: 'Penghuni', icon: '👥', path: '/penghuni' },
    { key: '/keuangan', label: 'Keuangan', icon: '💰', path: '/keuangan' },
    { key: '/lainnya', label: 'Lainnya', icon: '☰', path: '/lainnya' },
  ];

  const isTabActive = (item) => {
    if (item.path === '/') return activePath === '/';
    if (item.path === '/lainnya') {
      return (
        activePath.startsWith('/lainnya') ||
        activePath.startsWith('/laporan') ||
        activePath.startsWith('/pengaturan')
      );
    }
    return activePath.startsWith(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex bg-card border-t border-line py-[6px] px-1 z-20
                 md:left-0 md:top-0 md:bottom-0 md:transform-none md:w-[230px] md:max-w-none md:flex-col md:justify-start md:gap-1 md:py-[28px] md:px-[12px] md:border-t-0 md:border-r"
      aria-label="Menu utama"
    >
      {items.map((item) => {
        const active = isTabActive(item);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`flex-1 border-0 bg-transparent flex flex-col items-center gap-[2px] py-[6px] text-[11px] font-semibold cursor-pointer rounded-[12px] transition-colors
                       md:flex-none md:flex-row md:gap-3 md:text-[15px] md:py-3 md:px-[14px] ${
                         active
                           ? 'text-brand-dark font-bold bg-brand-soft md:bg-brand-soft'
                           : 'text-mute hover:bg-gray-soft'
                       }`}
          >
            <i className="not-italic text-[20px]">{item.icon}</i>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
