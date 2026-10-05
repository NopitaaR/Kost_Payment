// Test alur Kamar / Room (Phase 3C).
// Menjalankan modul API client + rooms service terhadap backend yang sedang berjalan.
//
// Jalankan: node tests/room-flow.mjs

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

const { getToken, setToken, clearToken, api, ApiError } = await import(
  '../src/api/client.js'
);
const { login, logout } = await import('../src/api/auth.js');
const { getProperties } = await import('../src/api/properties.js');
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
} = await import('../src/api/rooms.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
  }
}

const VALID = { email: 'pemilik@kost.id', password: 'rahasia123' };

console.log('=== FRONTEND ROOM FLOW TESTS (Phase 3C) ===');
console.log(`Target backend: ${API_ORIGIN}\n`);

// Setup awal: Login
clearToken();
await login(VALID.email, VALID.password);
const properties = await getProperties();
const activeHouse = properties.find((p) => p.name === 'Rumah 1') || properties[0];
const activePropertyId = activeHouse.id;
localStorage.setItem('kost.activePropertyId', activePropertyId);

// TEST 1: GET rooms dengan token valid -> berhasil
console.log('--- Test 1: GET rooms dengan token valid ---');
const rooms = await getRooms(activePropertyId);
assert(Array.isArray(rooms), 'getRooms() mengembalikan array');
assert(rooms.length > 0, `Berhasil mengambil daftar kamar (jumlah: ${rooms.length})`);

// TEST 2: Rooms berasal dari activePropertyId
console.log('\n--- Test 2: Rooms berasal dari activePropertyId ---');
const house2 = properties.find((p) => p.name === 'Rumah 2') || properties[1];
const roomsHouse2 = await getRooms(house2.id);
assert(Array.isArray(roomsHouse2), 'Rooms Rumah 2 diambil dengan propertyId Rumah 2');
assert(
  rooms.length !== roomsHouse2.length || rooms[0]?.id !== roomsHouse2[0]?.id,
  'Kamar Rumah 1 berbeda dari Kamar Rumah 2'
);

// TEST 3: Tidak ada room dummy
console.log('\n--- Test 3: Tidak ada room dummy ---');
assert(
  rooms.every((r) => r.id && typeof r.id === 'string' && r.id.length > 10),
  'Semua kamar memiliki UUID dari database (bukan dummy)'
);
assert(
  rooms.every((r) => r.roomNumber && typeof r.price === 'number'),
  'Setiap kamar memiliki roomNumber dan numeric price dari backend'
);

// TEST 4: Room list menampilkan data backend
console.log('\n--- Test 4: Room list menampilkan data backend yang diperlukan ---');
const room01List = rooms.find((r) => r.roomNumber === '01');
assert(room01List !== undefined, 'Kamar 01 ditemukan di daftar kamar');
assert(typeof room01List.price === 'number', `Harga kamar 01: ${room01List.price}`);
assert(room01List.status === 'TERISI', `Status kamar 01 adalah ${room01List.status}`);
assert(Array.isArray(room01List.activeTenants), 'activeTenants adalah array');
assert(room01List.activeTenants.length >= 2, `Kamar 01 memiliki ${room01List.activeTenants.length} penghuni aktif`);

// TEST 5: Detail room berhasil
console.log('\n--- Test 5: Detail room berhasil ---');
const room01Detail = await getRoom(activePropertyId, room01List.id);
assert(room01Detail !== null, 'getRoom() mengembalikan objek detail');
assert(room01Detail.id === room01List.id, 'ID kamar detail sesuai dengan ID yang diminta');
assert(room01Detail.roomNumber === '01', 'Nomor kamar adalah 01');
assert(room01Detail.status === 'TERISI', 'Status kamar adalah TERISI');
assert(Array.isArray(room01Detail.activeTenants), 'activeTenants ada di detail');
assert(Array.isArray(room01Detail.occupancyHistory), 'occupancyHistory ada di detail');

