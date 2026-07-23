import { describe, expect, it } from 'vitest'
import type { SiteDefinition } from '../game/types'
import { resolveRainPresenceState } from './rainPresence'

const definition: NonNullable<
  NonNullable<SiteDefinition['closeup']>['rainPresence']
> = {
  matteSrc: '/images/site-scenes/care-ward-rain-memory.jpg',
  actionTreatments: {
    'listen-mara': 'listening',
    'stress-test': 'pressure',
  },
}

describe('resolveRainPresenceState', () => {
  it('leaves the approved master idle without an authored action', () => {
    expect(resolveRainPresenceState(definition, null)).toBe('idle')
    expect(resolveRainPresenceState(undefined, 'listen-mara')).toBe('idle')
    expect(resolveRainPresenceState(definition, 'trace-checksum')).toBe('idle')
  })

  it('derives distinct listening and pressure previews', () => {
    expect(resolveRainPresenceState(definition, 'listen-mara')).toBe('listening-preview')
    expect(resolveRainPresenceState(definition, 'stress-test')).toBe('pressure-preview')
  })

  it('derives distinct filed states', () => {
    expect(resolveRainPresenceState(definition, null, 'listen-mara')).toBe(
      'listening-resolved',
    )
    expect(resolveRainPresenceState(definition, null, 'stress-test')).toBe(
      'pressure-resolved',
    )
  })

  it('lets the filed method override a transient preview', () => {
    expect(
      resolveRainPresenceState(definition, 'stress-test', 'listen-mara'),
    ).toBe('listening-resolved')
  })
})
