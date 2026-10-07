import React, { useState, useEffect } from 'react';
import { useApp, rp, fd, left, st } from '../context/AppContext';
import { getPropertyPayments } from '../api/payments';
import Header from '../components/Header';
import { Card, Chip } from '../components/UIComponents';
import { SkeletonLoader, ErrorState } from '../components/StateComponents';

const MN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const mlabel = (k) => {
  const [year, month] = k.split('-');
  return `${MN[parseInt(month, 10) - 1]} ${year}`;
};

// Buat MONTH_OPTIONS dinamis: 12 bulan ke belakang termasuk bulan ini
function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    opts.push(`${y}-${m}`);
  }
  return opts;
}

// Buat YEAR_OPTIONS dinamis: tahun ini dan tahun lalu
function buildYearOptions() {
  const y = new Date().getFullYear();
  return [String(y), String(y - 1)];
}

const MONTH_OPTIONS = buildMonthOptions();
const YEAR_OPTIONS = buildYearOptions();

// Tanggal hari ini dalam format YYYY-MM-DD untuk default rentang
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Tanggal pertama bulan ini
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Report() {
  const { bills, tenants, activePropertyId } = useApp();

  const [mode, setMode] = useState('bulan'); // 'bulan' | 'tahun' | 'rentang'
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]);
  const [selectedYear, setSelectedYear] = useState(YEAR_OPTIONS[0]);
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(todayStr());

  // Payments dari API
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');

  // Fetch semua payments dari API ketika activePropertyId berubah
  useEffect(() => {
    if (!activePropertyId) {
      setPayments([]);
      return;
    }
    fetchPayments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePropertyId]);

  const fetchPayments = async () => {
    if (!activePropertyId) return;
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      const response = await getPropertyPayments(activePropertyId);
      if (response && response.success) {
        setPayments(response.data || []);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data pembayaran untuk laporan:', err);
      setPaymentsError('Gagal memuat data pembayaran.');
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // ---- Fungsi bantu range tanggal ----
  const getDateRange = () => {
    if (mode === 'bulan') {
      // Hari terakhir bulan — ambil hari pertama bulan berikutnya, mundur 1 hari
      const [y, m] = selectedMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate(); // getDate() dari hari ke-0 bulan berikutnya = hari terakhir bulan ini
      return [`${selectedMonth}-01`, `${selectedMonth}-${String(lastDay).padStart(2, '0')}`];
    }
    if (mode === 'tahun') {
      return [`${selectedYear}-01-01`, `${selectedYear}-12-31`];
    }
    return [startDate, endDate];
  };

  const [from, to] = getDateRange();
  const isDateInvalid = mode === 'rentang' && startDate > endDate;

  // ---- Filter bills berdasarkan range tanggal (menggunakan dueDate/b.due) ----
  const filteredBills = bills.filter(
    (b) => !isDateInvalid && b.due >= from && b.due <= to
  );

  // ---- Filter payments dari API berdasarkan range tanggal (menggunakan paymentDate) ----
  // payments dari API memiliki field paymentDate (ISO string)
  const filteredPayments = payments.filter((p) => {
    if (isDateInvalid) return false;
    const d = (p.paymentDate || '').slice(0, 10);
    return d >= from && d <= to;
  });

  // ---- Kalkulasi summary dari bills yang difilter ----
  const totalBillAmount = filteredBills.reduce((acc, b) => acc + (b.amount || b.amt || 0), 0);
  const totalUnpaidAmount = filteredBills.reduce((acc, b) => acc + left(b), 0);
  const lunasCount = filteredBills.filter((b) => st(b) === 'LUNAS').length;
  const belumLunasCount = filteredBills.filter((b) => st(b) !== 'LUNAS').length;

  // ---- Kalkulasi total dari payments yang difilter (dari API) ----
  const totalPaidAmount = filteredPayments.reduce((acc, p) => acc + (p.amount || p.amt || 0), 0);

  const activeTenantsCount = tenants.filter((t) => t.st === 'Aktif').length;

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

        {/* Loading / Error state payments */}
        {paymentsLoading && (
          <div className="mt-3">
            <SkeletonLoader />
          </div>
        )}
        {!paymentsLoading && paymentsError && (
          <div className="mt-3">
            <ErrorState message={paymentsError} onRetry={fetchPayments} />
          </div>
        )}

        {/* 4 Stat Cards */}
        {!paymentsLoading && (
          <>
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
                <div className="font-bold text-[18px] text-ink">{filteredPayments.length}</div>
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

            {/* Riwayat Transaksi — dari API payments */}
            <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
              Daftar transaksi
            </h2>
            {filteredPayments.length === 0 ? (
              <p className="text-mute text-sm py-4">Belum ada transaksi di periode ini.</p>
            ) : (
              filteredPayments
                .slice()
                .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''))
                .map((p) => (
                  <Card key={p.id} flat>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-ink">
                          {p.roomNumber ? `Kamar ${p.roomNumber}` : 'Pembayaran'}
                        </div>
                        <div className="text-[13px] text-mute">
                          {fd(p.paymentDate)} · {p.method}
                          {p.notes ? ` · ${p.notes}` : ''}
                        </div>
                      </div>
                      <div className="font-bold text-ink flex-shrink-0">{rp(p.amount || p.amt)}</div>
                    </div>
                  </Card>
                ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
