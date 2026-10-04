# PRD — Kost Manager

## 1. Ringkasan Produk

Kost Manager adalah aplikasi mobile-first/PWA untuk pemilik atau pengelola kost yang mengelola 3 rumah kost: Rumah 1, Rumah 2, dan Rumah 3.

Aplikasi hanya digunakan pemilik/pengelola. Penghuni tidak memiliki akun, tidak login, dan tidak membayar melalui aplikasi. Pembayaran dilakukan offline/cash/transfer kepada pemilik, lalu dicatat oleh pemilik.

Fokus utama: mengelola kamar, penghuni, riwayat masuk/pindah/keluar, tagihan, pembayaran, tunggakan, dan laporan dengan UI yang sangat sederhana agar mudah dipahami melalui HP.

## 2. Prinsip Produk

> Mudah digunakan > Banyak fitur.

Pengguna harus dapat: pilih rumah → lihat kamar/penghuni → tambah penghuni → lihat siapa yang belum bayar → catat pembayaran.

Gunakan bahasa Indonesia sederhana: Kamar, Penghuni, Tagihan, Pembayaran, Belum Bayar, Pemasukan, Laporan.

## 3. Target dan Batasan

### Pengguna
- Hanya pemilik/pengelola kost.
- Login pemilik.
- Tidak ada akun penghuni.

### Tidak termasuk MVP
- Login penghuni.
- Payment gateway.
- Pembayaran online.
- Booking kamar.
- Marketplace kost.
- Chat internal.
- Rating/review.
- Pencarian kost publik.

## 4. Multi Rumah

Pemilik memiliki tepat tiga rumah awal:
- Rumah 1
- Rumah 2
- Rumah 3

Saat membuka aplikasi, pemilik memilih rumah terlebih dahulu. Setelah memilih rumah, semua data yang tampil hanya milik rumah tersebut. Tidak perlu dashboard gabungan dalam MVP.

Struktur:

```text
Pemilik
├── Rumah 1
│   ├── Kamar
│   ├── Penghuni
│   ├── Tagihan
│   └── Pembayaran
├── Rumah 2
│   └── struktur sama
└── Rumah 3
    └── struktur sama
```

## 5. Platform

Buat sebagai mobile-first web application/PWA.

Prioritas:
1. HP
2. Tablet
3. Laptop/Desktop

PWA harus dapat di-install ke Home Screen, responsive, memiliki manifest, icon, dan service worker. Data utama tetap disimpan di backend/database, bukan hanya localStorage.

## 6. Navigasi HP

Gunakan bottom navigation:

```text
Beranda | Kamar | Penghuni | Keuangan | Lainnya
```

Keuangan berisi:
- Tagihan
- Pembayaran
- Belum Bayar

Lainnya berisi:
- Laporan
- Pengaturan
- Pilih/Kembali ke Rumah

## 7. Dashboard Rumah

Dashboard harus sederhana dan menampilkan:
- Total kamar.
- Kamar terisi.
- Kamar kosong.
- Penghuni aktif.
- Jumlah kamar/tagihan belum lunas.
- Total nominal belum dibayar.
- Penghuni terbaru.

Quick action:
- + Tambah Penghuni
- + Tambah Kamar
- Lihat Belum Bayar

Contoh:

```text
Rumah 1
10 Kamar   8 Terisi   2 Kosong

12 Penghuni Aktif

Belum Bayar
3 kamar
Rp2.400.000

Penghuni Terbaru
Budi — Kamar 01
Andi — Kamar 04
```

## 8. Kamar

Pemilik dapat:
- Menambah kamar.
- Mengedit kamar.
- Melihat detail kamar.
- Melihat penghuni aktif.
- Melihat riwayat penghuni.
- Menghapus kamar jika aman.

Data kamar:
- id
- propertyId
- nomor/nama kamar
- harga
- catatan
- createdAt
- updatedAt

Status:
- KOSONG
- TERISI

Kamar TERISI jika memiliki minimal satu penghuni aktif. Kamar KOSONG jika tidak memiliki penghuni aktif.

Nomor kamar harus unik dalam satu rumah.

## 9. Harga Kamar

Setiap kamar memiliki harga sendiri. Harga antar kamar boleh berbeda.

