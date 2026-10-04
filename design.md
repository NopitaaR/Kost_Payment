# DESIGN — Kost Manager

Dokumen desain UI/UX untuk aplikasi Kost Manager. Sumber fitur dan aturan bisnis: `prd.md`. Prototipe interaktif: https://claude.ai/artifact/LwqXZNcTTuNeW5rr8Kmbnz

Dokumen ini adalah acuan untuk implementasi React + Vite + Tailwind. Jika ada yang bertentangan dengan `prd.md`, PRD yang menang.

---

## 1. Prinsip Desain

1. **Mobile-first.** Dirancang untuk HP dulu, lalu tablet, lalu desktop.
2. **Sederhana dan jelas.** Satu layar, satu tujuan. Tidak ada tabel lebar, tidak ada dasbor penuh statistik.
3. **Alur utama harus selalu terasa mudah:** pilih rumah → lihat kamar/penghuni → tambah penghuni → lihat siapa yang belum bayar → catat pembayaran.
4. **Bahasa Indonesia sederhana.** Gunakan istilah: Kamar, Penghuni, Tagihan, Pembayaran, Belum Bayar, Laporan. Hindari istilah teknis.
5. **Status terbaca tanpa membaca detail.** Warna dan teks badge selalu berpasangan.
6. **Satu aksi utama per layar.** Tombol utama selalu jelas dan mudah dijangkau ibu jari.
7. **Tidak ada fitur di luar PRD.** Tidak ada akun penghuni, payment gateway, booking, chat, atau dashboard gabungan.

---

## 2. Struktur Navigasi

### Alur

```text
Login → Pilih Rumah → Beranda (Dashboard Rumah)
                         ├── Kamar → Detail Kamar → Tambah/Edit Kamar
                         ├── Penghuni → Detail Penghuni → Pindah Kamar / Penghuni Keluar
                         │            → Tambah Penghuni (2 langkah)
                         ├── Keuangan → Tagihan | Pembayaran | Belum Bayar
                         │            → Detail Tagihan → Catat Pembayaran
                         └── Lainnya → Laporan | Pengaturan | Pilih/Kembali ke Rumah
```

Setelah rumah dipilih, semua data hanya milik rumah tersebut. Tidak ada dashboard gabungan 3 rumah.

### Menu utama (5 item)

| Item | Ikon | Isi |
|---|---|---|
| Beranda | 🏠 | Ringkasan rumah |
| Kamar | 🛏 | Daftar dan kelola kamar |
| Penghuni | 👥 | Daftar dan kelola penghuni |
| Keuangan | 💰 | Tagihan, Pembayaran, Belum Bayar |
| Lainnya | ☰ | Laporan, Pengaturan, Pilih Rumah |

- **HP:** bottom navigation, tetap di bawah, mudah dijangkau ibu jari.
- **Desktop (≥ 900px):** menjadi sidebar kiri selebar 230px dengan item yang sama. Komponen dan token sama, hanya tata letak yang berubah.
- Layar detail dan form tetap menampilkan menu, dengan tab induknya aktif (misalnya Detail Kamar → Kamar aktif).
- Layar Login dan Pilih Rumah tidak menampilkan menu.

---

## 3. Design Tokens

### Warna

Tema terang, putih dengan hijau mint. Tidak ada mode gelap.

| Token | Nilai | Fungsi |
|---|---|---|
| `bg` | `#f2fbf8` | Latar halaman (putih kehijauan sangat tipis) |
| `card` | `#ffffff` | Kartu, input, bottom sheet, menu |
| `ink` | `#12261f` | Teks utama |
| `mute` | `#58716a` | Teks sekunder, label |
| `line` | `#d3ece4` | Garis tepi, pemisah |
| `brand` | `#3fcfa4` | Warna utama untuk **fill**: tombol utama, tab/chip aktif, tombol tambah |
| `brand-dark` | `#0b7a5c` | Warna utama untuk **teks dan ikon** di atas latar terang (menu aktif, badge Terisi, avatar) |
| `on-brand` | `#053b2c` | Teks di atas `brand` |
| `brand-soft` | `#dff7ee` | Latar lembut: badge Terisi, avatar, pilihan terpilih |

