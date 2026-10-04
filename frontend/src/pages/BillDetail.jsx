import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, rp, fd, paid, left, st } from '../context/AppContext';
import Header from '../components/Header';
import { Card, Badge, Button } from '../components/UIComponents';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bills, deletePayment, getTenantNameByRoom } = useApp();

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

  const tenantName = getTenantNameByRoom(bill.room);
  const billStatus = st(bill);
  const remaining = left(bill);

  return (
    <div>
      <Header title="Detail Tagihan" />

      <div className="px-[18px]">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold text-[20px] text-ink">Kamar {bill.room}</div>
            <div className="text-mute text-[13px]">{tenantName}</div>
          </div>
          <Badge status={billStatus} />
        </div>

        <Card flat className="mt-[14px] space-y-0 divide-y divide-line">
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Periode</span>
            <span className="font-semibold text-ink">{bill.per}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Jatuh tempo</span>
            <span className="font-semibold text-ink">{fd(bill.due)}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Total tagihan</span>
            <span className="font-semibold text-ink">{rp(bill.amt)}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Sudah dibayar</span>
            <span className="font-semibold text-ink">{rp(paid(bill))}</span>
          </div>
          <div className="flex justify-between py-[10px]">
            <span className="text-mute">Sisa</span>
            <span className={`font-semibold ${remaining > 0 ? 'text-bad' : 'text-ok'}`}>
              {rp(remaining)}
            </span>
          </div>
        </Card>

        <h2 className="text-[13px] font-bold text-mute mt-[22px] mb-[8px]">
          Riwayat pembayaran
        </h2>
        {bill.pay.length > 0 ? (
          bill.pay.map((p, i) => (
            <Card key={i} flat>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-ink">{fd(p.d)}</div>
                  <div className="text-[13px] text-mute">{p.m}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-ink">{rp(p.amt)}</div>
                  <button
                    className="w-[42px] h-[42px] border-0 bg-transparent rounded-[12px] text-[18px] cursor-pointer flex items-center justify-center text-ink active:bg-gray-soft"
                    aria-label="Hapus pembayaran"
                    onClick={() => deletePayment(bill.id, i)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-mute text-sm mb-4">Belum ada pembayaran.</p>
        )}

        {remaining > 0 && (
          <Button onClick={() => navigate(`/keuangan/tagihan/${bill.id}/bayar`)}>
            + Catat Pembayaran
          </Button>
        )}
      </div>
    </div>
  );
}