Contoh:
- Kamar 01: Rp800.000
- Kamar 02: Rp700.000
- Kamar 03: Rp1.000.000

Tidak ada aturan otomatis harga orang kedua. Jika satu kamar dihuni beberapa orang, pemilik menentukan harga total kamar sesuai kesepakatan.

Perubahan harga kamar tidak boleh mengubah tagihan lama. Nominal tagihan harus menyimpan snapshot harga saat tagihan dibuat.

## 10. Penghuni

Data wajib:
- Nama
- Nomor HP
- Foto KTP
- Alamat asal
- Pekerjaan
- Tanggal masuk
- Kamar

Data tambahan:
- Status
- Tanggal keluar
- Catatan
- createdAt
- updatedAt

Status:
- AKTIF
- KELUAR

Ketika penghuni keluar, jangan hapus data. Isi tanggal keluar dan ubah status menjadi KELUAR sehingga riwayat tetap tersedia.

Foto KTP hanya dapat dilihat pemilik/pengelola yang berwenang. Jangan jadikan file KTP publik. Tidak perlu OCR dan tidak wajib menyimpan NIK terpisah.

## 11. Beberapa Penghuni Dalam Satu Kamar

Satu kamar dapat ditempati beberapa orang.

Contoh:

```text
Kamar 01
Harga: Rp1.200.000

Andi
Budi
```

Tagihan adalah satu tagihan untuk kamar, bukan satu tagihan per orang. Jika dua orang berbagi kamar, harga total kamar dapat berbeda sesuai kesepakatan pemilik.

## 12. Riwayat Hunian dan Pindah Kamar

Gunakan entitas Riwayat Hunian/Occupancy untuk menyimpan hubungan penghuni dengan kamar.

Data minimal:
- id
- tenantId
- propertyId
- roomId
- startDate
- endDate
- status
- notes
- createdAt
- updatedAt

Penghuni dapat pindah kamar.

Contoh:

```text
Budi
Kamar 01 → 10 Januari–10 Maret
Kamar 05 → 10 Maret–sekarang
```

Riwayat kamar lama tetap disimpan. Setelah pindah, tagihan berikutnya menggunakan harga kamar baru. Tagihan lama tetap menggunakan harga kamar lama.

## 13. Tagihan Otomatis

Sistem membuat tagihan otomatis.

Tagihan adalah tagihan kamar. Jika satu kamar dihuni beberapa orang, mereka mengikuti tagihan kamar tersebut.

Jangan mengasumsikan semua tagihan jatuh tempo tanggal 1.

Contoh siklus:

```text
Masuk 20 Januari
→ 20 Februari
→ 20 Maret
→ 20 April
```

Jika beberapa penghuni berada dalam kamar yang sama, gunakan tanggal siklus pembayaran kamar tersebut. Sistem harus menyimpan informasi periode dan jatuh tempo secara eksplisit agar tagihan tidak ganda.

## 14. Struktur Tagihan

Data minimal:
- id
- propertyId
- roomId
- periodStart
- periodEnd
- amount
- dueDate
- status
- notes
- createdAt
- updatedAt

Jika perlu mengetahui penghuni yang terkait pada saat tagihan dibuat, relasi dapat menyimpan occupancy/tenant snapshot tanpa mengubah konsep bahwa tagihan adalah milik kamar.

## 15. Status Tagihan

Status:
- BELUM_BAYAR
- SEBAGIAN
- LUNAS
- TERLAMBAT

Aturan:
- total pembayaran = 0 → BELUM_BAYAR
- 0 < pembayaran < nominal → SEBAGIAN
- pembayaran >= nominal → LUNAS
- tanggal sekarang > jatuh tempo dan belum lunas → TERLAMBAT

LUNAS memiliki prioritas lebih tinggi daripada TERLAMBAT.

## 16. Pembayaran

Pembayaran dilakukan di luar aplikasi. Pemilik mencatat pembayaran yang diterima.

Metode:
- CASH
- TRANSFER

Data:
- id
- billId
- paymentDate
- amount
- method
- notes
- createdAt
- updatedAt

Satu tagihan dapat memiliki banyak pembayaran.

## 17. Pembayaran Sebagian

Dukung cicilan/partial payment.

Contoh:

```text
Tagihan Rp1.000.000
Bayar Rp500.000 → sisa Rp500.000
Bayar Rp500.000 → sisa Rp0 → LUNAS
```

