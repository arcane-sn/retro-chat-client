import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// One stored message = already-decrypted plaintext for one room.
// Per-browser only; no server sync (accepted for MVP — see CLAUDE.md).
export type StoredMessage = {
  roomId: string
  clientMsgId: string
  text: string
  mine: boolean
  seq: number | null // null while still "sending" (not yet confirmed by server)
  senderId: string | null
  ts: number
}

interface ChatDB extends DBSchema {
  messages: {
    key: [string, string] // [roomId, clientMsgId]
    value: StoredMessage
    indexes: { 'by-room': string }
  }
}

let dbPromise: Promise<IDBPDatabase<ChatDB>> | null = null

function db(): Promise<IDBPDatabase<ChatDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>('chatbentar', 1, {
      upgrade(database) {
        const store = database.createObjectStore('messages', {
          keyPath: ['roomId', 'clientMsgId'],
        })
        store.createIndex('by-room', 'roomId')
      },
    })
  }
  return dbPromise
}

/** All cached messages for a room, ordered for display (confirmed by seq, then pending). */
export async function loadMessages(roomId: string): Promise<StoredMessage[]> {
  const all = await (await db()).getAllFromIndex('messages', 'by-room', roomId)
  return all.sort(compareForDisplay)
}

/** Insert or update one message (keyed by roomId + clientMsgId). */
export async function saveMessage(msg: StoredMessage): Promise<void> {
  await (await db()).put('messages', msg)
}

export function compareForDisplay(a: StoredMessage, b: StoredMessage): number {
  // Confirmed messages sort by server seq; pending ones go last, by local time.
  if (a.seq == null && b.seq == null) return a.ts - b.ts
  if (a.seq == null) return 1
  if (b.seq == null) return -1
  return a.seq - b.seq
}
