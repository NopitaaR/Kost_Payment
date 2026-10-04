import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp, rp, fd, left, paid, st } from '../context/AppContext';
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
    rooms,
    deletePayment,
    openSheet,
    closeSheet,
    getTenantNameByRoom,
    getActiveTenantsByRoom,
    mode,
    setMode,
  } = useApp();

  const [activeTab, setActiveTab] = useState(location.state?.tab || 'unpaid'); // 'bills', 'pays', 'unpaid'

  // Bill Filter state
  const [billFilter, setBillFilter] = useState({ q: '', room: '', per: '', st: '' });
  // Payment Filter state
  const [payFilter, setPayFilter] = useState({ room: '', m: '', a: '', z: '' });

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

  const allPayments = bills
    .flatMap((b) => (b.pay || []).map((p, i) => ({ ...p, b, i })))
    .filter((p) => {
      const matchesRoom = !payFilter.room || p.b.room === payFilter.room;
      const matchesMethod = !payFilter.m || p.m === payFilter.m;
      const matchesFrom = !payFilter.a || p.d >= payFilter.a;
      const matchesTo = !payFilter.z || p.d <= payFilter.z;
      return matchesRoom && matchesMethod && matchesFrom && matchesTo;
    })
    .sort((a, c) => c.d.localeCompare(a.d));

  const unpaidList = bills.filter((b) => st(b) !== 'LUNAS');
  const totalUnpaid = unpaidList.reduce((acc, b) => acc + left(b), 0);

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

  const handleWhatsApp = (bill) => {
    const tenantName = getTenantNameByRoom(bill.room);
    const text = `Halo ${tenantName}, mengingatkan pembayaran kost Kamar ${bill.room} sebesar ${rp(left(bill))} yang belum dibayar.\n\nTerima kasih.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div>
      <Header title="Keuangan" back={false} />

      <div className="px-[18px]">
        <div className="flex gap-[8px] mb-[10px]">
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
                      {(b.pay.length > 0 || activeTab === 'unpaid') && (
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
                    {allPayments.length} pembayaran · {rp(allPayments.reduce((acc, p) => acc + p.amt, 0))}
                  </div>
                  <Chip
                    label={`Filter${countActivePayFilters() ? ` (${countActivePayFilters()})` : ''}`}
                    active={countActivePayFilters() > 0}
                    onClick={openPayFilterModal}
                  />
                </div>

                {allPayments.length === 0 ? (
                  <EmptyState
                    icon="💸"
                    title="Belum ada pembayaran"
                    message="Pembayaran yang dicatat akan muncul di sini."
                  />
                ) : (
                  allPayments.map((p, idx) => (
                    <Card key={`${p.b.id}-${idx}`} flat>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-ink">
                            Kamar {p.b.room} · {getTenantNameByRoom(p.b.room)}
                          </div>
                          <div className="text-[13px] text-mute">
                            {fd(p.d)} · {p.m}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-ink">{rp(p.amt)}</div>
                          <button
                            className="w-[42px] h-[42px] border-0 bg-transparent rounded-[12px] text-[18px] cursor-pointer flex items-center justify-center text-ink active:bg-gray-soft"
                            aria-label="Hapus pembayaran"
                            onClick={() => deletePayment(p.b.id, p.i)}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))
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
                  <>
                    <Card flat className="bg-bad-soft border-transparent mb-[10px]">
                      <div className="text-[13px] text-mute">Total belum bayar</div>
                      <div className="text-[30px] font-extrabold text-bad tracking-tight">
                        {rp(totalUnpaid)}
                      </div>
                      <div className="text-[13px] font-bold text-ink">
                        {unpaidList.length} tagihan
                      </div>
                    </Card>

                    {unpaidList.map((b) => (
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
                            onClick={() => navigate(`/keuangan/tagihan/${b.id}/bayar`)}
                          >
                            Catat Pembayaran
                          </Button>
                          <Button
                            size="sm"
                            variant="wa"
                            onClick={() => handleWhatsApp(b)}
                          >
                            WhatsApp
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