Rumus:

```text
Sisa = Total Tagihan - Total Pembayaran
```

Nominal pembayaran baru harus > 0 dan tidak boleh melebihi sisa.

## 18. Halaman Belum Bayar

Tampilkan informasi sederhana:

```text
Budi
Kamar 01
Jatuh tempo: 20 Oktober
Sisa: Rp800.000

[Catat Pembayaran] [WhatsApp]
```

Untuk pembayaran sebagian tampilkan tagihan, total dibayar, dan sisa.

Tombol WhatsApp hanya membuka WhatsApp dengan pesan yang sudah diisi. Tidak perlu WhatsApp API pada MVP.

## 19. Keuangan

Keuangan memiliki tiga bagian:
1. Tagihan
2. Pembayaran
3. Belum Bayar

### Tagihan
Filter/search berdasarkan kamar, penghuni terkait, periode, dan status.

### Pembayaran
Riwayat pembayaran dengan filter tanggal, metode, dan kamar.

### Belum Bayar
Daftar tagihan BELUM_BAYAR, SEBAGIAN, dan TERLAMBAT.

## 20. Laporan

Filter:
- Bulan
- Tahun
- Rentang tanggal

Tampilkan:
- Total tagihan.
- Total pembayaran.
- Total belum dibayar.
- Jumlah transaksi.
- Penghuni aktif.
- Jumlah tagihan lunas.
- Jumlah tagihan belum lunas.

Laporan mengikuti rumah yang sedang dipilih.

## 21. Data Model

### User
```text
id
name
email
passwordHash
createdAt
updatedAt
```

### Property / Rumah
```text
id
name
createdAt
updatedAt
```

Data awal: Rumah 1, Rumah 2, Rumah 3.

### Room / Kamar
```text
id
propertyId
roomNumber
price
notes
createdAt
updatedAt
```

### Tenant / Penghuni
```text
id
name
phone
ktpPhoto
originAddress
occupation
status
notes
createdAt
updatedAt
```

### Occupancy / Riwayat Hunian
```text
id
tenantId
propertyId
roomId
startDate
endDate
status
notes
createdAt
updatedAt
```

### Bill / Tagihan
```text
id
propertyId
roomId
periodStart
periodEnd
amount
dueDate
status
notes
createdAt
updatedAt
```

### Payment / Pembayaran
```text
id
billId
paymentDate
amount
method
notes
createdAt
updatedAt
```

### Settings
```text
id
propertyId
settingKey
settingValue
```

## 22. Relasi

```text
USER
  ↓
PROPERTY / RUMAH
  ├── ROOM / KAMAR
  ├── TENANT / PENGHUNI melalui OCCUPANCY
  └── BILL / TAGIHAN
          ↓
      PAYMENT / PEMBAYARAN
```

Pastikan data Rumah 1, Rumah 2, dan Rumah 3 tidak tercampur.

## 23. Business Rules

1. Pemilik wajib login.
2. Penghuni tidak memiliki akun.
3. Penghuni tidak membayar melalui aplikasi.
4. Pemilik memilih rumah sebelum mengelola data rumah tersebut.
5. Nomor kamar unik dalam satu rumah.
6. Satu kamar dapat memiliki beberapa penghuni aktif.
7. Setiap kamar memiliki harga sendiri.
8. Perubahan harga tidak mengubah tagihan lama.
9. Penghuni keluar tetap tersimpan sebagai histori.
10. Penghuni dapat pindah kamar.
11. Perpindahan kamar menyimpan histori.
12. Tagihan berikutnya setelah pindah menggunakan harga kamar baru.
13. Tagihan lama tidak berubah.
14. Tagihan mengikuti siklus tanggal kamar.
15. Penghuni dalam kamar yang sama mengikuti tanggal tagihan kamar.
16. Satu tagihan dapat memiliki banyak pembayaran.
17. Pembayaran dapat sebagian.
18. Pembayaran tidak boleh melebihi sisa.
19. Status tagihan dihitung otomatis.
20. Kamar dengan penghuni aktif berstatus TERISI.
21. Kamar tanpa penghuni aktif berstatus KOSONG.
22. Jangan izinkan penghapusan kamar yang akan merusak histori.
23. Cegah tagihan duplikat untuk periode yang sama pada kamar yang sama.

