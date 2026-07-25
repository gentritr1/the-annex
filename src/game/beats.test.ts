import { describe, expect, it } from 'vitest'
import {
  BEAT_HOLD_MAX_MS,
  BEAT_HOLD_MIN_MS,
  assembleBeats,
  beatHoldMs,
  splitClauses,
  type BeatLine,
} from './beats'
import { getCaseContent } from './content'
import type { FieldActionDefinition } from './types'

const base: FieldActionDefinition = {
  id: 'listen-mara',
  siteId: 'care-ward',
  title: 'Title',
  methodLabel: 'Care',
  description: 'Description.',
  consequence: 'Consequence.',
  methodTags: ['care'],
  evidenceId: 'sensory-echo',
  trust: {},
  alarmDelta: 0,
  grantsTribunalOverride: false,
  eventTitle: 'Event title',
  eventDetail: 'One clause. Two clause.',
}

function texts(lines: readonly BeatLine[]): string[] {
  return lines.map((line) => (line.kind === 'speaker' ? `[${line.speaker}]` : line.text))
}

describe('beatHoldMs', () => {
  it('holds a short clause at the floor and a long sentence at the ceiling', () => {
    expect(beatHoldMs('')).toBe(BEAT_HOLD_MIN_MS)
    expect(beatHoldMs('I didn’t.')).toBe(BEAT_HOLD_MIN_MS)
    expect(beatHoldMs('x'.repeat(400))).toBe(BEAT_HOLD_MAX_MS)
  })

  it('scales linearly between the floor and the ceiling', () => {
    // 900 + 45 * 40 = 2700, inside the clamp on both sides.
    expect(beatHoldMs('x'.repeat(40))).toBe(2700)
  })
})

describe('splitClauses', () => {
  it('keeps a closing quote attached to the sentence it closes', () => {
    expect(splitClauses('“There was no window. Write down that I know that.”')).toEqual([
      '“There was no window.',
      'Write down that I know that.”',
    ])
  })

  it('returns nothing for empty prose and never drops the tail', () => {
    expect(splitClauses('   ')).toEqual([])
    expect(splitClauses('No terminator here')).toEqual(['No terminator here'])
  })
})

describe('assembleBeats', () => {
  it('falls back to eventDetail clauses plus attributed reactions', () => {
    const lines = assembleBeats({
      ...base,
      reactions: [{ persona: 'shepherd', line: 'A shepherd line.' }],
    })
    expect(texts(lines)).toEqual([
      'One clause.',
      'Two clause.',
      '[shepherd]',
      'A shepherd line.',
    ])
  })

  it('emits one attribution header per speaker change, not per line', () => {
    const lines = assembleBeats({
      ...base,
      beat: [
        { text: 'Her line.' },
        { speaker: 'shepherd', text: 'One.' },
        { speaker: 'shepherd', text: 'Two.' },
        { speaker: 'registrar', text: 'Three.' },
      ],
    })
    expect(texts(lines)).toEqual([
      'Her line.',
      '[shepherd]',
      'One.',
      'Two.',
      '[registrar]',
      'Three.',
    ])
  })

  it('prefers the authored beat over the eventDetail assembly', () => {
    const lines = assembleBeats({
      ...base,
      reactions: [{ persona: 'shepherd', line: 'Ignored.' }],
      beat: [{ text: 'Authored only.' }],
    })
    expect(texts(lines)).toEqual(['Authored only.'])
  })

  it('stages an un-authored action without crashing on absent reactions', () => {
    expect(texts(assembleBeats(base))).toEqual(['One clause.', 'Two clause.'])
  })
})

describe('Case 77 Care ward 12 authors both staged beats', () => {
  const content = getCaseContent('case-77')
  const careWard = content.sites.find((site) => site.id === 'care-ward')

  it('authors a beat for every Care ward method', () => {
    const actions = (careWard?.actionIds ?? []).map((id) =>
      content.fieldActions.find((action) => action.id === id),
    )
    expect(actions).toHaveLength(2)
    actions.forEach((action) => {
      expect(action?.beat?.length ?? 0).toBeGreaterThan(0)
      assembleBeats(action!).forEach((line) => {
        if (line.kind === 'speaker') return
        expect(line.text.trim().length).toBeGreaterThan(0)
      })
    })
  })

  it('opens on her voice and closes on the persona who answers', () => {
    const listen = content.fieldActions.find((action) => action.id === 'listen-mara')!
    const lines = assembleBeats(listen)
    expect(lines[0]).toEqual({
      kind: 'subject',
      text: '“It rained on the window all night,” she told you.',
    })
    expect(lines.at(-1)?.kind).toBe('persona')
    expect(lines.filter((line) => line.kind === 'speaker')).toHaveLength(1)
  })

  it('gives the coercive method both disagreeing voices, in order', () => {
    const stress = content.fieldActions.find((action) => action.id === 'stress-test')!
    const speakers = assembleBeats(stress)
      .filter((line) => line.kind === 'speaker')
      .map((line) => (line.kind === 'speaker' ? line.speaker : ''))
    expect(speakers).toEqual(['shepherd', 'registrar'])
  })
})