> Teks di atas `brand` (mint) memakai `on-brand` hijau tua, bukan putih, karena putih di atas mint kontrasnya kurang. Jangan memakai `brand` sebagai warna teks di atas putih; gunakan `brand-dark`.

### Warna status

| Status | Teks | Latar | Badge |
|---|---|---|---|
| Lunas | `#15803d` | `#dcf3e3` | ✓ Lunas |
| Sebagian | `#b45309` | `#fdf0d4` | Sebagian |
| Terlambat | `#c81e1e` | `#fde4e4` | Terlambat |
| Belum bayar / Kosong | `#5b6670` | `#e8f1ee` | Belum bayar / Kosong |
| Terisi | `brand-dark` | `brand-soft` | Terisi |

- **Lunas** diberi tanda ✓ supaya tidak tertukar dengan **Terisi** yang sama-sama hijau.
- Sisa tagihan: merah (`bad`) jika masih ada, hijau jika 0.
- Total belum bayar di dashboard dan halaman Belum Bayar: merah.

### Tipografi

Font: **Plus Jakarta Sans** (Google Fonts), fallback `system-ui`.

| Peran | Ukuran / berat | Dipakai untuk |
|---|---|---|
| Angka besar | 30 / 800 | Jumlah kamar, penghuni, total belum bayar |
| Judul halaman | 20 / 800 | Header halaman |
| Judul kartu | 15–18 / 700 | Nama penghuni, nomor kamar |
| Body | 15 / 400–600 | Isi umum |
| Caption | 13 / 400–600 | Keterangan, label form, judul bagian |
| Badge | 12 / 700 | Status |

Judul bagian memakai caption berwarna `mute` dengan huruf biasa (bukan huruf kapital semua).

### Bentuk dan jarak

| Elemen | Nilai |
|---|---|
| Radius kartu | 16px |
| Radius tombol | 14px |
| Radius input | 12px |
| Radius bottom sheet | 22px (sudut atas) |
| Radius badge, chip, FAB | penuh (pil) |
| Padding halaman | 18px kiri-kanan |
| Jarak antar kartu | 10px |
| Area sentuh minimum | 42px |
| Lebar konten HP | maks 480px |
| Lebar konten desktop | maks 640px, ditengah |

Kartu memakai garis tepi tipis, tanpa bayangan. Bayangan hanya untuk tombol mengambang (FAB).

---

## 4. Komponen

| Komponen | Aturan |
|---|---|
| **Button** | Utama: latar `brand`, teks `on-brand`, lebar penuh. Sekunder (ghost): putih + garis tepi. Bahaya: merah, teks putih. Kecil: untuk pasangan tombol di dalam kartu. Label berupa kata kerja: "Simpan Kamar", "Catat Pembayaran". |
| **Input / Select / Textarea** | Radius 12, garis tepi `line`, fokus memakai outline `brand`. Label di atas input, sentence case. Pesan error merah di bawah input. |
| **Search** | Input dengan placeholder "🔍 Cari …". Memfilter langsung saat mengetik. |
| **Chip (filter / tab)** | Pil. Aktif: latar `brand`. Dipakai untuk filter Semua/Terisi/Kosong, Aktif/Keluar, dan tab Keuangan. |
| **Card** | Putih, radius 16. Kartu yang bisa disentuh punya panah `→` di kanan. Kartu informasi biasa tidak interaktif. |
| **Stat Card** | Angka besar + label kecil. Maksimal 3 di dashboard. |
| **Badge** | Pil kecil dengan warna status (lihat bagian 3). |
| **Avatar** | Lingkaran berisi inisial, latar `brand-soft`, teks `brand-dark`. Ukuran 40 (daftar) dan 72 (detail). |
| **Header** | Tombol kembali `←` + judul halaman, menempel di atas saat scroll. Layar tab utama tidak punya tombol kembali. |
| **Bottom Navigation / Sidebar** | Lihat bagian 2. |
| **FAB** | Tombol pil mengambang "＋ Tambah …" di daftar Kamar dan Penghuni. |
| **Modal / Bottom Sheet** | Naik dari bawah, untuk aksi singkat (Pindah Kamar, Penghuni Keluar, Foto KTP). Tutup dengan Batal atau ketuk area gelap. |
| **Confirmation Dialog** | Bottom sheet berisi judul, penjelasan akibat, tombol Batal dan tombol aksi. |
| **Toast** | Pil gelap di bawah layar, hilang sendiri setelah sekitar 2,4 detik. Kata kerja sama dengan tombolnya ("Kamar disimpan"). |
| **Empty State** | Emoji besar, judul, satu kalimat penjelasan, tombol aksi bila ada. |
| **Skeleton** | Kotak abu berdenyut sebagai pengganti kartu saat memuat. Tidak ada layar kosong. |
| **Upload area** | Kotak garis putus-putus. Setelah dipilih: garis hijau dan nama file. Di HP membuka kamera atau galeri. |
| **Segmented choice** | Dua pilihan berdampingan (Cash / Transfer). |
| **Step indicator** | Dua garis di atas form Tambah Penghuni. |