## 24. Search dan Filter

### Kamar
- Nomor kamar
- Kosong/terisi

### Penghuni
- Nama
- Nomor HP
- Aktif/keluar
- Kamar

### Tagihan
- Kamar
- Penghuni terkait
- Status
- Periode

### Pembayaran
- Tanggal
- Metode
- Kamar

## 25. UI/UX

Gunakan desain:
- Mobile-first.
- Bersih.
- Modern.
- Sederhana.
- Tidak terlalu banyak statistik.
- Card untuk ringkasan.
- Modal/drawer untuk aksi singkat.
- Detail page untuk informasi panjang.
- Search bar.
- Filter sederhana.
- Confirmation dialog untuk aksi berisiko.
- Toast untuk sukses/gagal.
- Empty/loading/error states.

Status warna:
- LUNAS: hijau
- SEBAGIAN: kuning
- TERLAMBAT: merah
- BELUM_BAYAR: abu-abu
- KOSONG: abu-abu
- TERISI: warna utama yang konsisten

Jangan memakai terlalu banyak warna.

Pada HP hindari tabel lebar; gunakan card/list. Pada desktop bottom navigation dapat berubah menjadi sidebar.

## 26. Security

Karena ada foto KTP dan data pribadi:
- Password harus di-hash.
- Gunakan authentication dan authorization.
- Validasi frontend dan backend.
- Foto KTP tidak boleh publik.
- Batasi ukuran dan tipe upload.
- Gunakan HTTPS di production.
- Jangan menyimpan password plaintext.

## 27. Tech Stack

Frontend:
- React
- Vite
- React Router
- Tailwind CSS
- PWA plugin

Backend:
- Node.js
- Express.js

Database:
- MySQL
- Prisma ORM

Authentication:
- Session atau JWT
- bcrypt/Argon2

## 28. MVP

Wajib:
- Login pemilik.
- Rumah 1, 2, 3.
- Pilih rumah.
- CRUD kamar.
- Harga berbeda tiap kamar.
- Status kosong/terisi.
- CRUD penghuni.
- Foto KTP.
- Tanggal masuk/keluar.
- Multi-penghuni per kamar.
- Pindah kamar.
- Riwayat penghuni.
- Tagihan otomatis.
- Siklus tanggal tagihan.
- Snapshot harga tagihan.
- Status otomatis.
- Cash/transfer.
- Partial payment.
- Sisa pembayaran.
- Riwayat pembayaran.
- Daftar belum bayar.
- Dashboard sederhana.
- Laporan dasar.
- PWA dan responsive HP.

## 29. Fitur Setelah MVP

Prioritas berikutnya:
- Export Excel.
- Export PDF.
- Grafik pemasukan.
- Pengingat WhatsApp.
- Notifikasi jatuh tempo.
- Backup database.
- Activity log.
- Dashboard gabungan 3 rumah.

Jangan menambahkan fitur-fitur tersebut sebelum alur inti stabil.

## 30. User Flow

### Login
```text
Buka aplikasi → Login → Pilih Rumah → Dashboard
```

### Tambah kamar
```text
Pilih Rumah → Kamar → + Tambah Kamar → Nomor + Harga → Simpan
```

### Tambah penghuni
```text
Pilih Rumah → Penghuni → + Tambah Penghuni → Isi data → Upload KTP → Pilih kamar → Tanggal masuk → Simpan
```

### Penghuni keluar
```text
Penghuni → Detail → Penghuni Keluar → Tanggal keluar → Konfirmasi
```

### Pindah kamar
```text
Penghuni → Detail → Pindah Kamar → Pilih kamar baru → Tanggal pindah → Simpan
```

### Catat pembayaran
```text
Keuangan → Belum Bayar → Pilih tagihan → Catat Pembayaran → Nominal → CASH/TRANSFER → Simpan
```

## 31. Edge Cases

- Penghuni keluar: data tetap tersimpan.
- Penghuni pindah: histori lama tetap ada.
- Harga kamar berubah: tagihan lama tetap.
- Dua penghuni satu kamar: satu tagihan kamar.
- Pembayaran sebagian: status SEBAGIAN.
- Pembayaran terakhir: status LUNAS.
- Tagihan lewat jatuh tempo dan belum lunas: TERLAMBAT.
- Kamar kosong: tidak memiliki penghuni aktif.
- Kamar dihapus: hanya jika aman dan tidak merusak histori.
- Tagihan duplikat: harus dicegah.
- Upload KTP gagal: tampilkan error yang jelas.

