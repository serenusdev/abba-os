# Backup Restore dan Rollback Pondok OS

Dokumen ini adalah prosedur operasional minimum untuk Supabase production. Backup dan restore harus dijalankan oleh operator yang memiliki akses infrastruktur dan dicatat pada change log.

## Backup

Aktifkan Point in Time Recovery dan backup harian pada project Supabase production. Simpan salinan export terenkripsi di lokasi terpisah, dengan retensi yang mengikuti kebijakan privasi Pondok OS. Jangan memasukkan `SUPABASE_SERVICE_ROLE_KEY` atau `FIREBASE_SERVICE_ACCOUNT_KEY` ke dalam backup aplikasi, repository, atau log CI.

Sebelum migration production:

1. Catat commit aplikasi dan migration terakhir.
2. Ambil backup database terbaru dan verifikasi timestamp-nya.
3. Uji restore backup ke project staging.
4. Jalankan smoke test untuk login, presensi, laporan, task, dan calendar feed.

## Restore

Hentikan deployment yang sedang berjalan, pilih titik pemulihan yang disetujui, dan restore ke staging terlebih dahulu. Validasi row count, constraint, RLS, dan akses lintas dua akun uji. Setelah hasil disetujui, lakukan restore production pada maintenance window, rotasi secret yang terdampak, dan jalankan smoke test yang sama.

## Rollback aplikasi

Gunakan deployment sebelumnya yang diketahui sehat dan jangan menghapus migration yang sudah diterapkan. Untuk perubahan skema, buat migration kompensasi yang dapat dijalankan ulang. Catat waktu, operator, commit, migration, hasil smoke test, dan keputusan membuka kembali layanan.

Prosedur ini mendokumentasikan kontrol yang diperlukan; status backup production dan drill restore tetap harus diverifikasi di akun Supabase yang sebenarnya.
