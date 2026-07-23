import { describe, expect, it } from 'vitest'
import {
  acousticStepLabel,
  classificationStepLabel,
  custodyStepLabel,
  fieldCta,
  type FieldCtaState,
} from './fieldCta'

// A neutral baseline: nothing filed, a ritual still in progress. Each test tweaks
// only the fields relevant to the state it exercises.
const base: FieldCtaState = {
  tribunalReady: false,
  reconstructionFiled: false,
  completedSitesCount: 0,
  methodsVisible: false,
  ritualStepLabel: null,
}

describe('fieldCta — every progression state names its real next step', () => {
  it('tribunal-ready wins over everything else', () => {
    const cta = fieldCta({
      ...base,
      tribunalReady: true,
      completedSitesCount: 2,
      reconstructionFiled: true,
      methodsVisible: true,
    })
    expect(cta).toEqual({ kind: 'tribunal', label: 'Enter tribunal' })
  })

  it('first site filed, no model → open the memory lattice', () => {
    const cta = fieldCta({ ...base, completedSitesCount: 1, methodsVisible: true })
    expect(cta).toEqual({ kind: 'reconstruction', label: 'Open memory lattice' })
  })

  it('model filed but gate still closed → complete one more site', () => {
    const cta = fieldCta({
      ...base,
      completedSitesCount: 1,
      reconstructionFiled: true,
      methodsVisible: true,
    })
    expect(cta).toEqual({ kind: 'next-site', label: 'Complete one more site' })
  })

  it('nothing filed, mid-ritual → names the ritual step', () => {
    const cta = fieldCta({ ...base, ritualStepLabel: 'Seat the carriers on the rail' })
    expect(cta).toEqual({ kind: 'ritual-step', label: 'Seat the carriers on the rail' })
  })

  it('later ritual step is named too', () => {
    const cta = fieldCta({ ...base, ritualStepLabel: 'Read the audit mirror' })
    expect(cta).toEqual({ kind: 'ritual-step', label: 'Read the audit mirror' })
  })

  it('mid-ritual with no resolved step label falls back in-voice', () => {
    const cta = fieldCta({ ...base, ritualStepLabel: null })
    expect(cta).toEqual({ kind: 'ritual-step', label: 'Continue the field record' })
  })

  it('methods on screen, nothing filed → no footer CTA (live list carries it)', () => {
    const cta = fieldCta({ ...base, methodsVisible: true })
    expect(cta).toBeNull()
  })

  it('a plain (roomless) site reports methods visible at once → no CTA', () => {
    // A plain method site has no ritual: methodsVisible is true from the start.
    const cta = fieldCta({ ...base, methodsVisible: true, ritualStepLabel: null })
    expect(cta).toBeNull()
  })
})

describe('ritual step labels — terminal (methods) phases intentionally return null', () => {
  it('custody rail steps', () => {
    expect(custodyStepLabel('intake')).toBe('Seat the carriers on the rail')
    expect(custodyStepLabel('late-carrier')).toBe('Test the refused carrier')
    expect(custodyStepLabel('mirror')).toBe('Read the audit mirror')
    expect(custodyStepLabel('reading')).toBe('Take in the mirror’s mark')
    expect(custodyStepLabel('methods')).toBeNull()
  })

  it('classification room steps', () => {
    expect(classificationStepLabel('routine')).toBe('File the routine records')
    expect(classificationStepLabel('pocket')).toBe('Weigh the unclassifiable record')
    expect(classificationStepLabel('shelf-zero')).toBe('Decide the unlabeled shelf')
    expect(classificationStepLabel('log')).toBe('Read the restriction slips')
    expect(classificationStepLabel('unlocked')).toBeNull()
  })

  it('acoustic shadow steps', () => {
    expect(acousticStepLabel('survey')).toBe('Read the sensor cadence')
    expect(acousticStepLabel('crossing')).toBe('Cross on the masked band')
    expect(acousticStepLabel('route-ready')).toBeNull()
  })
})