## 32. Acceptance Criteria

MVP diterima jika:
- Pemilik dapat login.
- Pemilik dapat memilih Rumah 1/2/3.
- Data antar rumah terpisah.
- Pemilik dapat menambah kamar.
- Harga tiap kamar dapat berbeda.
- Kamar dapat menunjukkan kosong/terisi.
- Satu kamar dapat memiliki beberapa penghuni.
- Pemilik dapat menyimpan data dan foto KTP penghuni.
- Penghuni dapat masuk, pindah, dan keluar.
- Riwayat penghuni tetap tersimpan.
- Tagihan otomatis mengikuti siklus tanggal yang ditentukan.
- Tagihan lama tidak berubah ketika harga kamar berubah.
- Setelah pindah kamar, tagihan berikutnya menggunakan harga kamar baru.
- Pembayaran cash dan transfer dapat dicatat.
- Pembayaran sebagian dapat dicatat.
- Sisa pembayaran otomatis dihitung.
- Status tagihan otomatis benar.
- Pemilik dapat melihat siapa yang belum bayar.
- Laporan dasar tersedia.
- Aplikasi nyaman digunakan pada HP.
- Aplikasi dapat di-install sebagai PWA.
- Data tidak bergantung pada localStorage sebagai sumber utama.

## 33. Urutan Implementasi

1. Setup React/Vite, Tailwind, PWA.
2. Backend Node/Express.
3. Prisma + MySQL.
4. Authentication pemilik.
5. Rumah dan pemilihan rumah.
6. Kamar.
7. Penghuni.
8. Riwayat hunian dan pindah kamar.
9. Tagihan otomatis.
10. Pembayaran dan partial payment.
11. Belum Bayar.
12. Dashboard.
13. Laporan.
14. Security upload KTP.
15. Responsive/mobile polish.
16. PWA install.
17. Testing dan edge cases.

## 34. Instruksi Implementasi untuk Developer/AI Agent

Sebelum coding:
1. Baca seluruh PRD.
2. Periksa project yang sudah ada jika tersedia.
3. Jangan menghapus fitur yang masih relevan tanpa alasan.
4. Jangan membuat fitur di luar scope MVP tanpa diminta.
5. Pastikan model database mendukung multi-rumah, multi-penghuni per kamar, histori perpindahan, dan tagihan kamar.
6. Pastikan tagihan menyimpan snapshot nominal harga.
7. Pastikan status tagihan dihitung berdasarkan pembayaran dan jatuh tempo.
8. Jangan membuat akun atau login untuk penghuni.
9. Jangan membuat payment gateway.
10. Prioritaskan UX HP dan bahasa Indonesia sederhana.
11. Setiap perubahan database harus memiliki migration yang jelas.
12. Validasi penting harus ada di backend, bukan hanya frontend.
13. Uji kasus penghuni masuk, keluar, pindah kamar, dua penghuni dalam satu kamar, pembayaran sebagian, lunas, terlambat, dan perubahan harga.
14. Jangan menganggap tanggal tagihan selalu tanggal 1.
15. Jangan mencampur data Rumah 1, Rumah 2, dan Rumah 3.

## 35. Kesimpulan

Kost Manager harus menjadi aplikasi sederhana untuk pemilik kost, bukan sistem yang rumit.

Alur utama yang harus selalu terasa mudah:

```text
Login
↓
Pilih Rumah
↓
Lihat kondisi rumah
↓
Lihat kamar
↓
Lihat penghuni
↓
Tambah/pindah/keluarkan penghuni
↓
Lihat tagihan
↓
Catat pembayaran
↓
Lihat siapa yang belum bayar
```

Tujuan akhir produk:

> Pemilik kost dapat mengelola tiga rumah kost dari HP dengan cara yang sederhana, mengetahui siapa yang tinggal di setiap kamar, menjaga riwayat penghuni, mengetahui tagihan dan tunggakan, serta mencatat pembayaran tanpa proses yang membingungkan.
