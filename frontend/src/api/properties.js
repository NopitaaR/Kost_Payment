import { api } from './client.js';

// GET /api/v1/properties
// Mengembalikan daftar rumah milik user yang sedang login.
// Response: { success, data: [{ id, name, totalRooms, filledRooms, emptyRooms, activeTenants }] }
export async function getProperties() {
  const payload = await api.get('/properties');
  return payload?.data || [];
}
