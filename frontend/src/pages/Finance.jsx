import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp, rp, fd, left, paid, st } from '../context/AppContext';
import { getPropertyPayments, deletePayment } from '../api/payments';
import { createBill, generateBills } from '../api/bills';
import Header from '../components/Header';
import { Card, Badge, Chip, Button } from '../components/UIComponents';
import { SkeletonLoader, ErrorState, EmptyState } from '../components/StateComponents';

const MN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ym = (i) => i.slice(0, 7);
const mlabel = (k) => MN[+k.slice(5) - 1] + ' ' + k.slice(0, 4);

export default function Finance() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    bills,
    fetchBills,
    rooms,
    openSheet,
    closeSheet,
    getTenantNameByRoom,
    activePropertyId,
    confirmDialog,
    showToast,
    mode,
    setMode,
  } = useApp();

  // State declarations
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'unpaid'); // 'bills', 'pays', 'unpaid'

  // Bill Filter state
  const [billFilter, setBillFilter] = useState({ q: '', room: '', per: '', st: '' });
  // Payment Filter state
  const [payFilter, setPayFilter] = useState({ room: '', m: '', a: '', z: '' });

  // Payments from API
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');

  // Generate bills state
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateMsg, setGenerateMsg] = useState('');
  const [generateError, setGenerateError] = useState('');

  // Manual bill creation state
  const [manualBillOpen, setManualBillOpen] = useState(false);
  const [manualBill, setManualBill] = useState({
    roomId: '',
    periodStart: '',
    periodEnd: '',
    dueDate: '',
    notes: ''
  });
  const [manualBillError, setManualBillError] = useState('');
  const [manualBillLoading, setManualBillLoading] = useState(false);

  // Fetch payments for the active property when it changes
  useEffect(() => {
    if (activePropertyId) {
      fetchPayments();
    }
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
      console.error('Gagal mengambil daftar pembayaran:', err);
      setPayments([]);
      if (err.response && err.response.data && err.response.data.message) {
        setPaymentsError(err.response.data.message);
      } else {
        setPaymentsError('Gagal memuat daftar pembayaran.');
      }
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleDeletePayment = (payment) => {
    const paymentId = payment.id;
    const billId = payment.billId;
    if (!paymentId || !billId || !activePropertyId) return;

    confirmDialog(
      'Hapus pembayaran?',
      `Pembayaran ${rp(payment.amount || payment.amt)} (${payment.method || payment.m}, ${fd(payment.paymentDate || payment.d)}) untuk Kamar ${payment.roomNumber || '-'} akan dihapus. Sisa tagihan akan bertambah dan status tagihan bisa berubah.`,
      'Ya, hapus',
      async () => {
        try {
          const res = await deletePayment(activePropertyId, billId, paymentId);
          if (res && res.success) {
            showToast('Pembayaran dihapus');
            // Refresh daftar pembayaran dan tagihan
            await fetchPayments();
            await fetchBills();
          } else {
            showToast('Gagal menghapus pembayaran: ' + (res?.message || ''));
          }
        } catch (err) {
          console.error('Error delete payment:', err);
          showToast('Gagal menghapus pembayaran: ' + (err.message || ''));
        }
      }
    );
  };

  const handleGenerateBills = async () => {
    if (!activePropertyId) return;
    setGenerateLoading(true);
    setGenerateMsg('');
    setGenerateError('');
    try {
      const response = await generateBills(activePropertyId);
      if (response && response.success) {
        const count = response.data?.generatedCount ?? 0;
        setGenerateMsg(
          count > 0
            ? `${count} tagihan baru berhasil dibuat.`
            : 'Semua tagihan sudah ada, tidak ada yang perlu dibuat.'
        );
        // Refetch bills agar daftar langsung diperbarui
        await fetchBills();
      } else {
        setGenerateError('Gagal generate tagihan.');
      }
    } catch (err) {
      console.error('Gagal generate tagihan:', err);
      setGenerateError(err.message || 'Terjadi kesalahan saat generate tagihan.');
    } finally {
      setGenerateLoading(false);
    }
  };

  const periods = [...new Set(bills.map((b) => ym(b.due)))].sort().reverse();

  const countActiveBillFilters = () => {
    let count = 0;
    if (billFilter.room) count++;
    if (billFilter.per) count++;
    if (billFilter.st) count++;
    return count;
  };

  const countActivePayFilters = () => {
    let count = 0;
    if (payFilter.room) count++;
    if (payFilter.m) count++;
    if (payFilter.a) count++;
    if (payFilter.z) count++;
    return count;
  };

  const filteredBills = bills
    .filter((b) => {
      const q = billFilter.q.toLowerCase();
      const tenantName = getTenantNameByRoom(b.room);
      const matchesSearch = !q || (`kamar ${b.room} ${tenantName}`).toLowerCase().includes(q);
      const matchesRoom = !billFilter.room || b.room === billFilter.room;
      const matchesPer = !billFilter.per || ym(b.due) === billFilter.per;
      const matchesSt = !billFilter.st || st(b) === billFilter.st;
      return matchesSearch && matchesRoom && matchesPer && matchesSt;
    })
    .sort((a, c) => c.due.localeCompare(a.due));

  // Compute unpaid bills
  const unpaidList = bills.filter((b) => st(b) !== 'LUNAS');

  // Compute total payments amount from fetched payments
  const totalPaymentsAmount = payments.reduce((acc, p) => acc + (p.amt || 0), 0);

  const openBillFilterModal = () => {
    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Filter tagihan</h3>
        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Kamar
          </label>
          <select
            id="fr"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={billFilter.room}
          >
            <option value="">Semua kamar</option>
            {rooms.map((r) => (
              <option key={r.n} value={r.n}>
                Kamar {r.n}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Periode (bulan jatuh tempo)
          </label>
          <select
            id="fp"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={billFilter.per}
          >
            <option value="">Semua periode</option>
            {periods.map((k) => (
              <option key={k} value={k}>
                {mlabel(k)}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Status
          </label>
          <select
            id="fs"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={billFilter.st}
          >
            <option value="">Semua status</option>
            <option value="LUNAS">Lunas</option>
            <option value="SEBAGIAN">Sebagian</option>
            <option value="BELUM_BAYAR">Belum bayar</option>
            <option value="TERLAMBAT">Terlambat</option>
          </select>
        </div>

        <div className="flex gap-[10px] mt-[14px]">
          <Button
            variant="ghost"
            onClick={() => {
              setBillFilter({ q: '', room: '', per: '', st: '' });
              closeSheet();
            }}
          >
            Reset
          </Button>
          <Button
            onClick={() => {
              const r = document.getElementById('fr')?.value || '';
              const p = document.getElementById('fp')?.value || '';
              const s = document.getElementById('fs')?.value || '';
              setBillFilter((prev) => ({ ...prev, room: r, per: p, st: s }));
              closeSheet();
            }}
          >
            Terapkan
          </Button>
        </div>
      </div>
    );
  };

  const openPayFilterModal = () => {
    openSheet(
      <div>
        <h3 className="text-[18px] font-bold mb-[6px]">Filter pembayaran</h3>
        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Kamar
          </label>
          <select
            id="gr"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={payFilter.room}
          >
            <option value="">Semua kamar</option>
            {rooms.map((r) => (
              <option key={r.n} value={r.n}>
                Kamar {r.n}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-[14px]">
          <label className="block text-[13px] font-semibold mb-[6px] text-ink">
            Metode
          </label>
          <select
            id="gm"
            className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
            defaultValue={payFilter.m}
          >
            <option value="">Semua metode</option>
            <option value="Cash">Cash</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>

        <div className="flex gap-[10px]">
          <div className="flex-1">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Dari tanggal
            </label>
            <input
              id="ga"
              type="date"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
              defaultValue={payFilter.a}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Sampai tanggal
            </label>
            <input
              id="gz"
              type="date"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
              defaultValue={payFilter.z}
            />
          </div>
        </div>

        <div className="flex gap-[10px] mt-[14px]">
          <Button
            variant="ghost"
            onClick={() => {
              setPayFilter({ room: '', m: '', a: '', z: '' });
              closeSheet();
            }}
          >
            Reset
          </Button>
          <Button
            onClick={() => {
              const r = document.getElementById('gr')?.value || '';
              const m = document.getElementById('gm')?.value || '';
              const a = document.getElementById('ga')?.value || '';
              const z = document.getElementById('gz')?.value || '';
              setPayFilter({ room: r, m, a, z });
              closeSheet();
            }}
          >
            Terapkan
          </Button>
        </div>
      </div>
    );
  };

  const openManualBillModal = () => {
    // Reset form when opening
    setManualBill({
      roomId: '',
      periodStart: '',
      periodEnd: '',
      dueDate: '',
      notes: ''
    });
    setManualBillError('');
    setManualBillOpen(true);
  };

  const closeManualBillModal = () => {
    setManualBillOpen(false);
  };

  const handleManualBillChange = (field, value) => {
    setManualBill(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleManualBillSubmit = async (e) => {
    e.preventDefault();
    setManualBillError('');
    setManualBillLoading(true);
    try {
      // Validate
      if (!manualBill.roomId) {
        setManualBillError('Kamar harus dipilih');
        return;
      }
      if (!manualBill.periodStart || !manualBill.periodEnd) {
        setManualBillError('Periode harus diisi');
        return;
      }
      if (!manualBill.dueDate) {
        setManualBillError('Tanggal jatuh tempo harus diisi');
        return;
      }

      // Build API data — amount diambil dari harga kamar (backend snapshot)
      const apiData = {
        roomId: manualBill.roomId,
        periodStart: manualBill.periodStart,
        periodEnd: manualBill.periodEnd,
        dueDate: manualBill.dueDate,
        notes: manualBill.notes || undefined,
      };

      const response = await createBill(activePropertyId, apiData);
      if (response && response.success) {
        // Refetch bills to update the list
        await fetchBills();
        closeManualBillModal();
      } else {
        setManualBillError('Gagal membuat tagihan');
      }
    } catch (err) {
      console.error('Gagal membuat tagihan manual:', err);
      setManualBillError(err.message || 'Terjadi kesalahan');
    } finally {
      setManualBillLoading(false);
    }
  };

  const handleWhatsApp = (bill) => {
    const tenantName = getTenantNameByRoom(bill.room);
    const text = `Halo ${tenantName}, mengingatkan pembayaran kost Kamar ${bill.room} sebesar ${rp(left(bill))} yang belum dibayar.\\n\\nTerima kasih.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div>
      <Header title="Keuangan" back={false} />

      <div className="px-[18px]">
        <div className="flex gap-[8px] mb-[10px] flex-wrap">
          {[
            ['bills', 'Tagihan'],
            ['pays', 'Pembayaran'],
            ['unpaid', 'Belum Bayar'],
          ].map(([tKey, tLabel]) => (
            <Chip
              key={tKey}
              label={tLabel}
              active={activeTab === tKey}
              onClick={() => setActiveTab(tKey)}
            />
          ))}
        </div>

        {mode === 'loading' && <SkeletonLoader />}
        {mode === 'error' && <ErrorState onRetry={() => setMode('normal')} />}

        {mode === 'normal' && (
          <div>
            {/* TAGIHAN TAB */}
            {activeTab === 'bills' && (
              <div>
                {/* Generate & Manual Bill actions */}
                <div className="flex gap-[8px] mb-[10px] flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleGenerateBills}
                    disabled={generateLoading}
                  >
                    {generateLoading ? 'Generating…' : '⚡ Generate Tagihan'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={openManualBillModal}
                  >
                    + Tagihan Manual
                  </Button>
                </div>

                {/* Generate feedback */}
                {generateMsg && (
                  <p className="text-ok text-[13px] mb-2">{generateMsg}</p>
                )}
                {generateError && (
                  <p className="text-bad text-[13px] mb-2">{generateError}</p>
                )}

                <div className="flex gap-[10px] mb-[10px] items-center">
                  <input
                    placeholder="🔍 Cari kamar / nama…"
                    className="flex-1 border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
                    value={billFilter.q}
                    onChange={(e) => setBillFilter({ ...billFilter, q: e.target.value })}
                  />
                  <Chip
                    label={`Filter${countActiveBillFilters() ? ` (${countActiveBillFilters()})` : ''}`}
                    active={countActiveBillFilters() > 0}
                    onClick={openBillFilterModal}
                  />
                </div>

                {filteredBills.length === 0 ? (
                  <EmptyState
                    icon="🧾"
                    title="Belum ada tagihan"
                    message="Tagihan dibuat otomatis saat ada penghuni."
                  />
                ) : (
                  filteredBills.map((b) => (
                    <Card key={b.id} onClick={() => navigate(`/keuangan/tagihan/${b.id}`)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-ink">{getTenantNameByRoom(b.room)}</div>
                          <div className="text-[13px] text-mute">
                            Kamar {b.room} · Jatuh tempo {fd(b.due)}
                          </div>
                        </div>
                        <Badge status={st(b)} />
                      </div>
                      {(left(b) > 0 || (b.totalPaid > 0)) && (
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[13px] text-mute">Sisa</span>
                          <span className="font-bold text-ink">{rp(left(b))}</span>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* PEMBAYARAN TAB */}
            {activeTab === 'pays' && (
              <div>
                <div className="flex justify-between items-center mb-[10px]">
                  <div className="text-[13px] text-mute">
                    {payments.length} pembayaran · {rp(totalPaymentsAmount)}
                  </div>
                  <Chip
                    label={`Filter${countActivePayFilters() ? ` (${countActivePayFilters()})` : ''}`}
                    active={countActivePayFilters() > 0}
                    onClick={openPayFilterModal}
                  />
                </div>

                {paymentsLoading ? (
                  <p className="text-mute text-sm mb-4">Memuat pembayaran...</p>
                ) : paymentsError ? (
                  <p className="text-bad text-sm mb-4">{paymentsError}</p>
                ) : (
                  payments.length === 0 ? (
                    <EmptyState
                      icon="💸"
                      title="Belum ada pembayaran"
                      message="Pembayaran yang dicatat akan muncul di sini."
                    />
                  ) : (
                    payments.map((p, idx) => (
                      <Card key={`${p.id || p.billId}-${idx}`} flat>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-ink">
                              Kamar {p.roomNumber ?? '-'} · {getTenantNameByRoom(p.roomNumber ?? '-')}
                            </div>
                            <div className="text-[13px] text-mute">
                              {fd(p.paymentDate)} · {p.method || p.m}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-ink">{rp(p.amt)}</div>
                            <button
                              type="button"
                              aria-label="Hapus pembayaran"
                              className="p-1 text-mute hover:text-bad active:text-bad text-base cursor-pointer border-0 bg-transparent"
                              onClick={() => handleDeletePayment(p)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                        {p.notes && (
                          <div className="text-[13px] text-mute mt-1">{p.notes}</div>
                        )}
                      </Card>
                    ))
                  )
                )}
              </div>
            )}

            {/* BELUM BAYAR TAB */}
            {activeTab === 'unpaid' && (
              <div>
                {unpaidList.length === 0 ? (
                  <EmptyState
                    icon="🎉"
                    title="Tidak ada tagihan tertunggak"
                    message="Semua pembayaran sudah aman."
                  />
                ) : (
                  unpaidList.map((b) => (
                    <Card key={b.id} flat>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-ink">{getTenantNameByRoom(b.room)}</div>
                          <div className="text-[13px] text-mute">
                            Kamar {b.room} · Jatuh tempo {fd(b.due)}
                          </div>
                        </div>
                        <Badge status={st(b)} />
                      </div>

                      {paid(b) > 0 && (
                        <div className="text-[13px] text-mute mt-[6px]">
                          Tagihan {rp(b.amt)} · Dibayar {rp(paid(b))}
                        </div>
                      )}

                      <div className="flex justify-between items-center my-[6px]">
                        <span className="text-[13px] text-mute">Sisa</span>
                        <span className="font-bold text-[18px] text-ink">{rp(left(b))}</span>
                      </div>

                      <div className="flex gap-[10px]">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/keuangan/tagihan/${b.id}/bayar`)}>
                          Catat Pembayaran
                        </Button>
                        <Button
                          size="sm"
                          variant="wa"
                          onClick={() => handleWhatsApp(b)}>
                          WhatsApp
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Tagihan Manual */}
      {manualBillOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-t-[24px] p-[24px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-[18px] font-bold mb-[14px]">Buat Tagihan Manual</h3>
            <form onSubmit={handleManualBillSubmit}>
              <div className="mb-[14px]">
                <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                  Kamar
                </label>
                <select
                  className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
                  value={manualBill.roomId}
                  onChange={(e) => handleManualBillChange('roomId', e.target.value)}
                  required
                >
                  <option value="">Pilih kamar…</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      Kamar {r.n} {r.p ? `· Rp${r.p.toLocaleString('id-ID')}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-[10px] mb-[14px]">
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                    Periode mulai
                  </label>
                  <input
                    type="date"
                    className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
                    value={manualBill.periodStart}
                    onChange={(e) => handleManualBillChange('periodStart', e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                    Periode selesai
                  </label>
                  <input
                    type="date"
                    className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
                    value={manualBill.periodEnd}
                    onChange={(e) => handleManualBillChange('periodEnd', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-[14px]">
                <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                  Jatuh tempo
                </label>
                <input
                  type="date"
                  className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
                  value={manualBill.dueDate}
                  onChange={(e) => handleManualBillChange('dueDate', e.target.value)}
                  required
                />
              </div>

              <div className="mb-[14px]">
                <label className="block text-[13px] font-semibold mb-[6px] text-ink">
                  Catatan (opsional)
                </label>
                <input
                  className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none"
                  value={manualBill.notes}
                  onChange={(e) => handleManualBillChange('notes', e.target.value)}
                  placeholder="Keterangan tagihan…"
                />
              </div>

              <p className="text-[12px] text-mute mb-[14px]">
                💡 Nominal tagihan diambil otomatis dari harga kamar yang sudah diatur.
              </p>

              {manualBillError && (
                <p className="text-bad text-[13px] mb-2">{manualBillError}</p>
              )}

              <div className="flex gap-[10px]">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={closeManualBillModal}
                  disabled={manualBillLoading}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={manualBillLoading}>
                  {manualBillLoading ? 'Menyimpan…' : 'Simpan Tagihan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
