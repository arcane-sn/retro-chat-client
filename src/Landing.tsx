import './Landing.css'

type LandingProps = {
  /** Called when the user taps START CHAT — generates room + key and enters the chat. */
  onStartChat: () => void
}

/**
 * Retro "Chat Bentar" landing / bumper page.
 * Visuals ported from the Claude Design source; the START CHAT behaviour
 * (generate roomId + key, move into the chat) lives in the parent per CLAUDE.md.
 */
export default function Landing({ onStartChat }: LandingProps) {
  return (
    <div className="cb">
      <div className="cb__shadow">
        <div className="cb__bezel">
          <div className="cb__screen">
            {/* status bar */}
            <div className="cb__statusbar">
              <span>14:88</span>
              <span>CHATBENTAR.COM</span>
              <span>BATT[|||&middot;]</span>
            </div>

            {/* hero */}
            <div className="cb__hero">
              {/* ghost mascot */}
              <div className="cb__mascot">
                {/* speech bubble */}
                <div className="cb__bubble">
                  <div className="cb__bubble-body">halo?</div>
                  <div className="cb__bubble-tail" />
                </div>

                {/* ghost body + scallop, with bob */}
                <div className="cb__ghost">
                  <div className="cb__ghost-body">
                    <div className="cb__eye cb__eye--left">
                      <div className="cb__pupil" />
                    </div>
                    <div className="cb__eye cb__eye--right">
                      <div className="cb__pupil" />
                    </div>
                    <div className="cb__cheek cb__cheek--left" />
                    <div className="cb__cheek cb__cheek--right" />
                  </div>
                  <div className="cb__skirt">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>

              {/* wordmark */}
              <div className="cb__wordmark">
                CHAT
                <br />
                BENTAR
              </div>

              {/* .com tag */}
              <div className="cb__com">
                <div className="cb__com-rule" />
                <div className="cb__com-badge">.COM</div>
                <div className="cb__com-rule" />
              </div>

              {/* tagline */}
              <div className="cb__tagline">
                ngobrol bentar sama orang asing.
                <br />
                anonim total, tanpa drama.
              </div>

              {/* online chip */}
              <div className="cb__online">
                <span className="cb__dot" />
                <span className="cb__online-label">247 ANON ONLINE</span>
              </div>
            </div>

            {/* bottom CTA */}
            <div className="cb__cta">
              <div className="cb__cta-shadow">
                <button type="button" className="cb__start" onClick={onStartChat}>
                  <span className="cb__start-arrow">&#9654;</span>
                  START CHAT
                  <span className="cb__caret" />
                </button>
              </div>

              {/* reassurance */}
              <div className="cb__reassure">
                <span>TANPA DAFTAR</span>
                <span className="cb__reassure-sep">&#9670;</span>
                <span>ANONIM</span>
                <span className="cb__reassure-sep">&#9670;</span>
                <span>AUTO HILANG</span>
              </div>

              {/* footer */}
              <div className="cb__footer">EST.2026 &middot; CHATBENTAR.COM</div>
            </div>

            {/* scanlines */}
            <div className="cb__scanlines" />
          </div>
        </div>
      </div>
    </div>
  )
}