---

## 5. Layar

### 5.1 Login
Nama aplikasi, tagline "Kelola kost dengan lebih mudah.", Email/Username, Password, tombol **Masuk**, tautan "Lupa password". Tanpa gambar besar.

### 5.2 Pilih Rumah
Sapaan "Selamat datang 👋", lalu tiga kartu besar: Rumah 1, 2, 3. Tiap kartu menampilkan jumlah kamar dan "x terisi · y kosong". Satu ketukan masuk ke Beranda rumah itu.

### 5.3 Beranda (Dashboard Rumah)
Urutan dari atas:
1. Header: `← Rumah 1`.
2. Dua stat: **Kamar** (total, terisi, kosong) dan **Penghuni aktif**.
3. Kartu **Belum bayar**: total rupiah (merah) dan jumlah tagihan. Bisa diketuk menuju Keuangan → Belum Bayar.
4. **Penghuni terbaru** (2 orang).
5. Aksi cepat: **+ Tambah Penghuni** (utama), **+ Tambah Kamar**, **Lihat Belum Bayar**.

### 5.4 Kamar
Search nomor kamar, chip Semua/Terisi/Kosong, lalu kartu per kamar: nomor, badge Terisi/Kosong, harga per bulan, nama penghuni aktif. FAB "Tambah Kamar".

### 5.5 Detail Kamar
Harga per bulan + tombol Edit. **Penghuni aktif** (kartu, bisa diketuk), tombol **+ Tambah Penghuni**, **Riwayat penghuni** (nama, rentang tanggal, badge Keluar), tombol Hapus kamar.
Layar ini menjawab dua pertanyaan: siapa yang tinggal sekarang, dan siapa yang pernah tinggal.

### 5.6 Tambah / Edit Kamar
Nomor kamar, harga per bulan, catatan (opsional), tombol **Simpan Kamar**. Catatan di bawah harga: perubahan harga tidak mengubah tagihan lama.

### 5.7 Penghuni
Search nama / nomor HP, chip Aktif/Keluar, kartu per penghuni (inisial, nama, kamar, HP, status). FAB "Tambah".

### 5.8 Tambah Penghuni (2 langkah)
- **Langkah 1, Data diri:** Foto KTP (area upload besar), Nama lengkap, Nomor HP, Alamat asal, Pekerjaan. Tombol **Lanjut**.
- **Langkah 2, Hunian:** Tanggal masuk, Pilih kamar (menampilkan harga). Tombol **Simpan Penghuni** dan Kembali.
Data langkah 1 tidak hilang saat kembali.

### 5.9 Detail Penghuni
Avatar, nama, kamar, badge status. Informasi: No. HP, alamat asal, pekerjaan, tanggal masuk (dan tanggal keluar jika sudah keluar). Tombol **Lihat Foto KTP**, kartu kamar dan harga. Untuk penghuni aktif: **Pindah Kamar** dan **Penghuni Keluar**.

