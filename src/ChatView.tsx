import { useEffect, useRef, useState } from 'react'
import './ChatView.css'
import { useChat } from './lib/useChat'
import type { StoredMessage } from './lib/storage'
import type { Session } from './lib/room'

type ChatViewProps = {
  session: Session
  onLeave: () => void
}

/** Short anonymous handle derived from a peer's socket id (display only). */
function handleFor(senderId: string | null): string {
  return `anon_${(senderId ?? '????').slice(0, 4)}`
}
function avatarFor(senderId: string | null): string {
  return (senderId ?? '??').slice(0, 2).toUpperCase()
}

export default function ChatView({ session, onLeave }: ChatViewProps) {
  const { messages, status, peerPresent, shareLink, sendMessage } = useChat(session)
  const [draft, setDraft] = useState('')

  if (status === 'connecting') {
    return (
      <Frame>
        <div className="cv__notice">
          <div className="cv__notice-title">MENYAMBUNG…</div>
          <p className="cv__notice-text">Lagi nyambung ke room. Bentar ya.</p>
        </div>
      </Frame>
    )
  }

  if (status === 'full') {
    return (
      <Frame>
        <div className="cv__notice">
          <div className="cv__notice-title">ROOM PENUH</div>
          <p className="cv__notice-text">
            Room ini udah dipakai berdua. Bikin room baru buat ngobrol.
          </p>
          <button type="button" className="cv__notice-btn" onClick={onLeave}>
            ROOM BARU
          </button>
        </div>
      </Frame>
    )
  }

  if (status === 'error') {
    return (
      <Frame>
        <div className="cv__notice">
          <div className="cv__notice-title">GAGAL KONEK</div>
          <p className="cv__notice-text">
            Nggak bisa nyambung ke server. Cek koneksi atau coba lagi.
          </p>
          <button
            type="button"
            className="cv__notice-btn"
            onClick={() => window.location.reload()}
          >
            COBA LAGI
          </button>
        </div>
      </Frame>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(draft)
    setDraft('')
  }

  return (
    <Frame>
      <div className="cv__header">
        <button type="button" className="cv__back" onClick={onLeave} aria-label="Kembali">
          &#8249;
        </button>
        <div>
          <div className="cv__title">ANON ROOM</div>
          <div className="cv__status">
            <span className={`cv__status-dot${peerPresent ? '' : ' cv__status-dot--off'}`} />
            {peerPresent ? '1 STRANGER HERE' : 'WAITING FOR PEER'}
          </div>
        </div>
        <CopyRoomButton shareLink={shareLink} />
      </div>

      <MessageList messages={messages} />

      <form className="cv__composer" onSubmit={submit}>
        <input
          className="cv__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message"
          autoFocus
        />
        <button type="submit" className="cv__send" disabled={!draft.trim()} aria-label="Kirim">
          &#9654;
        </button>
      </form>

      <div className="cv__scanlines" />
    </Frame>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="cv">
      <div className="cv__bezel">
        <div className="cv__screen">{children}</div>
      </div>
    </div>
  )
}

function MessageList({ messages }: { messages: StoredMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  return (
    <div className="cv__messages">
      <div className="cv__daymark">TODAY &middot; ANONYMOUS</div>

      {messages.map((m, i) => {
        const prev = messages[i - 1]
        const grouped = prev != null && prev.mine === m.mine && prev.senderId === m.senderId
        return (
          <div key={m.clientMsgId} className={`cv__row${m.mine ? ' cv__row--mine' : ''}`}>
            <div
              className={
                `cv__avatar ${m.mine ? 'cv__avatar--mine' : 'cv__avatar--peer'}` +
                (grouped ? ' cv__avatar--blank' : '')
              }
            >
              {m.mine ? 'ME' : avatarFor(m.senderId)}
            </div>
            <div className={`cv__col${m.mine ? ' cv__col--mine' : ''}`}>
              {!m.mine && !grouped && <div className="cv__name">{handleFor(m.senderId)}</div>}
              <div
                className={
                  `cv__bubble ${m.mine ? 'cv__bubble--mine' : 'cv__bubble--peer'}` +
                  (m.seq == null ? ' cv__bubble--sending' : '')
                }
              >
                {m.text}
              </div>
            </div>
          </div>
        )
      })}

      <div ref={endRef} />
    </div>
  )
}

/** Top-right header button: copies the room link to share with one other person. */
function CopyRoomButton({ shareLink }: { shareLink: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be blocked (insecure context); ignore silently.
    }
  }
  const label = copied ? 'Link room tersalin!' : 'Salin link room buat share'
  return (
    <button
      type="button"
      className="cv__copy"
      onClick={copy}
      aria-label={label}
      title={label}
    >
      <svg className="cv__copy-icon" viewBox="0 0 18 18" aria-hidden="true">
        <rect x="6" y="2" width="10" height="12" fill="var(--paper)" stroke="currentColor" strokeWidth="2" />
        <rect x="2" y="5" width="10" height="12" fill="var(--paper)" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className={`cv__tooltip${copied ? ' cv__tooltip--show' : ''}`}>{label}</span>
    </button>
  )
}
