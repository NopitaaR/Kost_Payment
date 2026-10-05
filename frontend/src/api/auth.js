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
