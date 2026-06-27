// Room id & encryption key are generated HERE in the browser, never on the server.
// They live in the URL fragment (#room=...&key=...) which is never sent over the wire.
// See CLAUDE.md "Prinsip privasi".

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

// The server only accepts room ids matching /^[A-Za-z0-9]{16,128}$/, so the id
// must be alphanumeric — base64url's `-`/`_` would be rejected as bad_room_id.
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** 22 random alphanumeric chars (~131 bits). Opaque id the server routes by. */
export function generateRoomId(length = 22): string {
  // Rejection-sample to avoid modulo bias (256 % 62 != 0; reject bytes >= 248).
  const out: string[] = []
  while (out.length < length) {
    const buf = randomBytes(length)
    for (let i = 0; i < buf.length && out.length < length; i++) {
      if (buf[i] < 248) out.push(ALPHANUM[buf[i] % 62])
    }
  }
  return out.join('')
}

/** 32 random bytes -> base64url. The E2EE key. Never leaves the client. */
export function generateKey(): string {
  return base64url(randomBytes(32))
}

export type Session = { roomId: string; key: string }

/** Parse `#room=<roomId>&key=<key>` from the current URL fragment. */
export function parseHash(): Session | null {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const roomId = params.get('room')
  const key = params.get('key')
  if (!roomId || !key) return null
  return { roomId, key }
}

/** Generate a fresh session and move into it via the fragment. */
export function startNewSession(): void {
  const roomId = generateRoomId()
  const key = generateKey()
  window.location.hash = `room=${roomId}&key=${key}`
}
