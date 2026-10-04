import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, back = true, onBack, right }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 px-[12px] pt-[10px] pb-[6px] sticky top-0 bg-bg z-10 md:pt-5">
      {back && (
        <button
          className="w-[42px] h-[42px] border-0 bg-transparent rounded-[12px] text-[20px] cursor-pointer active:bg-gray-soft flex items-center justify-center text-ink"
          aria-label="Kembali"
          onClick={onBack || (() => navigate(-1))}
        >
          ←
        </button>
      )}
      <h1 className="text-[20px] font-extrabold m-0 flex-1 tracking-tight text-ink">
        {title}
      </h1>
      {right}
    </div>
  );
}
