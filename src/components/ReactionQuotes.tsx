import { personaName } from '../game/content'
import type { PersonaReaction } from '../game/types'
import { PersonaPortrait } from './PersonaPortrait'

interface ReactionQuotesProps {
  reactions?: readonly PersonaReaction[]
  // The log is a settled record, not a live beat: it suppresses the appear
  // animation so replayed events do not re-animate on every state change.
  variant?: 'live' | 'log'
}

// A compact attributed quote: the persona's roster portrait (falling back to the
// sigil it has always had), their name, and the authored line in record-white.
// The portrait is decorative — the name is right there as text — so it renders
// alt="" inside an aria-hidden wrapper and nothing an AT user hears changes.
// Shared by the filed site card, the model-filed block, the event log, and the
// scene detail drawer, so all four render identically from this one seam.
export function ReactionQuotes({ reactions, variant = 'live' }: ReactionQuotesProps) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div className={`reaction-block ${variant === 'log' ? 'reaction-block-log' : ''}`}>
      {reactions.map((reaction) => (
        <div className="reaction-line" key={reaction.persona}>
          <PersonaPortrait personaId={reaction.persona} size="chip" />
          <div>
            <span className="reaction-name">{personaName(reaction.persona)}</span>
            <p className="reaction-quote">{reaction.line}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
