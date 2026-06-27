# CLAUDE.md — retro-chat-client

## Apa ini
Frontend React (Vite) buat aplikasi chat privat 1-on-1 bertema retro ("Chat Bentar"). Di-host statis di **Netlify**.
Pasangannya adalah repo **`retro-chat-server`** (Node.js + Socket.IO relay).

Repo ini yang pegang: **UI, generate room id + kunci enkripsi, enkripsi/dekripsi E2EE, dan cache lokal.** Server itu cuma tukang pos yang buta isi pesan.

## Sumber desain landing
Landing / bumper page diimport dari Claude Design: file **`Chat Bentar Landing.dc.html`**.
- Pakai desain itu sebagai tampilan landing.
- **Jangan** drop HTML bundle mentah ke dalam app. Integrasikan jadi komponen React yang rapi di project Vite.
- Desain = kulit visual. Logika (generate room, routing, socket, kripto) ikut file ini, bukan dari HTML import.

## Stack
- React + Vite (ESM)
- `socket.io-client`
- IndexedDB buat cache pesan lokal (boleh pakai wrapper `idb`)
- libsodium (`libsodium-wrappers`) buat E2EE — **Fase 3**
- Plain JavaScript dulu (boleh migrasi TS nanti, jangan sekarang)

## Prinsip privasi (JANGAN dilanggar)
1. **Room id & kunci digenerate DI SINI** pakai `crypto.getRandomValues`. Bukan di server.
2. **Kunci tidak pernah dikirim ke server.** Server cuma pernah menerima `roomId`, tidak pernah `key`.
3. **Room id & key hidup di URL fragment** (`#room=...&key=...`), bukan di query string (`?...`). Fragment tidak pernah dikirim ke server mana pun (termasuk Netlify).
4. **Enkripsi sebelum kirim, dekripsi setelah terima.** Server hanya melihat ciphertext opaque.

## Alur halaman
1. **Landing / bumper** (dari desain import): ada tombol **"Start chat"**.
2. Klik "Start chat" -> generate `roomId` acak (>=16 byte, base64url) + `key` acak -> set `location.hash = "#room=<roomId>&key=<key>"` -> pindah ke **Chat view** -> tampilkan link buat di-share.
3. **Buka via link** (`...#room=...&key=...`): parse fragment -> ambil `roomId` & `key` -> langsung masuk Chat view -> join.
4. **Chat view**: connect socket -> `join` -> render history dari cache -> kirim/terima.

## Kontrak Socket.IO (HARUS sama persis dengan server)
Client -> server:
- `join` `{ roomId }` -> ack `{ ok, selfId, peers, lastSeq }` atau `{ ok: false, reason }` (mis. `"room_full"`).
- `message` `{ ciphertext, clientMsgId }`

Server -> client:
- `message` `{ seq, ciphertext, clientMsgId, senderId, serverTs }` -> **urutkan tampilan berdasarkan `seq`**, bukan jam lokal.
- `peer:join` `{ peerId }` / `peer:leave` `{ peerId }` -> indikator online.
- `error` `{ reason }`

**Optimistic UI:** saat user kirim, tampilkan pesannya langsung pakai `clientMsgId` (status "sending"). Saat event `message` balik dengan `clientMsgId` yang sama, ganti jadi terkonfirmasi dan posisikan ulang sesuai `seq`.

**Room full:** kalau ack `room_full`, tampilkan layar "room ini sudah penuh / sudah dipakai berdua". Ini fitur privasi (room cuma buat 2 orang), bukan error biasa.

## Penyimpanan (IndexedDB)
- Simpan pesan yang **sudah didekripsi** (plaintext) per room, biar buka lagi langsung muncul & bisa baca offline.
- Sadar konsekuensi: per-browser / per-device. Buka di device lain = history lama nggak ikut (nggak ada sync server). Diterima buat MVP.
- **Jangan** pakai `localStorage` buat history. `localStorage` cuma boleh buat hal sepele non-sensitif.

## Enkripsi E2EE (Fase 3)
- Sebelum `emit("message")`: enkripsi plaintext pakai `key` dari fragment (libsodium) -> kirim hasilnya di field `ciphertext`.
- Saat terima `message`: dekripsi `ciphertext` pakai `key` -> tampilkan + simpan plaintext ke IndexedDB.
- **Fase 1-2** boleh kirim plaintext apa adanya di field `ciphertext` biar alur jalan dulu. Struktur pesan tidak berubah saat enkripsi dinyalakan -- cukup sisipkan langkah encrypt/decrypt.

## Config
- `VITE_SERVER_URL` = URL server Socket.IO. Dev: `http://localhost:3000`. Prod: URL Fly/Render.

## Yang TIDAK boleh
- Jangan kirim `key` atau plaintext ke server.
- Jangan taruh room id / key di query string -- harus di fragment (`#`).
- Jangan bikin akun, login, atau simpan PII.
- Jangan drop HTML bundle desain mentah; integrasikan sebagai komponen.

## Definition of done
- **Fase 2:** landing -> "Start chat" -> generate room + key -> share link -> dua browser join room yang sama -> kirim/terima real-time urut by `seq` -> history dari IndexedDB.
- **Fase 3:** pesan end-to-end encrypted; server cuma melihat ciphertext.