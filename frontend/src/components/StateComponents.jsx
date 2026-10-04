import React from 'react';
import { Button } from './UIComponents';

export function EmptyState({ icon = '🏠', title, message, actionButton }) {
  return (
    <div className="text-center py-[48px] px-[20px]">
      <div className="text-[44px] mb-2">{icon}</div>
      <h3 className="text-[18px] font-bold m-0 text-ink">{title}</h3>
      <p className="text-mute text-sm mt-[6px] mb-4">{message}</p>
      {actionButton}
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="space-y-[10px]">
      <div className="h-[92px] rounded-[16px] bg-gradient-to-r from-gray-soft via-line to-gray-soft animate-pulse"></div>
      <div className="h-[92px] rounded-[16px] bg-gradient-to-r from-gray-soft via-line to-gray-soft animate-pulse"></div>
      <div className="h-[92px] rounded-[16px] bg-gradient-to-r from-gray-soft via-line to-gray-soft animate-pulse"></div>
    </div>
  );
}

export function ErrorState({ onRetry }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Terjadi kesalahan"
      message="Data belum dapat dimuat. Periksa koneksi internet."
      actionButton={<Button onClick={onRetry}>Coba lagi</Button>}
    />
  );
}

export function SheetOverlay({ children, onClose }) {
  if (!children) return null;

  return (
    <div
      className="fixed inset-0 bg-[rgba(10,14,25,0.5)] flex items-end justify-center z-30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-card w-full max-w-[480px] rounded-t-[22px] p-[22px_18px] pb-[calc(22px+env(safe-area-inset-bottom,0px))] animate-up md:max-w-[480px]"
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, visible }) {
  if (!visible) return null;

  return (
    <div className="fixed left-1/2 bottom-[100px] -translate-x-1/2 bg-ink text-white px-[18px] py-[10px] rounded-full font-semibold text-[14px] z-40 max-w-[90%] shadow-md text-center">
      {message}
    </div>
  );
}