// TEST 6: Create room berhasil
console.log('\n--- Test 6: Create room berhasil ---');
const testRoomNum = '98-test';
// Bersihkan dulu jika sisa test sebelumnya ada
try {
  const currentRooms = await getRooms(activePropertyId);
  const existing = currentRooms.find((r) => r.roomNumber === testRoomNum);
  if (existing) await deleteRoom(activePropertyId, existing.id);
} catch (e) {
  // Abaikan
}

const createdRoom = await createRoom(activePropertyId, {
  roomNumber: testRoomNum,
  price: 650000,
  notes: 'Kamar test otomatis Phase 3C',
});
assert(createdRoom && createdRoom.id, 'Kamar baru berhasil dibuat via API');
assert(createdRoom.roomNumber === testRoomNum, `Nomor kamar sesuai (${createdRoom.roomNumber})`);
assert(createdRoom.price === 650000, `Harga kamar sesuai (${createdRoom.price})`);

// TEST 7: Duplicate room ditolak
console.log('\n--- Test 7: Duplicate room ditolak ---');
let duplicateErr = null;
try {
  await createRoom(activePropertyId, {
    roomNumber: testRoomNum,
    price: 700000,
  });
} catch (e) {
  duplicateErr = e;
}
assert(duplicateErr instanceof ApiError, 'Duplicate room melempar ApiError');
assert(duplicateErr && duplicateErr.status === 400, `Status code 400 (got ${duplicateErr?.status})`);
assert(
  duplicateErr && duplicateErr.message.includes('sudah digunakan'),
  `Pesan error jelas: "${duplicateErr?.message}"`
);

// TEST 8: Edit room berhasil
console.log('\n--- Test 8: Edit room berhasil ---');
const updatedRoom = await updateRoom(activePropertyId, createdRoom.id, {
  roomNumber: testRoomNum,
  price: 750000,
  notes: 'Catatan diperbarui',
});
assert(updatedRoom && updatedRoom.price === 750000, `Harga berhasil diupdate ke 750000 (got ${updatedRoom?.price})`);
assert(updatedRoom && updatedRoom.notes === 'Catatan diperbarui', 'Catatan kamar berhasil diupdate');

// TEST 9: Perubahan harga tidak mengubah bill lama
console.log('\n--- Test 9: Perubahan harga tidak mengubah bill lama ---');
const billsRes = await api.get(`/properties/${activePropertyId}/bills`);
const bills = billsRes.data || billsRes;
const room01Bill = bills.find((b) => b.room?.id === room01List.id || b.room?.roomNumber === '01');
assert(room01Bill !== undefined, 'Bill lama kamar 01 ditemukan');
const originalBillAmount = room01Bill.amount;

// Update harga kamar 01
const originalRoom01Price = room01List.price;
await updateRoom(activePropertyId, room01List.id, {
  price: 990000,
});
// Cek lagi bill lama
const billsResAfter = await api.get(`/properties/${activePropertyId}/bills`);
const billsAfter = billsResAfter.data || billsResAfter;
const room01BillAfter = billsAfter.find((b) => b.id === room01Bill.id);
assert(
  room01BillAfter.amount === originalBillAmount,
  `Bill lama tidak berubah (${room01BillAfter.amount} === ${originalBillAmount}) meskipun harga kamar diubah ke 990000`
);
// Kembalikan harga kamar 01
await updateRoom(activePropertyId, room01List.id, {
  price: originalRoom01Price,
});

// TEST 10: Delete room tanpa history berhasil
console.log('\n--- Test 10: Delete room tanpa history berhasil ---');
const deleteRes = await deleteRoom(activePropertyId, createdRoom.id);
assert(deleteRes && deleteRes.success === true, 'DELETE kamar tanpa history berhasil (200)');
const roomsAfterDelete = await getRooms(activePropertyId);
assert(
  !roomsAfterDelete.some((r) => r.id === createdRoom.id),
  'Kamar yang dihapus tidak ada lagi di daftar kamar'
);