### 5.10 Pindah Kamar
Bottom sheet: kamar saat ini, pilih kamar baru, tanggal pindah, tombol **Pindahkan**. Lalu dialog konfirmasi: "Kamar 01 → Kamar 05. Tagihan berikutnya akan mengikuti harga Kamar 05. Tagihan lama tidak berubah."

### 5.11 Penghuni Keluar
Bottom sheet: tanggal keluar, pertanyaan "Apakah penghuni ini benar-benar sudah keluar?", penjelasan bahwa data tidak dihapus. Tombol **Batal** dan **Ya, penghuni keluar** (merah).

### 5.12 Keuangan
Tiga chip: **Tagihan**, **Pembayaran**, **Belum Bayar**. Default terbuka: **Belum Bayar**.
- **Tagihan:** kolom cari (kamar / nama penghuni) + tombol **Filter**, lalu kartu per tagihan (penghuni, kamar, jatuh tempo, badge status, sisa), jatuh tempo terbaru di atas. Tombol Filter membuka bottom sheet dengan **Kamar**, **Periode** (bulan jatuh tempo), dan **Status**; tombol **Terapkan** dan **Reset**. Jumlah filter aktif tampil di tombol, misalnya "Filter (2)".
- **Pembayaran:** ringkasan "x pembayaran · total" + tombol **Filter** (Kamar, Metode, Dari tanggal, Sampai tanggal), lalu riwayat pembayaran (kamar, penghuni, tanggal, metode, nominal), terbaru di atas. Tiap baris punya tombol 🗑 untuk hapus.
- **Belum Bayar:** kartu ringkasan total (merah), lalu satu kartu per tagihan berstatus Belum bayar, Sebagian, atau Terlambat.

### 5.13 Belum Bayar (kartu tagihan)
Nama penghuni, kamar, jatuh tempo, badge. Untuk pembayaran sebagian: nominal tagihan dan jumlah yang sudah dibayar. Sisa ditampilkan besar. Dua tombol: **Catat Pembayaran** dan **WhatsApp**.

### 5.14 Detail Tagihan
Kamar, penghuni, badge status. Periode, jatuh tempo, total tagihan, sudah dibayar, sisa. Riwayat pembayaran. Setiap pembayaran punya tombol 🗑 yang membuka dialog konfirmasi hapus. Tombol **+ Catat Pembayaran** (hanya jika masih ada sisa).

### 5.15 Catat Pembayaran
Ringkasan kamar dan sisa tagihan, Jumlah pembayaran (terisi otomatis sebesar sisa), Metode (Cash / Transfer), Tanggal, Catatan, tombol **Simpan Pembayaran**.
Error: "Jumlah pembayaran tidak boleh melebihi sisa tagihan."

### 5.16 WhatsApp
Membuka WhatsApp dengan pesan yang sudah terisi, tanpa API:

```text
Halo Budi, mengingatkan pembayaran kost Kamar 01 sebesar Rp800.000 yang belum dibayar.

Terima kasih.
```

### 5.17 Laporan
Tiga chip periode: **Bulan** (pilih bulan), **Tahun** (pilih tahun), **Rentang tanggal** (Dari tanggal, Sampai tanggal; muncul error jika tanggal akhir lebih awal dari tanggal awal).

Empat angka: Total tagihan, Sudah dibayar, Belum dibayar, Transaksi. Lalu penghuni aktif, tagihan lunas, tagihan belum lunas, dan **Daftar transaksi** (kamar, tanggal, metode, nominal). Mengikuti rumah yang dipilih.

Cara menghitung, supaya angkanya selalu cocok (Total tagihan = Sudah dibayar + Belum dibayar):
- Periode menyaring **tagihan berdasarkan tanggal jatuh tempo**.
- Sudah dibayar dan Transaksi dihitung dari pembayaran pada tagihan-tagihan tersebut.
- Belum dibayar = sisa tagihan-tagihan tersebut.
- Penghuni aktif adalah kondisi saat ini, tidak ikut periode.

