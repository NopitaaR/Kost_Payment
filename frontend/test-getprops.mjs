// Shim lingkungan browser
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = { location: { origin: 'http://localhost:5000' } };

import { getToken, setToken, clearToken } from './src/api/client.js';
import { login, getMe } from './src/api/auth.js';
import { getProperties } from './src/api/properties.js';

async function test() {
  try {
    console.log('Logging in...');
    const user = await login('pemilik@kost.id', 'rahasia123');
    console.log('Login result:', user);
    const token = getToken();
    console.log('Token after login:', token);
    console.log('Calling getProperties...');
    const props = await getProperties();
    console.log('Properties result:', props);
    console.log('Properties length:', props.length);
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