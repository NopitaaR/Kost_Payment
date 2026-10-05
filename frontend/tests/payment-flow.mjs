// Test alur pembayaran frontend (Phase 3F).
// Menjalankan modul API client + auth yang sama dengan aplikasi React,
// dengan shim window/localStorage di Node, terhadap backend yang sedang berjalan.
//
// Jalankan: node tests/payment-flow.mjs

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

const { getToken, setToken, clearToken, api, ApiError, setOnSessionExpired } = await import(
  '../src/api/client.js'
);
const { login, getMe, logout } = await import('../src/api/auth.js');
const { getProperties } = await import('../src/api/properties.js');
const { getBills, getBill, createBill, generateBills } = await import('../src/api/bills.js');
const { createPayment, getPayments } = await import('../src/api/payments.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAILED: ${message}`);
    failed++;
  }
}

async function main() {
  console.log('=== FRONTEND PAYMENT FLOW TESTS (Phase 3F) ===');
  console.log(`Target backend: ${API_ORIGIN}\n`);

  try {
    // Login
    console.log('--- Login dengan kredensial benar ---');
    const user = await login('pemilik@kost.id', 'rahasia123');
    assert(!!user, 'Login berhasil dan mengembalikan data user');
    const token = getToken();
    assert(!!token, 'Token JWT tersimpan di storage');

    // Get active property ID
    console.log('--- Mendapatkan activePropertyId ---');
    const properties = await getProperties();
    assert(Array.isArray(properties), 'Endpoint properties berhasil');
    assert(properties.length > 0, 'Ada setidaknya satu property');
    const propertyId = properties[0].id;
    // Simulasi penyimpanan activePropertyId ke localStorage (seperti setelah memilih rumah)
    localStorage.setItem('kost.activePropertyId', propertyId);
    assert(localStorage.getItem('kost.activePropertyId') === propertyId, 'activePropertyId disimpan di localStorage');

    // Get bills
    console.log('--- GET /properties/:propertyId/bills ---');
    const billsResp = await getBills(propertyId);
    assert(billsResp.success, 'Endpoint berhasil');
    assert(Array.isArray(billsResp.data), 'Response data adalah array');
    const bills = billsResp.data;
    assert(bills.length > 0, 'Ada setidaknya satu tagihan');
    console.log(`      Jumlah tagihan: ${bills.length}`);

    // Find a bill that is not lunas (so we can test payment)
    let testBill = null;
    for (const b of bills) {
      // We need to check the status; the bill object from getBills has status? 
      // The getBills returns transformed bill objects that have status? 
      // Looking at bills.js, the getBills does not include status in the transformation (it only includes room, amt, due, per, pay, and keeps totalPaid, remaining, status if present).
      // Actually, the getBills transformation does not copy over status, totalPaid, remaining. 
      // Wait, we looked at bills.js earlier: the getBills transformation does not include status, totalPaid, remaining. 
      // However, the helper functions in AppContext use totalPaid and remaining if present, otherwise they compute from pay and amt.
      // But the bill object from getBills does not have totalPaid or remaining? 
      // Let's check the getBills function in bills.js: 
      //   It returns {...bill, room: ..., amt: ..., due: ..., per: ..., pay: []}
      //   It does NOT include totalPaid, remaining, status.
      // However, the API response from the backend for the bills list includes totalPaid, remaining, status? 
      // Looking at the backend routes for bills (we haven't seen it, but we can assume). 
      // Actually, we saw the bill detail API returns totalPaid, remaining, status in the bill object? 
      // In the paymentRoutes.js, when getting payments for a bill, they return the bill with totalPaid, remaining, status.
      // But for the bills list endpoint (in billsRoutes.js we haven't seen), we don't know.
      // However, we can use the getBill endpoint to get the detail of a bill, which includes totalPaid, remaining, status.
      // So for simplicity, we will use getBill to get the bill detail and check its status.
      // But we want to avoid making too many requests. We can pick a bill and then get its detail.
      // Since we are going to test payment on a specific bill, we will get its detail first.
      // We'll do that after we pick a bill candidate.
      testBill = b;
      break;
    }
    assert(testBill !== null, 'Ada tagihan yang dapat dipakai untuk uji pembayaran');
    const billId = testBill.id;

    // Get bill detail to see current status and remaining
    console.log('--- GET /properties/:propertyId/bills/:billId (detail) ---');
    const billDetailResp = await getBill(propertyId, billId);
    assert(billDetailResp.success, 'Endpoint detail berhasil');
    const bill = billDetailResp.data;
    assert(bill.id === billId, 'ID tagihan sesuai');
    const initialRemaining = bill.remaining; // from the transformed bill detail
    const initialStatus = bill.status;
    console.log(`      Tagihan ID: ${billId}, Sisa: ${initialRemaining}, Status: ${initialStatus}`);

    // Ensure the bill is not lunas so we can test payment
    assert(initialStatus !== 'LUNAS', 'Tagihan harus belum lunas untuk uji pembayaran');

    // Test creating a valid payment
    console.log('--- POST /properties/:propertyId/bills/:billId/payments (pembayaran valid) ---');
    const paymentAmount = Math.min(initialRemaining, 50000); // pagar sebagian atau seluruhnya, tetapi tidak melebihi sisa
    const paymentData = {
      d: '2026-10-04', // tanggal hari ini sesuai dengan TODAY di AppContext
      amt: paymentAmount,
      m: 'Transfer', // metode
      note: 'Test pembayaran otomatis',
    };
    const createPaymentResp = await createPayment(propertyId, billId, paymentData);
    assert(createPaymentResp.success, 'Pembayaran berhasil dibuat');
    assert(createPaymentResp.data.payment.id, 'Pembayaran memiliki ID');
    assert(createPaymentResp.data.payment.amount === paymentAmount, 'Nomor pembayaran sesuai');
    assert(createPaymentResp.data.payment.method === 'TRANSFER', 'Metode pembayaran sesuai (huruf besar)');
    assert(createPaymentResp.data.payment.notes === paymentData.note, 'Catatan pembayaran sesuai');
    console.log(`      Pembayaran berhasil: ID ${createPaymentResp.data.payment.id}`);

    // Verify the bill was updated correctly
    console.log('--- Memverifikasi pembaruan tagihan setelah pembayaran ---');
    const billAfterResp = await getBill(propertyId, billId);
    assert(billAfterResp.success, 'Mendapatkan tagihan setelah pembayaran berhasil');
    const billAfter = billAfterResp.data;
    const expectedTotalPaid = (bill.totalPaid || 0) + paymentAmount;
    const expectedRemaining = Math.max(0, bill.amount - expectedTotalPaid);
    const expectedStatus = calculateBillStatusFromAPI(bill.amount, expectedTotalPaid, bill.dueDate);
    assert(billAfter.totalPaid === expectedTotalPaid, `Total paid sesuai: ${billAfter.totalPaid}`);
    assert(billAfter.remaining === expectedRemaining, `Sisa tagihan sesuai: ${billAfter.remaining}`);
    assert(billAfter.status === expectedStatus, `Status tagihan sesuai: ${billAfter.status}`);
    console.log(`      Tagihan setelah pembayaran: Total paid ${billAfter.totalPaid}, Sisa ${billAfter.remaining}, Status ${billAfter.status}`);

    // Test duplicate payment (should be allowed as long as amount <= remaining)
    console.log('--- Pembayaran kedua (jika masih ada sisa) ---');
    if (billAfter.remaining > 0) {
      const paymentAmount2 = Math.min(billAfter.remaining, 30000);
      const paymentData2 = {
        d: '2026-10-04',
        amt: paymentAmount2,
        m: 'Cash',
        note: 'Pembayaran kedua',
      };
      const createPaymentResp2 = await createPayment(propertyId, billId, paymentData2);
      assert(createPaymentResp2.success, 'Pembayaran kedua berhasil dibuat');
      const billAfter2Resp = await getBill(propertyId, billId);
      assert(billAfter2Resp.success, 'Mendapatkan tagihan setelah pembayaran kedua berhasil');
      const billAfter2 = billAfter2Resp.data;
      const expectedTotalPaid2 = billAfter.totalPaid + paymentAmount2;
      const expectedRemaining2 = Math.max(0, bill.amount - expectedTotalPaid2);
      const expectedStatus2 = calculateBillStatusFromAPI(bill.amount, expectedTotalPaid2, bill.dueDate);
      assert(billAfter2.totalPaid === expectedTotalPaid2, `Total paid setelah kedua sesuai`);
      assert(billAfter2.remaining === expectedRemaining2, `Sisa setelah kedua sesuai`);
      assert(billAfter2.status === expectedStatus2, `Status setelah kedua sesuai`);
      console.log(`      Pembayaran kedua berhasil: sisa sekarang ${billAfter2.remaining}`);
    } else {
      console.log('      Tagihan sudah lunas setelah pembayaran pertama, melewati uji pembayaran kedua');
    }

    // Test invalid payment: amount > remaining
    console.log('--- Pembayaran dengan jumlah melebihi sisa (harus gagal) ---');
    const invalidAmount = billAfter.remaining + 1; // pasti melebihi sisa
    try {
      await createPayment(propertyId, billId, {
        d: '2026-10-04',
        amt: invalidAmount,
        m: 'Cash',
        note: 'Test jumlah terlalu besar',
      });
      assert(false, 'Harusnya gagal karena jumlah melebihi sisa');
    } catch (err) {
      assert(err instanceof ApiError && (err.status === 400 || err.status === 422), 'Mendapatkan error 400/422');
      console.log(`      Benarnya ditolak: ${err.message}`);
    }

    // Test invalid payment: amount <= 0
    console.log('--- Pembayaran dengan jumlah nol atau negatif (harus gagal) ---');
    try {
      await createPayment(propertyId, billId, {
        d: '2026-10-04',
        amt: 0,
        m: 'Cash',
        note: 'Test jumlah nol',
      });
      assert(false, 'Harusnya gagal karena jumlah nol');
    } catch (err) {
      assert(err instanceof ApiError && (err.status === 400 || err.status === 422), 'Mendapatkan error 400/422');
      console.log(`      Benarnya ditolak: ${err.message}`);
    }

    // Test invalid payment: invalid method
    console.log('--- Pembayaran dengan metode tidak valid (harus gagal) ---');
    try {
      await createPayment(propertyId, billId, {
        d: '2026-10-04',
        amt: 1000,
        m: 'InvalidMethod',
        note: 'Test metode salah',
      });
      assert(false, 'Harusnya gagal karena metode tidak valid');
    } catch (err) {
      assert(err instanceof ApiError && (err.status === 400 || err.status === 422), 'Mendapatkan error 400/422');
      console.log(`      Benarnya ditolak: ${err.message}`);
    }

    // Test getPayments endpoint (optional)
    console.log('--- GET /properties/:propertyId/bills/:billId/payments (histori pembayaran) ---');
    const getPaymentsResp = await getPayments(propertyId, billId);
    assert(getPaymentsResp.success, 'Endpoint histori pembayaran berhasil');
    assert(Array.isArray(getPaymentsResp.data), 'Data histori pembayaran adalah array');
    // We expect at least the payments we just made
    const paymentsCount = getPaymentsResp.data.length;
    assert(paymentsCount >= 1, 'Harusnya ada setidaknya satu pembayaran');
    console.log(`      Jumlah histori pembayaran: ${paymentsCount}`);

    // Test build
    console.log('--- Build verifikasi ---');
    const { exec } = await import('child_process');
    const buildPromise = new Promise((resolve, reject) => {
      exec('npm run build', { cwd: '..' }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
    try {
      const { stdout, stderr } = await buildPromise;
      assert((stdout + stderr).includes('built in'), 'Build berhasil tanpa error');
      console.log('      Build berhasil');
    } catch (err) {
      assert(false, `Build gagal: ${err.message}`);
    }

  } catch (err) {
    console.error('Error tidak terduga:', err);
    failed++;
  }

  console.log(`\n=================================`);
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log(`=================================`);

  // Return exit code
  process.exit(failed === 0 ? 0 : 1);
}

// Helper function to calculate bill status from amount, totalPaid, and dueDate (mirroring backend)
function calculateBillStatusFromAPI(amount, totalPaid, dueDateStr) {
  const remaining = amount - totalPaid;
  if (remaining <= 0) {
    return 'LUNAS';
  }
  if (totalPaid > 0) {
    return 'SEBAGIAN';
  }
  const now = new Date('2026-10-04'); // sesuai dengan TOTAppContext.jsx
  const due = new Date(dueDateStr);
  if (now > due) {
    return 'TERLAMBAT';
  }
  return 'BELUM_BAYAR';
}

main();
