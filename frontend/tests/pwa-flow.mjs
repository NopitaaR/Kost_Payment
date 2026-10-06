// Test alur PWA Installable (Phase 3H-5).
// Memverifikasi manifest, icon, service worker, link di index.html, dan registrasi SW.
//
// Jalankan: node tests/pwa-flow.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');

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

console.log('=== TEST SUITE: PWA FLOW (PHASE 3H-5) ===\n');

// 1. Periksa manifest.webmanifest
console.log('[1/5] Validasi Web App Manifest');
const manifestPath = path.join(FRONTEND_DIR, 'public', 'manifest.webmanifest');
assert(fs.existsSync(manifestPath), 'File manifest.webmanifest ditemukan di public/');

let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
} catch (e) {
  assert(false, `manifest.webmanifest gagal diparsing: ${e.message}`);
}

assert(manifest !== null, 'manifest.webmanifest adalah JSON yang valid');
assert(manifest.name === 'Kost Manager', `name sesuai: "${manifest?.name}"`);
assert(manifest.short_name === 'Kost Manager', `short_name sesuai: "${manifest?.short_name}"`);
assert(manifest.display === 'standalone', `display mode adalah standalone: "${manifest?.display}"`);
assert(manifest.start_url === '/', `start_url sesuai: "${manifest?.start_url}"`);
assert(Boolean(manifest.theme_color), `theme_color terdefinisi: "${manifest?.theme_color}"`);
assert(Boolean(manifest.background_color), `background_color terdefinisi: "${manifest?.background_color}"`);
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'icons minimal memiliki 2 icon');

// 2. Validasi Ikon PWA
console.log('\n[2/5] Validasi Ikon 192x192 & 512x512');
const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
const icon512 = manifest.icons.find((i) => i.sizes === '512x512');

assert(Boolean(icon192), 'Definisi icon 192x192 ada di manifest');
assert(Boolean(icon512), 'Definisi icon 512x512 ada di manifest');

const icon192Path = path.join(FRONTEND_DIR, 'public', icon192?.src || '');
const icon512Path = path.join(FRONTEND_DIR, 'public', icon512?.src || '');

assert(fs.existsSync(icon192Path), `Berkas fisik icon 192x192 ada: ${icon192?.src}`);
assert(fs.existsSync(icon512Path), `Berkas fisik icon 512x512 ada: ${icon512?.src}`);

// Verifikasi file header PNG (0x89 0x50 0x4E 0x47)
if (fs.existsSync(icon192Path)) {
  const buf192 = fs.readFileSync(icon192Path);
  const isPng = buf192[0] === 0x89 && buf192[1] === 0x50 && buf192[2] === 0x4E && buf192[3] === 0x47;
  assert(isPng, 'Icon 192x192 adalah berkas gambar PNG valid');
}
if (fs.existsSync(icon512Path)) {
  const buf512 = fs.readFileSync(icon512Path);
  const isPng = buf512[0] === 0x89 && buf512[1] === 0x50 && buf512[2] === 0x4E && buf512[3] === 0x47;
  assert(isPng, 'Icon 512x512 adalah berkas gambar PNG valid');
}

// 3. Validasi Service Worker
console.log('\n[3/5] Validasi Service Worker (sw.js)');
const swPath = path.join(FRONTEND_DIR, 'public', 'sw.js');
assert(fs.existsSync(swPath), 'File sw.js ada di public/');

const swContent = fs.readFileSync(swPath, 'utf-8');
assert(swContent.includes("addEventListener('install'"), 'sw.js menangani event install');
assert(swContent.includes("addEventListener('activate'"), 'sw.js menangani event activate');
assert(swContent.includes("addEventListener('fetch'"), 'sw.js menangani event fetch');
assert(swContent.includes('/api'), 'sw.js mengecualikan endpoint /api agar tidak merusak komunikasi backend');

// 4. Validasi Registrasi di index.html & main.jsx
console.log('\n[4/5] Validasi Konfigurasi HTML & Registrasi');
const indexPath = path.join(FRONTEND_DIR, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf-8');
assert(indexContent.includes('rel="manifest"'), 'index.html memiliki link rel="manifest"');
assert(indexContent.includes('manifest.webmanifest'), 'index.html mereferensikan manifest.webmanifest');
assert(indexContent.includes('theme-color'), 'index.html memiliki meta theme-color');

const mainPath = path.join(FRONTEND_DIR, 'src', 'main.jsx');
const mainContent = fs.readFileSync(mainPath, 'utf-8');
assert(mainContent.includes('serviceWorker.register'), 'main.jsx memiliki skrip registrasi serviceWorker');

// 5. Cek Dist Build Assets jika sudah dibangun
console.log('\n[5/5] Pengecekan Kesiapan Build Asset');
const distDir = path.join(FRONTEND_DIR, 'dist');
if (fs.existsSync(distDir)) {
  const distManifest = path.join(distDir, 'manifest.webmanifest');
  const distSw = path.join(distDir, 'sw.js');
  assert(fs.existsSync(distManifest), 'Build dist/ memuat manifest.webmanifest');
  assert(fs.existsSync(distSw), 'Build dist/ memuat sw.js');
} else {
  console.log('  ℹ️ dist/ belum ada (akan diverifikasi pada tahap npm run build)');
}

console.log(`\n=== HASIL TEST PWA FLOW: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
