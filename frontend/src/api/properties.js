import { api } from './client.js';

// GET /api/v1/properties
// Mengembalikan daftar rumah milik user yang sedang login.
// Response: { success, data: [{ id, name, totalRooms, filledRooms, emptyRooms, activeTenants }] }
export async function getProperties() {
  const payload = await api.get('/properties');
  return payload?.data || [];
}

// PUT /api/v1/properties/:propertyId/name
// Update nama rumah
export async function updatePropertyName(propertyId, name) {
  const payload = await api.put(`/properties/${propertyId}/name`, { name });
  return payload;
}