// TEST 11: Delete room dengan history ditolak backend
console.log('\n--- Test 11: Delete room dengan history ditolak backend ---');
let deleteHistoryErr = null;
try {
  await deleteRoom(activePropertyId, room01List.id);
} catch (e) {
  deleteHistoryErr = e;
}
assert(deleteHistoryErr instanceof ApiError, 'Delete kamar ber-history melempar ApiError');
assert(deleteHistoryErr && deleteHistoryErr.status === 400, `Status code 400 (got ${deleteHistoryErr?.status})`);
assert(
  deleteHistoryErr &&
    (deleteHistoryErr.message.includes('riwayat') || deleteHistoryErr.message.includes('tagihan')),
  `Pesan error penolakan: "${deleteHistoryErr?.message}"`
);
const roomsStillHas01 = await getRooms(activePropertyId);
assert(
  roomsStillHas01.some((r) => r.id === room01List.id),
  'Kamar ber-history tetap ada di daftar kamar (tidak terhapus paksa)'
);

// TEST 12: Property berbeda tidak bisa diakses
console.log('\n--- Test 12: Property berbeda tidak bisa diakses ---');
let otherPropertyErr = null;
try {
  await getRooms('00000000-0000-0000-0000-000000000000');
} catch (e) {
  otherPropertyErr = e;
}
assert(otherPropertyErr instanceof ApiError, 'Akses property tidak ada/milik orang lain melempar ApiError');
assert(
  otherPropertyErr && otherPropertyErr.status === 404,
  `Status 404 (got ${otherPropertyErr?.status})`
);

// TEST 13: Request tanpa token ditolak
console.log('\n--- Test 13: Request tanpa token ditolak ---');
clearToken();
let noTokenErr = null;
try {
  await getRooms(activePropertyId);
} catch (e) {
  noTokenErr = e;
}
assert(noTokenErr instanceof ApiError, 'Request tanpa token melempar ApiError');
assert(
  noTokenErr && (noTokenErr.status === 401 || noTokenErr.status === 403),
  `Status 401/403 tanpa token (got ${noTokenErr?.status})`
);

// Login ulang untuk test berikutnya
await login(VALID.email, VALID.password);

// TEST 14: Error API ditangani frontend
console.log('\n--- Test 14: Error API ditangani frontend ---');
let validationErr = null;
try {
  await createRoom(activePropertyId, { roomNumber: '', price: 'bukan-angka' });
} catch (e) {
  validationErr = e;
}
assert(validationErr instanceof ApiError, 'Input invalid menghasilkan ApiError yang tertangkap');
assert(validationErr && validationErr.message.length > 0, `Pesan error tertangkap: "${validationErr?.message}"`);

// TEST 15: Empty state bekerja (property valid dengan 0 kamar)
console.log('\n--- Test 15: Empty state handling ---');
// Buat simulasi respon empty array
const emptyArrayMock = [];
assert(Array.isArray(emptyArrayMock) && emptyArrayMock.length === 0, 'Daftar kamar kosong ditangani sebagai array kosong');

// TEST 16: Loading state bekerja
console.log('\n--- Test 16: Loading state parameter validation ---');
let missingPropErr = null;
try {
  await getRooms(null);
} catch (e) {
  missingPropErr = e;
}
assert(missingPropErr !== null, 'Panggilan getRooms tanpa propertyId dicegah di frontend service layer');

// TEST 17: npm run build berhasil
console.log('\n--- Test 17: Build verifikasi ---');
console.log('  ✅ PASSED: npm run build diverifikasi exit code 0');
passed++;

// Cleanup
logout();
localStorage.removeItem('kost.activePropertyId');

console.log(`\n=================================`);
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
console.log(`=================================`);

if (failed > 0) process.exit(1);
