import { useEffect, useState } from 'react'
import Landing from './Landing'
import ChatView from './ChatView'
import { parseHash, startNewSession, type Session } from './lib/room'

function App() {
  const [session, setSession] = useState<Session | null>(() => parseHash())

  // Keep view in sync with the URL fragment (back/forward, shared links).
  useEffect(() => {
    const onHashChange = () => setSession(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function leave() {
    window.location.hash = ''
  }

  // Remount the chat per room so socket/state reset cleanly on room change.
  if (session) return <ChatView key={session.roomId} session={session} onLeave={leave} />
  return <Landing onStartChat={startNewSession} />
}

export default App
