import { describe, expect, it } from 'vitest'
import { PREVIEW_TREATMENTS, type SiteDefinition } from '../game/types'
import { resolvePreviewTreatment } from './previewTreatment'

const definition: NonNullable<
  NonNullable<SiteDefinition['closeup']>['previewTreatment']
> = {
  matteSrc: '/images/site-scenes/care-ward-rain-memory.jpg',
  actionTreatments: {
    'listen-mara': 'listen',
    'stress-test': 'pressure',
  },
}

describe('resolvePreviewTreatment', () => {
  it('leaves an unauthored or unmapped plate at rest', () => {
    expect(resolvePreviewTreatment(undefined, 'listen-mara')).toBe('rest')
    expect(resolvePreviewTreatment(definition, null)).toBe('rest')
    expect(resolvePreviewTreatment(definition, 'trace-checksum')).toBe('rest')
  })

  it('derives one distinct token per authored method', () => {
    expect(resolvePreviewTreatment(definition, 'listen-mara')).toBe('listen')
    expect(resolvePreviewTreatment(definition, 'stress-test')).toBe('pressure')
  })

  it('holds the filed method over a transient preview', () => {
    expect(resolvePreviewTreatment(definition, 'stress-test', 'listen-mara')).toBe('listen')
    expect(resolvePreviewTreatment(definition, null, 'stress-test')).toBe('pressure')
  })

  it('only ever returns a token from the fixed presentation vocabulary', () => {
    const vocabulary = new Set<string>([...PREVIEW_TREATMENTS, 'rest'])
    ;(['listen-mara', 'stress-test', 'trace-checksum'] as const).forEach((actionId) => {
      expect(vocabulary.has(resolvePreviewTreatment(definition, actionId))).toBe(true)
    })
  })
})
