import { api } from './client.js';

// GET /api/v1/properties/:propertyId/rooms
// Mengambil daftar semua kamar pada rumah yang aktif
export async function getRooms(propertyId) {
  if (!propertyId) {
    throw new Error('Property ID wajib disediakan.');
  }
  const payload = await api.get(`/properties/${propertyId}/rooms`);
  return payload?.data || [];
}

// GET /api/v1/properties/:propertyId/rooms/:roomId
// Mengambil detail kamar beserta penghuni aktif & riwayat hunian
export async function getRoom(propertyId, roomId) {
  if (!propertyId || !roomId) {
    throw new Error('Property ID dan Room ID wajib disediakan.');
  }
  const payload = await api.get(`/properties/${propertyId}/rooms/${roomId}`);
  return payload?.data || null;
}

// POST /api/v1/properties/:propertyId/rooms
// Menambah kamar baru
export async function createRoom(propertyId, { roomNumber, price, notes }) {
  if (!propertyId) {
    throw new Error('Property ID wajib disediakan.');
  }
  const payload = await api.post(`/properties/${propertyId}/rooms`, {
    roomNumber,
    price,
    notes: notes || '',
  });
  return payload?.data || null;
}

// PUT /api/v1/properties/:propertyId/rooms/:roomId
// Mengubah data kamar (nomor, harga, catatan). Perubahan harga tidak mengubah tagihan lama.
export async function updateRoom(propertyId, roomId, { roomNumber, price, notes }) {
  if (!propertyId || !roomId) {
    throw new Error('Property ID dan Room ID wajib disediakan.');
  }
  const payload = await api.put(`/properties/${propertyId}/rooms/${roomId}`, {
    roomNumber,
    price,
    notes: notes || '',
  });
  return payload?.data || null;
}

// DELETE /api/v1/properties/:propertyId/rooms/:roomId
// Menghapus kamar (akan ditolak oleh backend jika memiliki riwayat hunian atau tagihan)
export async function deleteRoom(propertyId, roomId) {
  if (!propertyId || !roomId) {
    throw new Error('Property ID dan Room ID wajib disediakan.');
  }
  const payload = await api.delete(`/properties/${propertyId}/rooms/${roomId}`);
  return payload;
}
