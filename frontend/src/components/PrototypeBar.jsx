import React from 'react';
import { useApp } from '../context/AppContext';

export default function PrototypeBar() {
  const { mode, setMode } = useApp();

  const modes = [
    ['normal', 'Normal'],
    ['empty', 'Kosong'],
    ['loading', 'Memuat'],
    ['error', 'Error'],
  ];

  return (
    <div className="flex gap-[6px] items-center px-[14px] py-2 text-[12px] text-mute overflow-x-auto whitespace-nowrap bg-bg border-b border-line">
      <span>Prototipe:</span>
      {modes.map(([mKey, mLabel]) => (
        <button
          key={mKey}
          onClick={() => setMode(mKey)}
          className={`border border-line rounded-full px-[10px] py-[4px] text-[12px] cursor-pointer transition-colors ${
            mode === mKey
              ? 'bg-brand text-on-brand border-brand font-bold'
              : 'bg-card text-ink'
          }`}
        >
          {mLabel}
        </button>
      ))}
    </div>
  );
}