### 5.18 Pengaturan
Daftar menu: Akun (Profil pemilik), Rumah (Rumah 1–3), Keamanan (Ubah password), Aplikasi (Install aplikasi), dan tombol **Keluar** di bawah. Tidak ada pengaturan lain.

- **Profil Pemilik:** avatar, Nama (wajib), Email / Username (wajib), Nomor HP (opsional), tombol **Simpan Profil**.
- **Ubah Password:** Password lama, Password baru (minimal 8 karakter), Ulangi password baru, tombol **Simpan Password**. Error: password lama kosong, kurang dari 8 karakter, sama dengan password lama, atau pengulangan tidak sama.
- **Pengaturan Rumah:** Nama rumah (wajib, tidak boleh sama dengan rumah lain), ringkasan jumlah kamar / terisi / kosong, tombol **Simpan**. Mengganti nama tidak memengaruhi data rumah.
- **Install aplikasi:** bottom sheet berisi langkah untuk Android (Chrome: menu ⋮ → Install aplikasi) dan iPhone (Safari: Bagikan → Tambah ke Layar Utama).
- **Keluar:** dialog konfirmasi "Keluar dari aplikasi?", lalu kembali ke Login.

---

## 6. State

| State | Perilaku |
|---|---|
| **Kosong** | Kamar: 🛏️ "Belum ada kamar", tombol + Tambah Kamar. Penghuni: 👥 "Belum ada penghuni", tombol + Tambah Penghuni. Belum Bayar: 🎉 "Tidak ada tagihan tertunggak. Semua pembayaran sudah aman." Tagihan dan Pembayaran punya teks kosong sendiri. |
| **Memuat** | Tiga kotak skeleton di tempat daftar. |
| **Error** | ⚠️ "Terjadi kesalahan. Data belum dapat dimuat." + tombol **Coba lagi**. |
| **Pencarian kosong** | Teks "Kamar tidak ditemukan." / "Tidak ada hasil." |
| **Validasi form** | Pesan merah di bawah form, dalam bahasa Indonesia: nomor kamar wajib, harga wajib, nomor kamar sudah dipakai, foto KTP wajib, dan sebagainya. |
| **Upload KTP gagal** | Tampilkan error yang jelas di area upload (sesuai PRD, bagian edge cases). |

Pesan error menjelaskan masalah dan cara memperbaikinya, tanpa permintaan maaf berlebihan.

## 7. Dialog Konfirmasi

Wajib untuk aksi berisiko. Tidak ada penghapusan dengan satu ketukan.

| Aksi | Isi dialog |
|---|---|
| Pindah kamar | Kamar lama → kamar baru, harga berikutnya, tagihan lama tidak berubah |
| Penghuni keluar | Tanggal keluar, data tetap tersimpan sebagai riwayat |
| Hapus kamar | Hanya muncul jika kamar belum punya penghuni atau tagihan. Jika punya riwayat: toast "Kamar punya riwayat, tidak bisa dihapus" |
| Hapus pembayaran | "Pembayaran Rp600.000 (Transfer, 2 Okt 2026) untuk Kamar 03 akan dihapus. Sisa tagihan akan bertambah dan status tagihan bisa berubah." Tombol Batal dan **Ya, hapus** (merah). Setelah dihapus status tagihan dihitung ulang |
| Keluar dari aplikasi | Penjelasan perlu login ulang, tombol Batal dan **Ya, keluar** |

---

## 8. Aturan Bisnis yang Tercermin di UI

| Aturan PRD | Penerapan di UI |
|---|---|
| Satu tagihan per kamar | Kartu tagihan menampilkan semua penghuni aktif kamar itu, tanpa tagihan per orang |
| Harga lama tidak berubah | Catatan di form kamar; tagihan menampilkan nominal tersimpan |
| Status otomatis | Badge dihitung: bayar ≥ nominal → Lunas; lewat jatuh tempo dan belum lunas → Terlambat; bayar > 0 → Sebagian; selain itu Belum bayar. Lunas menang atas Terlambat |
| Pembayaran ≤ sisa | Validasi di form, dan wajib diulang di backend |
| Penghuni keluar tidak dihapus | Dialog penjelasan; muncul di filter Keluar dan riwayat kamar |
| Kamar terisi/kosong otomatis | Badge dihitung dari penghuni aktif, bukan diisi manual |
| Nomor kamar unik per rumah | Validasi "Nomor kamar sudah dipakai di rumah ini" |
| Foto KTP wajib dan privat | Upload wajib di langkah 1; dilihat lewat tombol dengan keterangan "Hanya terlihat oleh pemilik" |
| Data antar rumah terpisah | Semua daftar mengikuti rumah yang dipilih; ganti rumah lewat Lainnya |

