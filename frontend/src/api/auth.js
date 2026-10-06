import { api, setToken, clearToken } from './client.js';

// POST /api/v1/auth/login
// Backend mengembalikan { success, token, user }
export async function login(email, password) {
  const payload = await api.post(
    '/auth/login',
    { email, password },
    { requireAuth: false }
  );

  if (payload && payload.token) setToken(payload.token);

  return {
    token: payload?.token,
    user: payload?.user || null,
  };
}

// PUT /api/v1/auth/profile
// Update profile data pemilik (nama, email, hp)
export async function updateProfile(profileData) {
  const payload = await api.put(
    '/auth/profile',
    profileData,
    { requireAuth: true }
  );
  return payload;
}

// POST /api/v1/auth/change-password
// Ganti password untuk user yang terautentikasi
export async function changePassword(oldPassword, newPassword) {
  const payload = await api.post(
    '/auth/change-password',
    { oldPassword, newPassword },
    { requireAuth: true }
  );
  return payload;
}

// GET /api/v1/auth/me
// Backend mengembalikan { success, user }
export async function getMe() {
  const payload = await api.get('/auth/me');
  return payload?.user || payload?.data || null;
}

// JWT bersifat stateless di backend, jadi logout = hapus token di klien.
export function logout() {
  clearToken();
}
