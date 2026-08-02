// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { CinematicPhaseHud } from './CinematicPhaseHud'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('CinematicPhaseHud', () => {
  it('mirrors the active case, objective, run, and derived metrics without owning controls', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    act(() => {
      root.render(
        <CinematicPhaseHud
          caseCode="CMA–81–C"
          caseTitle="The Commissioned Witness"
          phaseLabel="Tribunal channel"
          runNumber={2}
          objective="Issue a finding and accept where its legal cost will land."
          metrics={[
            { label: 'Evidence', value: '3', tone: 'open' },
            { label: 'Trace', value: '2', tone: 'warning' },
          ]}
        />,
      )
    })

    const hud = host.querySelector<HTMLElement>('.cinematic-phase-hud')!
    expect(hud.getAttribute('aria-label')).toBe('Tribunal channel heads-up display')
    expect(hud.textContent).toContain('CMA–81–C')
    expect(hud.textContent).toContain('The Commissioned Witness')
    expect(hud.textContent).toContain(
      'Issue a finding and accept where its legal cost will land.',
    )

    const values = Object.fromEntries(
      [...host.querySelectorAll<HTMLDivElement>('.cinematic-phase-hud-metrics > div')].map(
        (row) => [
          row.querySelector('dt')?.textContent ?? '',
          row.querySelector('dd')?.textContent ?? '',
        ],
      ),
    )
    expect(values).toEqual({ Evidence: '3', Trace: '2', Run: '02' })
    expect(host.querySelectorAll('button')).toHaveLength(0)

    act(() => root.unmount())
    host.remove()
  })
})