---

## 9. Responsif

| Lebar | Perilaku |
|---|---|
| < 900px | Satu kolom, maks 480px, ditengah. Bottom navigation. FAB di kanan bawah di atas menu |
| ≥ 900px | Sidebar kiri 230px. Konten maks 640px, ditengah. FAB di pojok kanan bawah layar |

Tablet memakai tampilan HP yang lebih lebar (belum ada layout khusus tablet).

---

## 10. Aksesibilitas

- Area sentuh minimal 42px.
- Fokus keyboard terlihat (outline `brand`).
- Tombol ikon punya `aria-label` (misalnya "Kembali").
- Menu utama punya label `aria-label="Menu utama"`.
- Animasi hanya untuk bottom sheet dan skeleton; keduanya menghormati `prefers-reduced-motion` (sheet), dan skeleton tidak membawa informasi.
- Status tidak hanya dibedakan warna: selalu ada teks badge.
- Viewport memakai `viewport-fit=cover` dan memperhitungkan safe area di atas dan bawah.

---

## 11. Saran Implementasi (React + Tailwind)

Daftarkan token sebagai CSS variable atau di `tailwind.config`:

```css
:root {
  --bg: #f2fbf8;   --card: #ffffff;
  --ink: #12261f;  --mute: #58716a;  --line: #d3ece4;
  --brand: #3fcfa4; --brand-dark: #0b7a5c; --on-brand: #053b2c; --brand-soft: #dff7ee;
  --ok: #15803d;   --ok-soft: #dcf3e3;
  --warn: #b45309; --warn-soft: #fdf0d4;
  --bad: #c81e1e;  --bad-soft: #fde4e4;
  --gray: #5b6670; --gray-soft: #e8f1ee;
}
```

Komponen yang dibuat sekali dan dipakai ulang di semua halaman: `Button`, `Input`, `Select`, `SearchInput`, `Card`, `StatCard`, `Badge`, `Avatar`, `Chip`, `Header`, `BottomNav` / `Sidebar` (satu komponen, dua tampilan), `BottomSheet`, `ConfirmDialog`, `Toast`, `EmptyState`, `Skeleton`, `UploadArea`.

Rute yang disarankan:

```text
/login
/rumah
/r/:propertyId                  Beranda
/r/:propertyId/kamar            Daftar kamar
/r/:propertyId/kamar/baru
/r/:propertyId/kamar/:id        Detail + /edit
/r/:propertyId/penghuni         Daftar
/r/:propertyId/penghuni/baru
/r/:propertyId/penghuni/:id
/r/:propertyId/keuangan         Tab Tagihan | Pembayaran | Belum Bayar
/r/:propertyId/tagihan/:id      Detail + catat pembayaran
/r/:propertyId/laporan
/r/:propertyId/pengaturan            Menu + /profil, /password, /rumah/:id
```

Urutan pengerjaan UI mengikuti prioritas UX di prompt: (1) melihat penghuni, (2) menambah penghuni, (3) melihat yang belum bayar, (4) mencatat pembayaran, (5) mengelola kamar.

---

## 12. Yang Belum Termasuk

- Layout khusus tablet (sementara memakai tampilan HP yang lebih lebar).
- Pesan WhatsApp untuk kamar berpenghuni lebih dari satu: prototipe memakai penghuni aktif pertama di kamar itu sebagai penerima.
- Pratinjau KTP sungguhan (di prototipe hanya kotak contoh).
- Login ulang setelah sesi habis dan alur Lupa password (di prototipe hanya tampilan).
