import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, rp, left } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Button } from '../components/UIComponents';

export default function PaymentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bills, savePayment, getTenantNameByRoom } = useApp();

  const billId = Number(id);
  const bill = bills.find((b) => b.id === billId);

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

  const [amt, setAmt] = useState(remaining);
  const [method, setMethod] = useState('Cash');
  const [date, setDate] = useState('2026-10-04');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const handleSave = (e) => {
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

    savePayment(bill.id, { d: date, amt: cleanAmt, m: method, note });
    navigate(-1);
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

          <Button type="submit">Simpan Pembayaran</Button>
        </form>
      </div>
    </div>
  );
}
