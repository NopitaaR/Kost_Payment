import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp, rp, fd, paid, left, st } from '../context/AppContext';
import { getPayments, deletePayment } from '../api/payments';
import Header from '../components/Header';
import { Card, Badge, Button } from '../components/UIComponents';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bills, getTenantNameByRoom, activePropertyId, fetchBillDetail, confirmDialog, showToast } = useApp();

  // Bill ID adalah UUID string, jangan dikonversi dengan Number().
  const billId = id;
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');

  useEffect(() => {
    if (activePropertyId && billId) {
      fetchBillDetail(activePropertyId, billId);
      fetchPayments();
    }
  }, [activePropertyId, billId, fetchBillDetail]);

  const fetchPayments = async () => {
    if (!activePropertyId || !billId) return;
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      const response = await getPayments(activePropertyId, billId);
      if (response && response.success) {
        setPayments(response.data || []);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error('Gagal mengambil riwayat pembayaran:', err);
      setPayments([]);
      if (err.message) {
        setPaymentsError(err.message);
      } else {
        setPaymentsError('Gagal memuat riwayat pembayaran.');
      }
    } finally {
      setPaymentsLoading(false);
    }
  };

  const handleDeletePayment = (payment) => {
    const paymentId = payment.id;
    if (!paymentId) return;

    confirmDialog(
      'Hapus pembayaran?',
      `Pembayaran ${rp(payment.amount || payment.amt)} (${payment.method || payment.m}, ${fd(payment.paymentDate || payment.d)}) akan dihapus. Sisa tagihan akan bertambah dan status tagihan bisa berubah.`,
      'Ya, hapus',
      async () => {
        try {
          const res = await deletePayment(activePropertyId, billId, paymentId);
          if (res && res.success) {
            showToast('Pembayaran dihapus');
            // Refresh detail tagihan dan daftar riwayat pembayaran
            await fetchBillDetail(activePropertyId, billId);
            await fetchPayments();
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

  const bill = bills.find((b) => String(b.id) === String(billId));

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
        {paymentsLoading ? (
          <p className="text-mute text-sm mb-4">Memuat riwayat pembayaran...</p>
        ) : paymentsError ? (
          <p className="text-bad text-sm mb-4">{paymentsError}</p>
        ) : (
          payments.length > 0 ? (
            payments.map((p) => (
              <Card key={p.id || p.paymentDate} flat>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-ink">{fd(p.paymentDate || p.d)}</div>
                    <div className="text-[13px] text-mute">{p.method || p.m}</div>
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
          ) : (
            <p className="text-mute text-sm mb-4">Belum ada pembayaran.</p>
          )
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
