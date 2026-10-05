// Shim lingkungan browser
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = { location: { origin: 'http://localhost:5000' } };

import { login, getMe, logout } from './src/api/auth.js';
import { getToken, setToken, clearToken } from './src/api/client.js';

async function test() {
  try {
    console.log('Logging in first time...');
    const user1 = await login('pemilik@kost.id', 'rahasia123');
    console.log('Login success, user:', user1);
    const token1 = getToken();
    console.log('Token after first login:', token1 ? 'present' : 'null');

    console.log('Clearing token...');
    clearToken();
    const tokenAfterClear = getToken();
    console.log('Token after clear:', tokenAfterClear ? 'present' : 'null');

    console.log('Logging in second time...');
    const user2 = await login('pemilik@kost.id', 'rahasia123');
    console.log('Login success, user:', user2);
    const token2 = getToken();
    console.log('Token after second login:', token2 ? 'present' : 'null');
  } catch (err) {
    console.error('Error:', err);
    if (err.status) {
      console.error('Status:', err.status);
    }
    if (err.payload) {
      console.error('Payload:', err.payload);
    }
  }
}

test();