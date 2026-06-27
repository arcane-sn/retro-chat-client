import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { encrypt, decrypt } from './crypto'
import {
  compareForDisplay,
  loadMessages,
  saveMessage,
  type StoredMessage,
} from './storage'
import type { Session } from './room'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'

// Wire contract — must match retro-chat-server exactly (see CLAUDE.md).
type JoinAck =
  | { ok: true; selfId: string; peers: string[]; lastSeq: number }
  | { ok: false; reason: string }

type ServerMessage = {
  seq: number
  ciphertext: string
  clientMsgId: string
  senderId: string
  serverTs: number
}

export type ChatStatus = 'connecting' | 'connected' | 'full' | 'error'

export type UseChat = {
  messages: StoredMessage[]
  status: ChatStatus
  peerPresent: boolean
  shareLink: string
  sendMessage: (text: string) => void
}

export function useChat(session: Session): UseChat {
  const { roomId, key } = session
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('connecting')
  const [peerCount, setPeerCount] = useState(0)

  const socketRef = useRef<Socket | null>(null)
  const selfIdRef = useRef<string | null>(null)

  // Upsert by clientMsgId, persist, and keep the list display-ordered.
  const upsert = useCallback((msg: StoredMessage) => {
    setMessages((prev) => {
      const next = prev.slice()
      const i = next.findIndex((m) => m.clientMsgId === msg.clientMsgId)
      // Authorship is fixed per clientMsgId. Preserve a known `mine` because
      // socket ids change across reconnects — a re-delivered self-message would
      // otherwise look like it came from the peer.
      const merged = i >= 0 ? { ...msg, mine: next[i].mine } : msg
      if (i >= 0) next[i] = merged
      else next.push(merged)
      next.sort(compareForDisplay)
      void saveMessage(merged)
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    // Render cached history first so reopening a room is instant + offline-readable.
    void loadMessages(roomId).then((cached) => {
      if (!cancelled) setMessages(cached)
    })

    const socket = io(SERVER_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join', { roomId }, (ack: JoinAck) => {
        if (cancelled) return
        if (!ack.ok) {
          setStatus(ack.reason === 'room_full' ? 'full' : 'error')
          return
        }
        selfIdRef.current = ack.selfId
        setPeerCount(ack.peers.length)
        setStatus('connected')
      })
    })

    socket.on('peer:join', () => setPeerCount((n) => n + 1))
    socket.on('peer:leave', () => setPeerCount((n) => Math.max(0, n - 1)))
    socket.on('connect_error', () => !cancelled && setStatus('error'))

    socket.on('message', (m: ServerMessage) => {
      const clientMsgId = m.clientMsgId || `srv_${m.seq}`
      void decrypt(m.ciphertext, key).then((text) => {
        if (cancelled) return
        upsert({
          roomId,
          clientMsgId,
          text,
          mine: m.senderId === selfIdRef.current,
          seq: m.seq,
          senderId: m.senderId,
          ts: m.serverTs,
        })
      })
    })

    return () => {
      cancelled = true
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId, key, upsert])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      const socket = socketRef.current
      if (!trimmed || !socket) return

      const clientMsgId = crypto.randomUUID()
      // Optimistic: show immediately as "sending" (seq null) until the echo confirms.
      upsert({
        roomId,
        clientMsgId,
        text: trimmed,
        mine: true,
        seq: null,
        senderId: selfIdRef.current,
        ts: Date.now(),
      })

      void encrypt(trimmed, key).then((ciphertext) => {
        socket.emit('message', { ciphertext, clientMsgId })
      })
    },
    [roomId, key, upsert],
  )

  return {
    messages,
    status,
    peerPresent: peerCount > 0,
    shareLink: window.location.href,
    sendMessage,
  }
}
