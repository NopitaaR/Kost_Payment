import React from 'react';
import { LB, CL } from '../context/AppContext';

export function Badge({ status, text, isRoom = false }) {
  if (isRoom) {
    const isTerisi = status === 'Terisi';
    return (
      <span
        className={`inline-block text-[12px] font-bold px-[10px] py-[3px] rounded-full whitespace-nowrap ${
          isTerisi ? 'bg-brand-soft text-brand-dark border border-[#b5ecd9]' : 'bg-gray-soft text-gray'
        }`}
      >
        {status}
      </span>
    );
  }

  if (status === 'Aktif' || status === 'Keluar') {
    const isAktif = status === 'Aktif';
    return (
      <span
        className={`inline-block text-[12px] font-bold px-[10px] py-[3px] rounded-full whitespace-nowrap ${
          isAktif ? 'bg-brand-soft text-brand-dark border border-[#b5ecd9]' : 'bg-gray-soft text-gray'
        }`}
      >
        {status}
      </span>
    );
  }

  // Bill statuses: LUNAS, SEBAGIAN, BELUM_BAYAR, TERLAMBAT
  const labelText = text || LB[status] || status;
  const colorKey = CL[status] || 'gray';

  const styleMap = {
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    gray: 'bg-gray-soft text-gray',
  };

  return (
    <span
      className={`inline-block text-[12px] font-bold px-[10px] py-[3px] rounded-full whitespace-nowrap ${
        styleMap[colorKey] || 'bg-gray-soft text-gray'
      }`}
    >
      {status === 'LUNAS' ? '✓ ' : ''}
      {labelText}
    </span>
  );
}

export function Avatar({ name, size = 'sm' }) {
  const initial = name ? name[0].toUpperCase() : '?';
  if (size === 'lg') {
    return (
      <div className="w-[72px] h-[72px] rounded-full bg-brand-soft text-brand-dark grid place-items-center font-extrabold text-[28px] mx-auto mb-[10px] flex-shrink-0">
        {initial}
      </div>
    );
  }

  return (
    <div className="w-[40px] h-[40px] rounded-full bg-brand-soft text-brand-dark grid place-items-center font-extrabold flex-shrink-0 text-[16px]">
      {initial}
    </div>
  );
}

export function Button({ children, variant = 'primary', size = 'normal', className = '', ...props }) {
  const base = 'block w-full border-0 rounded-[14px] font-bold cursor-pointer text-center transition-opacity active:opacity-90';

  const variants = {
    primary: 'bg-brand text-on-brand',
    ghost: 'bg-card text-ink border border-line',
    bad: 'bg-bad text-white',
    wa: 'bg-ok-soft text-ok',
  };

  const sizes = {
    normal: 'p-[14px] text-[15px] mt-[10px]',
    sm: 'p-[10px] text-[14px] mt-0',
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.normal} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Chip({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`border rounded-full px-[14px] py-[7px] font-semibold text-[14px] cursor-pointer transition-colors ${
        active
          ? 'bg-brand text-on-brand border-brand font-bold'
          : 'bg-card text-ink border-line hover:bg-gray-soft'
      }`}
    >
      {label}
      {count ? ` (${count})` : ''}
    </button>
  );
}

export function Card({ children, flat = false, onClick, className = '' }) {
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      onClick={onClick}
      className={`bg-card border border-line rounded-[16px] p-[14px_16px] mb-[10px] block w-full text-left transition-colors ${
        flat ? 'cursor-default' : 'cursor-pointer hover:border-brand-dark'
      } ${className}`}
    >
      {children}
    </Element>
  );
}

export function StatCard({ number, label, detail }) {
  return (
    <div className="bg-card border border-line rounded-[16px] p-[14px_16px] cursor-default w-full">
      <div className="text-[30px] font-extrabold tracking-tight leading-[1.1] text-ink">{number}</div>
      <div className="text-mute text-[13px]">{label}</div>
      {detail && <div className="text-[13px] font-bold mt-2 text-ink">{detail}</div>}
    </div>
  );
}

export function FAB({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed right-[max(18px,calc(50%-222px))] bottom-[92px] bg-brand text-on-brand border-0 rounded-full px-5 py-[14px] font-bold shadow-[0_6px_18px_rgba(10,125,92,0.28)] cursor-pointer z-10 md:right-[40px] md:bottom-[40px]"
    >
      {label}
    </button>
  );
}
