import React, { useState } from 'react';
import { useApp, rp, fd, left, st } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Chip } from '../components/UIComponents';

const MN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const mlabel = (k) => {
  const [year, month] = k.split('-');
  return `${MN[parseInt(month, 10) - 1]} ${year}`;
};

const MONTH_OPTIONS = ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05'];
const YEAR_OPTIONS = ['2026', '2025'];

export default function Report() {
  const { bills, tenants } = useApp();

  const [mode, setMode] = useState('bulan'); // 'bulan' | 'tahun' | 'rentang'
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');

  const getDateRange = () => {
    if (mode === 'bulan') {
      return [`${selectedMonth}-01`, `${selectedMonth}-31`];
    }
    if (mode === 'tahun') {
      return [`${selectedYear}-01-01`, `${selectedYear}-12-31`];
    }
    return [startDate, endDate];
  };

  const [from, to] = getDateRange();
  const isDateInvalid = mode === 'rentang' && startDate > endDate;

  // Filter bills by due date in range
  const filteredBills = bills.filter((b) => !isDateInvalid && b.due >= from && b.due <= to);

  // Payments related to these bills
  const transactions = filteredBills
    .flatMap((b) => (b.pay || []).map((p) => ({ ...p, b })))
    .sort((x, y) => y.d.localeCompare(x.d));

  const totalBillAmount = filteredBills.reduce((acc, b) => acc + b.amt, 0);
  const totalPaidAmount = transactions.reduce((acc, p) => acc + p.amt, 0);
  const totalUnpaidAmount = filteredBills.reduce((acc, b) => acc + left(b), 0);

  const activeTenantsCount = tenants.filter((t) => t.st === 'Aktif').length;
  const lunasCount = filteredBills.filter((b) => st(b) === 'LUNAS').length;
  const belumLunasCount = filteredBills.filter((b) => st(b) !== 'LUNAS').length;

  return (
    <div>
      <Header title="Laporan" />

      <div className="px-[18px]">
        {/* Chip Filter Periode */}
        <div className="flex gap-[8px] mb-[10px]">
          {[
            ['bulan', 'Bulan'],
            ['tahun', 'Tahun'],
            ['rentang', 'Rentang tanggal'],
          ].map(([mKey, mLabel]) => (
            <Chip
              key={mKey}
              label={mLabel}
              active={mode === mKey}
              onClick={() => setMode(mKey)}
            />
          ))}
        </div>

        {/* Input Periode Sesuai Mode */}
        {mode === 'bulan' && (
          <select
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none mb-3"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {mlabel(m)}
              </option>
            ))}
          </select>
        )}

        {mode === 'tahun' && (
          <select
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none mb-3"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}

        {mode === 'rentang' && (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                  Dari tanggal
                </label>
                <input
                  type="date"
                  className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                  Sampai tanggal
                </label>
                <input
                  type="date"
                  className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {isDateInvalid && (
              <div className="text-bad text-[13px] mt-2">
                Tanggal akhir harus setelah tanggal awal.
              </div>
            )}
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-[10px] mt-3">
          <Card flat>
            <div className="text-[13px] text-mute">Total tagihan</div>
            <div className="font-bold text-[18px] text-ink">{rp(totalBillAmount)}</div>
          </Card>
          <Card flat>
            <div className="text-[13px] text-mute">Sudah dibayar</div>
            <div className="font-bold text-[18px] text-ok">{rp(totalPaidAmount)}</div>
          </Card>
          <Card flat>
            <div className="text-[13px] text-mute">Belum dibayar</div>
            <div className={`font-bold text-[18px] ${totalUnpaidAmount > 0 ? 'text-bad' : 'text-ok'}`}>
              {rp(totalUnpaidAmount)}
            </div>
          </Card>
          <Card flat>
            <div className="text-[13px] text-mute">Transaksi</div>
            <div className="font-bold text-[18px] text-ink">{transactions.length}</div>
          </Card>
        </div>

        {/* Rincian Hunian & Status Tagihan */}
        <Card flat className="mt-[10px] space-y-0 divide-y divide-line">
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Penghuni aktif</span>
            <span className="font-semibold text-ink">{activeTenantsCount}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Tagihan lunas</span>
            <span className="font-semibold text-ink">{lunasCount}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Tagihan belum lunas</span>
            <span className="font-semibold text-ink">{belumLunasCount}</span>
          </div>
        </Card>

        {/* Riwayat Transaksi */}
        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
          Daftar transaksi
        </h2>
        {transactions.length === 0 ? (
          <p className="text-mute text-sm py-4">Belum ada transaksi di periode ini.</p>
        ) : (
          transactions.map((p, idx) => (
            <Card key={`${p.b.id}-${idx}`} flat>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-ink">Kamar {p.b.room}</div>
                  <div className="text-[13px] text-mute">
                    {fd(p.d)} · {p.m}
                  </div>
                </div>
                <div className="font-bold text-ink flex-shrink-0">{rp(p.amt)}</div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
