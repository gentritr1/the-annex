import { PersonaSigil } from '../ambience/sigils'
import { personaName } from '../game/content'
import type { PersonaReaction } from '../game/types'

interface ReactionQuotesProps {
  reactions?: readonly PersonaReaction[]
  // The log is a settled record, not a live beat: it suppresses the appear
  // animation so replayed events do not re-animate on every state change.
  variant?: 'live' | 'log'
}

// A compact attributed quote: the persona's sigil (fog, neutral — cyan/coral
// stay reserved for the trust pulse), their name, and the authored line in
// record-white. Shared by the filed site card, the model-filed block, and the
// event log so the three render identically.
export function ReactionQuotes({ reactions, variant = 'live' }: ReactionQuotesProps) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div className={`reaction-block ${variant === 'log' ? 'reaction-block-log' : ''}`}>
      {reactions.map((reaction) => (
        <div className="reaction-line" key={reaction.persona}>
          <span className="reaction-sigil" aria-hidden="true">
            <PersonaSigil personaId={reaction.persona} />
          </span>
          <div>
            <span className="reaction-name">{personaName(reaction.persona)}</span>
            <p className="reaction-quote">{reaction.line}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
