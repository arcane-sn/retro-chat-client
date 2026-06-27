import sodium from 'libsodium-wrappers'

// E2EE boundary (CLAUDE.md Fase 3). The message structure on the wire never
// changes — only the contents of the `ciphertext` field do. The server only
// ever sees this opaque blob; the `key` lives in the URL fragment and is never
// sent anywhere.
//
// Scheme: libsodium crypto_secretbox (XSalsa20-Poly1305, authenticated).
// Wire format of `ciphertext`: base64url( nonce[24] || secretbox(plaintext) ).

const B64 = sodium.base64_variants.URLSAFE_NO_PADDING

let readyPromise: Promise<void> | null = null
function ready(): Promise<void> {
  if (!readyPromise) readyPromise = sodium.ready
  return readyPromise
}

// Cache decoded keys — the same fragment key is reused for every message.
const keyCache = new Map<string, Uint8Array>()

function decodeKey(key: string): Uint8Array {
  const cached = keyCache.get(key)
  if (cached) return cached
  const bytes = sodium.from_base64(key, B64)
  if (bytes.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error('invalid encryption key length')
  }
  keyCache.set(key, bytes)
  return bytes
}

/** Encrypt plaintext with the room key. Returns the opaque wire blob. */
export async function encrypt(plaintext: string, key: string): Promise<string> {
  await ready()
  const k = decodeKey(key)
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const box = sodium.crypto_secretbox_easy(sodium.from_string(plaintext), nonce, k)
  const combined = new Uint8Array(nonce.length + box.length)
  combined.set(nonce)
  combined.set(box, nonce.length)
  return sodium.to_base64(combined, B64)
}

/** Decrypt a wire blob with the room key. Returns a marker if it can't be read. */
export async function decrypt(ciphertext: string, key: string): Promise<string> {
  await ready()
  const k = decodeKey(key)
  try {
    const combined = sodium.from_base64(ciphertext, B64)
    const n = sodium.crypto_secretbox_NONCEBYTES
    if (combined.length <= n) throw new Error('ciphertext too short')
    const nonce = combined.slice(0, n)
    const box = combined.slice(n)
    return sodium.to_string(sodium.crypto_secretbox_open_easy(box, nonce, k))
  } catch {
    // Wrong key, tampered, or a non-encrypted legacy payload.
    return '⚠ pesan tidak bisa dibaca'
  }
}
