import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, rp, left } from '../context/AppContext';
import { createPayment } from '../api/payments';
import Header from '../components/Header';
import { Card, Button } from '../components/UIComponents';

export default function PaymentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bills, getTenantNameByRoom, activePropertyId, fetchBillDetail } = useApp();

  // Bill ID adalah UUID string, jangan dikonversi dengan Number().
  const billId = id;
  const bill = bills.find((b) => String(b.id) === String(billId));

  // Seluruh hook dipanggil sebelum early return (Rules of Hooks).
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activePropertyId && billId) {
      fetchBillDetail(activePropertyId, billId);
    }
  }, [activePropertyId, billId, fetchBillDetail]);

  // Nominal default = sisa tagihan, diisi setelah data tagihan tersedia.
  useEffect(() => {
    if (bill) setAmt(left(bill));
  }, [bill]);

  if (!bill) {
    return (
      <div>
        <Header title="Tagihan Tidak Ditemukan" />
        <div className="px-[18px] text-center py-10">
          <p className="text-mute">Data tagihan tidak ditemukan.</p>
          <Button onClick={() => navigate('/keuangan')}>Kembali ke Keuangan</Button>
        </div>
      </div>
    );
  }

  const remaining = left(bill);

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanAmt = parseInt(String(amt).replace(/\D/g, ''), 10) || 0;

    if (cleanAmt <= 0) {
      setErr('Masukkan jumlah pembayaran.');
      return;
    }
    if (cleanAmt > remaining) {
      setErr('Jumlah pembayaran tidak boleh melebihi sisa tagihan.');
      return;
    }

    setLoading(true);
    setErr('');
    try {
      await createPayment(activePropertyId, billId, {
        d: date,
        amt: cleanAmt,
        m: method,
        note,
      });
      // Refetch bill detail to update state with server data
      await fetchBillDetail(activePropertyId, billId);
      navigate(-1);
    } catch (err) {
      console.error('Gagal membuat pembayaran:', err);
      if (err && err.message) {
        setErr(err.message);
      } else {
        setErr('Terjadi kesalahan saat memproses pembayaran.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Catat Pembayaran" />

      <div className="px-[18px]">
        <Card flat>
          <div className="font-bold text-ink">
            Kamar {bill.room} · {getTenantNameByRoom(bill.room)}
          </div>
          <div className="text-[13px] text-mute">Sisa tagihan</div>
          <div className="text-[30px] font-extrabold tracking-tight text-ink">
            {rp(remaining)}
          </div>
        </Card>

        <form onSubmit={handleSave}>
          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Jumlah pembayaran
            </label>
            <input
              inputMode="numeric"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              placeholder="Rp"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
            />
          </div>

          {err && <div className="text-bad text-[13px] mb-2">{err}</div>}

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Metode
            </label>
            <div className="flex gap-[8px]">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="method"
                  value="Cash"
                  checked={method === 'Cash'}
                  onChange={() => setMethod('Cash')}
                  className="hidden"
                />
                <span
                  className={`block text-center border rounded-[12px] p-[12px] font-semibold ${
                    method === 'Cash'
                      ? 'bg-brand-soft border-brand text-brand-dark'
                      : 'bg-card border-line text-ink'
                  }`}
                >
                  Cash
                </span>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="method"
                  value="Transfer"
                  checked={method === 'Transfer'}
                  onChange={() => setMethod('Transfer')}
                  className="hidden"
                />
                <span
                  className={`block text-center border rounded-[12px] p-[12px] font-semibold ${
                    method === 'Transfer'
                      ? 'bg-brand-soft border-brand text-brand-dark'
                      : 'bg-card border-line text-ink'
                  }`}
                >
                  Transfer
                </span>
              </label>
            </div>
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Tanggal
            </label>
            <input
              type="date"
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="mb-[14px]">
            <label className="block text-[13px] font-semibold mb-[6px] text-ink">
              Catatan (opsional)
            </label>
            <input
              className="w-full border border-line bg-card rounded-[12px] p-[12px_14px] outline-none focus:outline-2 focus:outline-brand"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Pembayaran'}
          </Button>
        </form>
      </div>
    </div>
  );
}
