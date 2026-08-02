// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCaseContent, unnumberedReadingRoom } from '../game/content'
import type { SiteId, SiteWorldOutcome } from '../game/types'
import type { AnnexWorldHandle } from './createAnnexWorld'
import { containedPosterAnchor } from './posterProjection'

const worldModule = vi.hoisted(() => ({
  createAnnexWorld: vi.fn(),
}))

vi.mock('./createAnnexWorld', () => worldModule)

import { AnnexWorldStage } from './AnnexWorldStage'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const content = getCaseContent('case-77')
const world = content.scene.world!
const case81Content = getCaseContent('case-81')
const case81World = case81Content.scene.world!
const emptyOutcomes = new Map<SiteId, SiteWorldOutcome>()

type StageProps = ComponentProps<typeof AnnexWorldStage>

function stageProps(overrides: Partial<StageProps> = {}): StageProps {
  return {
    world,
    sites: content.sites,
    completedSiteIds: [],
    active: true,
    reducedMotion: false,
    alarmLevel: 0,
    authoritySignal: 'none',
    resolvedOutcomes: emptyOutcomes,
    onPortalActivate: () => undefined,
    ...overrides,
  }
}

function worldHandle(): AnnexWorldHandle {
  return {
    setSelection: vi.fn(),
    setPreview: vi.fn(),
    setCompleted: vi.fn(),
    setAlarm: vi.fn(),
    setAuthoritySignal: vi.fn(),
    setResolvedOutcomes: vi.fn(),
    setSecretRoomAvailable: vi.fn(),
    setReturnEmphasis: vi.fn(),
    invalidate: vi.fn(),
    destroy: vi.fn(),
  }
}

let host: HTMLDivElement
let root: Root | null

beforeEach(() => {
  worldModule.createAnnexWorld.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount())
  }
  host.remove()
  vi.restoreAllMocks()
})

async function settleWorldImport() {
  await act(async () => {
    await vi.dynamicImportSettled()
  })
}

