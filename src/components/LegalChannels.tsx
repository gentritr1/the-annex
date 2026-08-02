import type { LegalChannelDefinition } from '../game/types'

interface LegalChannelsProps {
  channels: readonly LegalChannelDefinition[]
  compact?: boolean
}

// The two legal questions travel together but never collapse into one score.
// Authored text carries the status; tone is a secondary visual cue only.
export function LegalChannels({ channels, compact = false }: LegalChannelsProps) {
  if (compact) {
    return (
      <span className="legal-channels legal-channels--compact" role="group" aria-label="Legal force">
        {channels.map((channel) => (
          <span key={channel.id} data-tone={channel.tone}>
            <span className="legal-channel-label">{channel.label}</span>
            <span className="legal-channel-status">{channel.status}</span>
          </span>
        ))}
      </span>
    )
  }

  return (
    <dl className="legal-channels">
      {channels.map((channel) => (
        <div key={channel.id} data-tone={channel.tone}>
          <dt>{channel.label}</dt>
          <dd>{channel.status}</dd>
        </div>
      ))}
    </dl>
  )
}
