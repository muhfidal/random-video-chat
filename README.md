# Random Video Chat

Aplikasi video chat random sederhana seperti Omegle/Ome TV yang dibuat dengan Node.js, Socket.io, dan WebRTC.

## Fitur

- Video chat random dengan pengguna lain
- Tombol "Next" untuk mencari partner baru
- Tampilan responsif untuk desktop dan mobile
- Mendukung audio dan video

## Persyaratan

- Node.js (v14 atau lebih baru)
- NPM (Node Package Manager)
- Browser modern yang mendukung WebRTC (Chrome, Firefox, Safari, Edge)

## Instalasi

1. Clone repository ini
2. Install dependensi:
```bash
npm install
```

## Menjalankan Aplikasi

1. Jalankan server:
```bash
npm start
```

2. Buka browser dan akses:
```
http://localhost:3000
```

## Penggunaan

1. Klik tombol "Mulai Chat" untuk memulai
2. Izinkan akses kamera dan mikrofon ketika diminta
3. Tunggu hingga sistem menemukan partner
4. Gunakan tombol "Partner Berikutnya" untuk mencari partner baru
5. Gunakan tombol "Stop" untuk mengakhiri chat

## Keamanan

- Aplikasi menggunakan HTTPS untuk keamanan
- WebRTC menggunakan STUN server untuk NAT traversal
- Tidak ada penyimpanan data pribadi

## Lisensi

MIT License 