describe('AnnexWorldStage progressive enhancement', () => {
  it('does not expose the unnumbered reader while its key capability is locked', () => {
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            reducedMotion: true,
            secretRoom: unnumberedReadingRoom,
            secretRoomAvailable: false,
            onSecretRoomActivate: () => undefined,
          })}
        />,
      )
    })

    expect(host.querySelector('.annex-world-secret-room')).toBeNull()
    expect(host.querySelectorAll('.annex-world-portal')).toHaveLength(world.portals.length)
  })

  it('removes hidden world portals from keyboard and assistive-tech navigation', () => {
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            active: false,
            reducedMotion: true,
            secretRoom: unnumberedReadingRoom,
            secretRoomAvailable: true,
            onSecretRoomActivate: () => undefined,
          })}
        />,
      )
    })

    const portalLayer = host.querySelector<HTMLElement>('.annex-world-portals')!
    const hiddenPortals = host.querySelectorAll<HTMLButtonElement>('.annex-world-portal')
    expect(portalLayer.getAttribute('aria-hidden')).toBe('true')
    expect(hiddenPortals).toHaveLength(world.portals.length)
    hiddenPortals.forEach((button) => {
      expect(button.disabled).toBe(true)
      expect(button.tabIndex).toBe(-1)
    })
    expect(host.querySelector('.annex-world-secret-room')).toBeNull()

    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            active: true,
            reducedMotion: true,
            secretRoom: unnumberedReadingRoom,
            secretRoomAvailable: true,
            onSecretRoomActivate: () => undefined,
          })}
        />,
      )
    })

    expect(portalLayer.hasAttribute('aria-hidden')).toBe(false)
    host.querySelectorAll<HTMLButtonElement>('.annex-world-portal').forEach((button) => {
      expect(button.disabled).toBe(false)
      expect(button.tabIndex).toBe(0)
    })
    expect(host.querySelector('.annex-world-secret-room')).not.toBeNull()
  })

  it('keeps one accessible 48px reader door on the authored poster fallback', async () => {
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            reducedMotion: true,
            secretRoom: unnumberedReadingRoom,
            secretRoomAvailable: true,
            onSecretRoomActivate: () => undefined,
          })}
        />,
      )
    })
    await settleWorldImport()

    const entry = unnumberedReadingRoom.entryAnchors.find(
      (candidate) => candidate.worldKind === world.kind,
    )!
    const button = host.querySelector<HTMLButtonElement>('.annex-world-secret-room')!
    expect(button.type).toBe('button')
    expect(button.getAttribute('aria-label')).toBe(entry.accessibleLabel)
    expect(button.getAttribute('data-secret-room')).toBe(unnumberedReadingRoom.id)
    expect(button.getAttribute('data-entry-anchor')).toBe(entry.id)
    expect(button.style.width).toBe('48px')
    expect(button.style.height).toBe('48px')
    const posterPosition = containedPosterAnchor(entry.posterAnchor)
    expect(button.style.left).toBe(posterPosition.left)
    // jsdom's CSS parser rewrites `min()` arithmetic, so verify that the
    // contained-poster axis landed without depending on its serialization.
    expect(button.style.top).toContain('50cqh')
    expect(button.textContent).toContain('04')
    expect(worldModule.createAnnexWorld).not.toHaveBeenCalled()
  })

  it('reports only the concealed door source when Reader Key 04 is turned', () => {
    const onSecretRoomActivate = vi.fn()
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            reducedMotion: true,
            secretRoom: unnumberedReadingRoom,
            secretRoomAvailable: true,
            onSecretRoomActivate,
          })}
        />,
      )
    })

    const button = host.querySelector<HTMLButtonElement>('.annex-world-secret-room')!
    act(() => button.click())

    expect(onSecretRoomActivate).toHaveBeenCalledOnce()
    expect(onSecretRoomActivate).toHaveBeenCalledWith(button)
    expect(onSecretRoomActivate.mock.calls[0]).toHaveLength(1)
  })

  it('keeps the poster and never creates a live world with reduced motion', async () => {
    act(() => {
      root!.render(<AnnexWorldStage {...stageProps({ reducedMotion: true })} />)
    })
    await settleWorldImport()

    const stage = host.querySelector<HTMLElement>('.annex-world-stage')!
    const poster = host.querySelector<HTMLImageElement>('.annex-world-stage > img')!
    const canvasHost = host.querySelector<HTMLElement>('.annex-world-canvas-host')!

    expect(stage.dataset.renderer).toBe('poster')
    expect(stage.dataset.worldLoop).toBe('idle')
    expect(poster.style.opacity).toBe('1')
    expect(canvasHost.style.opacity).toBe('0')
    expect(worldModule.createAnnexWorld).not.toHaveBeenCalled()
  })

  it('uses the same fallback contract for the Case 81 deposition annex', async () => {
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            world: case81World,
            sites: case81Content.sites,
            reducedMotion: true,
          })}
        />,
      )
    })
    await settleWorldImport()

    const stage = host.querySelector<HTMLElement>('.annex-world-stage')!
    const poster = host.querySelector<HTMLImageElement>('.annex-world-stage > img')!
    expect(stage.dataset.worldKind).toBe('deposition-annex')
    expect(stage.dataset.renderer).toBe('poster')
    expect(poster.getAttribute('src')).toBe('/images/case-81-deposition-annex.webp')
    expect(host.querySelectorAll('.annex-world-portal')).toHaveLength(4)
    expect(worldModule.createAnnexWorld).not.toHaveBeenCalled()
  })

  it('mirrors world inputs into a live handle and destroys it on unmount', async () => {
    const handle = worldHandle()
    const initialOutcomes = new Map<SiteId, SiteWorldOutcome>([
      [
        'care-ward',
        {
          outcomeId: 'ward-opened',
          variant: 'opened',
          portalLabel: 'The ward answers.',
          switcherLabel: 'Threshold open',
        },
      ],
    ])
    worldModule.createAnnexWorld.mockResolvedValue(handle)

    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            selectedSiteId: 'registry',
            completedSiteIds: ['care-ward'],
            alarmLevel: 2,
            authoritySignal: 'linked',
            resolvedOutcomes: initialOutcomes,
            secretRoom: unnumberedReadingRoom,
            secretRoomAvailable: true,
            onSecretRoomActivate: () => undefined,
          })}
        />,
      )
    })
    await settleWorldImport()

    expect(host.querySelector<HTMLElement>('.annex-world-stage')!.dataset.renderer).toBe('webgl')
    expect(handle.setSelection).toHaveBeenLastCalledWith('registry')
    expect(handle.setCompleted).toHaveBeenLastCalledWith(['care-ward'])
    expect(handle.setAlarm).toHaveBeenLastCalledWith(2)
    expect(handle.setAuthoritySignal).toHaveBeenLastCalledWith('linked')
    expect(handle.setResolvedOutcomes).toHaveBeenLastCalledWith(initialOutcomes)
    expect(handle.setSecretRoomAvailable).toHaveBeenLastCalledWith(true)

    const nextOutcomes = new Map<SiteId, SiteWorldOutcome>([
      [
        'maintenance',
        {
          outcomeId: 'maintenance-sealed',
          variant: 'sealed',
          portalLabel: 'The hatch is barred.',
          switcherLabel: 'Threshold sealed',
        },
      ],
    ])
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            selectedSiteId: 'maintenance',
            completedSiteIds: ['care-ward', 'maintenance'],
            alarmLevel: 3,
            authoritySignal: 'forged',
            resolvedOutcomes: nextOutcomes,
            secretRoom: unnumberedReadingRoom,
            secretRoomAvailable: false,
            onSecretRoomActivate: () => undefined,
          })}
        />,
      )
    })

    expect(handle.setSelection).toHaveBeenLastCalledWith('maintenance')
    expect(handle.setCompleted).toHaveBeenLastCalledWith(['care-ward', 'maintenance'])
    expect(handle.setAlarm).toHaveBeenLastCalledWith(3)
    expect(handle.setAuthoritySignal).toHaveBeenLastCalledWith('forged')
    expect(handle.setResolvedOutcomes).toHaveBeenLastCalledWith(nextOutcomes)
    expect(handle.setSecretRoomAvailable).toHaveBeenLastCalledWith(false)

    await act(async () => root!.unmount())
    root = null
    expect(handle.destroy).toHaveBeenCalledOnce()
  })

  it('keeps its DOM portals operable when live-world creation fails', async () => {
    const onPortalActivate = vi.fn()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    worldModule.createAnnexWorld.mockRejectedValue(new Error('WebGL unavailable'))

    act(() => {
      root!.render(<AnnexWorldStage {...stageProps({ onPortalActivate })} />)
    })
    await settleWorldImport()

    const stage = host.querySelector<HTMLElement>('.annex-world-stage')!
    const buttons = host.querySelectorAll<HTMLButtonElement>('.annex-world-portal')
    const registryButton = host.querySelector<HTMLButtonElement>('[data-site="registry"]')!

    expect(stage.dataset.renderer).toBe('fallback')
    expect(buttons).toHaveLength(world.portals.length)
    expect(registryButton.disabled).toBe(false)
    expect(registryButton.style.pointerEvents).toBe('auto')

    act(() => registryButton.click())
    expect(onPortalActivate).toHaveBeenCalledWith('registry', registryButton)
  })

  it('reports only the activated site id and its source button', () => {
    const onPortalActivate = vi.fn()
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({
            reducedMotion: true,
            selectedSiteId: 'registry',
            onPortalActivate,
          })}
        />,
      )
    })

    const maintenanceButton =
      host.querySelector<HTMLButtonElement>('[data-site="maintenance"]')!
    act(() => maintenanceButton.click())

    expect(onPortalActivate).toHaveBeenCalledOnce()
    expect(onPortalActivate).toHaveBeenCalledWith('maintenance', maintenanceButton)
    expect(onPortalActivate.mock.calls[0]).toHaveLength(2)
  })

  it('keeps authority state on portal semantics without a colliding stage badge', () => {
    act(() => {
      root!.render(
        <AnnexWorldStage
          {...stageProps({ reducedMotion: true, authoritySignal: 'linked' })}
        />,
      )
    })

    const stage = host.querySelector<HTMLElement>('.annex-world-stage')!
    expect(stage.dataset.authoritySignal).toBe('linked')
    expect(host.querySelector('.annex-world-authority-status')).toBeNull()
    expect(
      host.querySelector('[data-site="registry"]')?.getAttribute('aria-label'),
    ).toContain('Authority-family link active')
    expect(
      host.querySelector('[data-site="maintenance"]')?.getAttribute('aria-label'),
    ).toContain('Authority-family link active')
  })
})
