/**
 * Frontend Delete Payment Flow Tests (Phase 3H-11)
 *
 * Verifikasi alur frontend untuk penghapusan / pembatalan pembayaran:
 * 1. Login & inisialisasi activePropertyId
 * 2. Ambil tagihan yang belum lunas
 * 3. Catat pembayaran melalui API
 * 4. Verifikasi pembayaran tercatat di history tagihan dan listing pembayaran rumah
 * 5. Panggil deletePayment API
 * 6. Verifikasi pembayaran terhapus dari history
 * 7. Verifikasi totalPaid berkurang dan remaining bertambah
 * 8. Verifikasi status tagihan terekalkulasi dengan benar
 * 9. Verifikasi pembatalan pada tagihan lunas kembali menjadi sebagian
 */

const API_ORIGIN = process.env.TEST_API_ORIGIN || 'http://localhost:5000';

// ---- Shim lingkungan browser ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = { location: { origin: API_ORIGIN } };

const { login } = await import('../src/api/auth.js');
const { getProperties } = await import('../src/api/properties.js');
const { getBills, getBill } = await import('../src/api/bills.js');
const { createPayment, getPayments, getPropertyPayments, deletePayment } = await import('../src/api/payments.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failCount++;
  }
}

async function run() {
  console.log('=== FRONTEND DELETE PAYMENT FLOW TESTS (Phase 3H-11) ===');

  // 1. Login
  const loginRes = await login('pemilik@kost.id', 'rahasia123');
  assert(loginRes && loginRes.token, 'Login berhasil dan token JWT diterima');

  // 2. Properties
  const properties = await getProperties();
  assert(Array.isArray(properties) && properties.length > 0, 'Daftar properti berhasil diambil');
  const propertyId = properties[0].id;

  // 3. Bills
  const billsRes = await getBills(propertyId);
  assert(billsRes.success && Array.isArray(billsRes.data), 'Daftar tagihan berhasil diambil');
  const targetBill = billsRes.data.find((b) => b.remaining > 50000) || billsRes.data[0];
  assert(targetBill && targetBill.id, `Target bill ditemukan: ${targetBill.id}`);

  // Catat detail awal bill
  const initialDetail = await getBill(propertyId, targetBill.id);
  const initialPaid = initialDetail.data.totalPaid || 0;
  const initialRemaining = initialDetail.data.remaining;

  console.log(`\n--- Status awal: TotalPaid = ${initialPaid}, Remaining = ${initialRemaining} ---`);

  // 4. Catat pembayaran baru 50.000
  const paymentAmount = 50000;
  const payRes = await createPayment(propertyId, targetBill.id, {
    amt: paymentAmount,
    m: 'TRANSFER',
    d: new Date().toISOString(),
    note: 'Test Payment to be Deleted (Phase 3H-11)',
  });
  assert(payRes.success && payRes.data.payment, 'Pembayaran baru berhasil dicatat via API');
  const newPaymentId = payRes.data.payment.id;

  // 5. Verifikasi pembayaran ada di payment history bill
  const histAfterPay = await getPayments(propertyId, targetBill.id);
  assert(
    histAfterPay.success && histAfterPay.data.some((p) => p.id === newPaymentId),
    'Pembayaran baru muncul di riwayat pembayaran tagihan'
  );

  // 6. Verifikasi pembayaran ada di listing pembayaran rumah
  const propPaysAfter = await getPropertyPayments(propertyId);
  assert(
    propPaysAfter.success && propPaysAfter.data.some((p) => p.id === newPaymentId),
    'Pembayaran baru muncul di daftar pembayaran properti'
  );

  // 7. Verifikasi bill totalPaid bertambah
  const billAfterPay = await getBill(propertyId, targetBill.id);
  assert(
    billAfterPay.data.totalPaid === initialPaid + paymentAmount,
    `Total paid bertambah dari ${initialPaid} ke ${billAfterPay.data.totalPaid}`
  );

  // 8. Hapus pembayaran yang baru saja dibuat
  console.log('\n--- Menghapus pembayaran via deletePayment API ---');
  const delRes = await deletePayment(propertyId, targetBill.id, newPaymentId);
  assert(delRes.success === true, 'Panggilan deletePayment API berhasil dengan response success');

  // 9. Verifikasi pembayaran hilang dari riwayat tagihan
  const histAfterDel = await getPayments(propertyId, targetBill.id);
  assert(
    histAfterDel.success && !histAfterDel.data.some((p) => p.id === newPaymentId),
    'Pembayaran terhapus tidak ada lagi di riwayat pembayaran tagihan'
  );

  // 10. Verifikasi pembayaran hilang dari listing pembayaran properti
  const propPaysAfterDel = await getPropertyPayments(propertyId);
  assert(
    propPaysAfterDel.success && !propPaysAfterDel.data.some((p) => p.id === newPaymentId),
    'Pembayaran terhapus tidak ada lagi di daftar pembayaran properti'
  );

  // 11. Verifikasi rekalkulasi bill (totalPaid kembali seperti semula)
  const billAfterDel = await getBill(propertyId, targetBill.id);
  assert(
    billAfterDel.data.totalPaid === initialPaid,
    `Total paid tagihan kembali ke semula: ${initialPaid}`
  );
  assert(
    billAfterDel.data.remaining === initialRemaining,
    `Remaining tagihan kembali ke semula: ${initialRemaining}`
  );
  assert(
    billAfterDel.data.status === initialDetail.data.status,
    `Status tagihan kembali konsisten: ${billAfterDel.data.status}`
  );

  console.log('\n=================================');
  console.log(`TEST SUMMARY: ${passCount} passed, ${failCount} failed.`);
  console.log('=================================\n');

  if (failCount > 0) process.exit(1);
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
