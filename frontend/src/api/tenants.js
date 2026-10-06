import { api } from './client.js';

// GET /api/v1/properties/:propertyId/tenants
// Mengambil daftar penghuni pada properti aktif dengan filter status dan search opsional
export async function getTenants(propertyId, { status, search } = {}) {
  if (!propertyId) {
    throw new Error('Property ID wajib disediakan.');
  }

  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;

  const payload = await api.get(`/properties/${propertyId}/tenants`, { params });
  return payload?.data || [];
}

// GET /api/v1/properties/:propertyId/tenants/:tenantId
// Mengambil detail penghuni beserta histori huniannya
export async function getTenant(propertyId, tenantId) {
  if (!propertyId || !tenantId) {
    throw new Error('Property ID dan Tenant ID wajib disediakan.');
  }
  const payload = await api.get(`/properties/${propertyId}/tenants/${tenantId}`);
  return payload?.data || null;
}

// POST /api/v1/properties/:propertyId/tenants
// Menambah penghuni baru dan otomatis membuat occupancy AKTIF
export async function createTenant(propertyId, {
  name,
  phone,
  originAddress,
  occupation,
  moveInDate,
  roomId,
  ktpPhoto,
  notes,
}) {
  if (!propertyId) {
    throw new Error('Property ID wajib disediakan.');
  }

  const payload = await api.post(`/properties/${propertyId}/tenants`, {
    name,
    phone,
    originAddress,
    occupation,
    moveInDate,
    roomId,
    ktpPhoto: ktpPhoto || null,
    notes: notes || null,
  });

  return payload?.data || null;
}

// PUT /api/v1/properties/:propertyId/tenants/:tenantId
// Mengupdate data dasar penghuni (nama, nomor HP, alamat, pekerjaan, tanggal masuk)
export async function updateTenant(propertyId, tenantId, data) {
  if (!propertyId || !tenantId) {
    throw new Error('Property ID dan Tenant ID wajib disediakan.');
  }

  const payload = await api.put(`/properties/${propertyId}/tenants/${tenantId}`, data);
  return payload?.data || null;
}

// POST /api/v1/properties/:propertyId/tenants/:tenantId/move
// Memindahkan penghuni ke kamar lain
export async function moveTenant(propertyId, tenantId, { newRoomId, moveDate }) {
  if (!propertyId || !tenantId) {
    throw new Error('Property ID dan Tenant ID wajib disediakan.');
  }

  const payload = await api.post(`/properties/${propertyId}/tenants/${tenantId}/move`, {
    newRoomId,
    moveDate,
  });

  return payload;
}

// POST /api/v1/properties/:propertyId/tenants/:tenantId/exit
// Mencatat penghuni keluar dari kost
export async function exitTenant(propertyId, tenantId, { exitDate }) {
  if (!propertyId || !tenantId) {
    throw new Error('Property ID dan Tenant ID wajib disediakan.');
  }

  const payload = await api.post(`/properties/${propertyId}/tenants/${tenantId}/exit`, {
    exitDate,
  });

  return payload;
}

// GET /api/v1/properties/:propertyId/occupancies
// Mengambil histori hunian properti
export async function getOccupancies(propertyId, { roomId, tenantId, status } = {}) {
  if (!propertyId) {
    throw new Error('Property ID wajib disediakan.');
  }

  const params = {};
  if (roomId) params.roomId = roomId;
  if (tenantId) params.tenantId = tenantId;
  if (status) params.status = status;

  const payload = await api.get(`/properties/${propertyId}/occupancies`, { params });
  return payload?.data || [];
}

// POST /api/v1/properties/:propertyId/tenants/upload-ktp
// Mengunggah file KTP via multipart FormData (draft / sebelum simpan)
export async function uploadKtp(propertyId, file) {
  if (!propertyId) {
    throw new Error('Property ID wajib disediakan.');
  }
  const formData = new FormData();
  formData.append('ktp', file);
  const payload = await api.post(`/properties/${propertyId}/tenants/upload-ktp`, formData);
  return payload?.data || null;
}

// POST /api/v1/properties/:propertyId/tenants/:tenantId/ktp
// Mengunggah / mengganti file KTP untuk tenant yang sudah ada
export async function uploadTenantKtp(propertyId, tenantId, file) {
  if (!propertyId || !tenantId) {
    throw new Error('Property ID dan Tenant ID wajib disediakan.');
  }
  const formData = new FormData();
  formData.append('ktp', file);
  const payload = await api.post(`/properties/${propertyId}/tenants/${tenantId}/ktp`, formData);
  return payload?.data || null;
}

// GET /api/v1/properties/:propertyId/tenants/:tenantId/ktp
// Mengambil blob gambar KTP terautentikasi
export async function getTenantKtpBlob(propertyId, tenantId) {
  if (!propertyId || !tenantId) {
    throw new Error('Property ID dan Tenant ID wajib disediakan.');
  }
  return await api.getBlob(`/properties/${propertyId}/tenants/${tenantId}/ktp`);
}
