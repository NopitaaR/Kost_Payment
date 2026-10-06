// API client terpusat untuk seluruh frontend.
// Menangani: base URL, Bearer token, JSON, parsing response, dan error handling.

// Guard import.meta.env supaya modul ini tetap bisa diuji di Node.
const viteEnv = import.meta.env;
const BASE_URL = (viteEnv && viteEnv.VITE_API_URL) || '/api/v1';
const TOKEN_KEY = 'kost.token';

// Callback opsional yang dipasang AuthContext untuk menangani sesi hangus.
let onSessionExpired = null;
export const setOnSessionExpired = (fn) => {
  onSessionExpired = typeof fn === 'function' ? fn : null;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, params, requireAuth = true } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {};
  if (!isFormData) {
    headers.Accept = 'application/json';
    if (body !== undefined) headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (networkError) {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 0, null);
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    // Token invalid/expired → bersihkan sesi dan beri tahu aplikasi.
    if ((response.status === 401 || response.status === 403) && requireAuth && token) {
      clearToken();
      if (onSessionExpired) onSessionExpired();
    }

    const message =
      (payload && (payload.message || payload.error)) ||
      `Terjadi kesalahan (${response.status}).`;
    throw new ApiError(message, response.status, payload);
  }

  // Semua endpoint backend memakai pola { success, data } atau { success, ...field }.
  if (payload && payload.success === false) {
    throw new ApiError(payload.message || 'Terjadi kesalahan.', response.status, payload);
  }

  return payload;
}

async function requestBlob(path, { params, requireAuth = true } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
    });
  } catch (networkError) {
    throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 0, null);
  }

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && requireAuth && token) {
      clearToken();
      if (onSessionExpired) onSessionExpired();
    }
    throw new ApiError(`Gagal mengambil file (${response.status}).`, response.status, null);
  }

  return await response.blob();
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  getBlob: (path, options) => requestBlob(path, options),
};

export default api;
