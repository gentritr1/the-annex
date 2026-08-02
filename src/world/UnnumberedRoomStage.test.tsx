// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { unnumberedReadingRoom } from '../game/content'
import type { UnnumberedRoomHandle } from './createUnnumberedRoom'

const roomModule = vi.hoisted(() => ({
  createUnnumberedRoom: vi.fn(),
}))

vi.mock('./createUnnumberedRoom', () => roomModule)

import { UnnumberedRoomStage } from './UnnumberedRoomStage'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

type StageProps = ComponentProps<typeof UnnumberedRoomStage>

function stageProps(overrides: Partial<StageProps> = {}): StageProps {
  return {
    room: unnumberedReadingRoom,
    active: true,
    reducedMotion: false,
    onPointActivate: () => undefined,
    ...overrides,
  }
}

function roomHandle(): UnnumberedRoomHandle {
  return {
    setActivePoint: vi.fn(),
    setOpenedPoints: vi.fn(),
    setActiveInteraction: vi.fn(),
    invalidate: vi.fn(),
    destroy: vi.fn(),
  }
}

let host: HTMLDivElement
let root: Root | null

beforeEach(() => {
  roomModule.createUnnumberedRoom.mockReset()
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

async function settleRoomImport() {
  await act(async () => {
    await vi.dynamicImportSettled()
  })
}

describe('UnnumberedRoomStage progressive enhancement', () => {
  it('keeps a complete static room and never creates WebGL with reduced motion', async () => {
    act(() => {
      root!.render(
        <UnnumberedRoomStage
          {...stageProps({
            reducedMotion: true,
            openedPointIds: ['book-that-opens'],
          })}
        />,
      )
    })
    await settleRoomImport()

    const stage = host.querySelector<HTMLElement>('.unnumbered-room-stage')!
    const canvasHost = host.querySelector<HTMLElement>(
      '.unnumbered-room-canvas-host',
    )!
    const points = host.querySelectorAll<HTMLButtonElement>(
      '.unnumbered-room-point',
    )

    expect(stage.dataset.renderer).toBe('poster')
    expect(stage.dataset.roomLoop).toBe('idle')
    expect(canvasHost.style.opacity).toBe('0')
    expect(points).toHaveLength(unnumberedReadingRoom.readingPoints.length)
    points.forEach((point, index) => {
      expect(point.style.width).toBe('48px')
      expect(point.style.height).toBe('48px')
      expect(point.style.pointerEvents).toBe('auto')
      const ring = point.querySelector<HTMLElement>('.unnumbered-room-point-ring')!
      expect(ring.textContent).toBe(
        unnumberedReadingRoom.readingPoints[index].markerGlyph,
      )
      expect(ring.style.color).toBe('')
    })
    const introduction = host.querySelector<HTMLElement>(
      '.unnumbered-room-introduction',
    )!
    expect(introduction.textContent).toBe(
      unnumberedReadingRoom.accessibleIntroduction,
    )
    expect(introduction.closest('[aria-hidden="true"]')).toBeNull()
    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-point-id="book-that-opens"]',
      )!.dataset.opened,
    ).toBe('true')
    expect(roomModule.createUnnumberedRoom).not.toHaveBeenCalled()
  })

  it('reports only the activated point id and its source button', () => {
    const onPointActivate = vi.fn()
    act(() => {
      root!.render(
        <UnnumberedRoomStage
          {...stageProps({
            reducedMotion: true,
            activePointId: 'book-that-opens',
            onPointActivate,
          })}
        />,
      )
    })

    const button = host.querySelector<HTMLButtonElement>(
      '[data-point-id="two-orders"]',
    )!
    act(() => button.click())

    expect(onPointActivate).toHaveBeenCalledOnce()
    expect(onPointActivate).toHaveBeenCalledWith('two-orders', button)
    expect(onPointActivate.mock.calls[0]).toHaveLength(2)
  })

  it('mirrors view-local focus, opened lamps, and object actions into a live handle', async () => {
    const handle = roomHandle()
    roomModule.createUnnumberedRoom.mockResolvedValue(handle)
    const initialInteraction = {
      pointId: 'book-that-opens',
      interactionId: 'lift-repaired-cover',
    }

    act(() => {
      root!.render(
        <UnnumberedRoomStage
          {...stageProps({
            activePointId: 'book-that-opens',
            openedPointIds: ['book-that-opens'],
            activeInteraction: initialInteraction,
          })}
        />,
      )
    })
    await settleRoomImport()

    const stage = host.querySelector<HTMLElement>('.unnumbered-room-stage')!
    expect(stage.dataset.renderer).toBe('webgl')
    expect(handle.setActivePoint).toHaveBeenLastCalledWith('book-that-opens')
    expect(handle.setOpenedPoints).toHaveBeenLastCalledWith(['book-that-opens'])
    expect(handle.setActiveInteraction).toHaveBeenLastCalledWith(
      initialInteraction,
    )
    expect(handle.invalidate).toHaveBeenCalled()

    const nextInteraction = {
      pointId: 'two-orders',
      interactionId: 'xv-above-i',
    }
    act(() => {
      root!.render(
        <UnnumberedRoomStage
          {...stageProps({
            activePointId: 'two-orders',
            openedPointIds: ['book-that-opens', 'two-orders'],
            activeInteraction: nextInteraction,
          })}
        />,
      )
    })

    expect(handle.setActivePoint).toHaveBeenLastCalledWith('two-orders')
    expect(handle.setOpenedPoints).toHaveBeenLastCalledWith([
      'book-that-opens',
      'two-orders',
    ])
    expect(handle.setActiveInteraction).toHaveBeenLastCalledWith(nextInteraction)
    expect(
      host.querySelector<HTMLButtonElement>(
        '[data-point-id="book-that-opens"]',
      )!.dataset.opened,
    ).toBe('true')
    expect(
      host.querySelector<HTMLButtonElement>('[data-point-id="two-orders"]')!
        .ariaPressed,
    ).toBe('true')

    act(() => {
      root!.render(
        <UnnumberedRoomStage
          {...stageProps({
            activePointId: 'two-orders',
            openedPointIds: ['book-that-opens', 'two-orders'],
          })}
        />,
      )
    })
    expect(handle.setActiveInteraction).toHaveBeenLastCalledWith(undefined)

    await act(async () => root!.unmount())
    root = null
    expect(handle.destroy).toHaveBeenCalledOnce()
  })

  it('removes inactive point controls from keyboard and activation', async () => {
    const onPointActivate = vi.fn()
    act(() => {
      root!.render(
        <UnnumberedRoomStage
          {...stageProps({
            active: false,
            onPointActivate,
          })}
        />,
      )
    })
    await settleRoomImport()

    const points = host.querySelectorAll<HTMLButtonElement>(
      '.unnumbered-room-point',
    )
    points.forEach((point) => {
      expect(point.disabled).toBe(true)
      expect(point.tabIndex).toBe(-1)
      expect(point.style.opacity).toBe('0')
      expect(point.style.pointerEvents).toBe('none')
      act(() => point.click())
    })
    expect(onPointActivate).not.toHaveBeenCalled()
    expect(roomModule.createUnnumberedRoom).not.toHaveBeenCalled()
  })

  it('keeps every DOM reading point operable when WebGL creation fails', async () => {
    const onPointActivate = vi.fn()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    roomModule.createUnnumberedRoom.mockRejectedValue(
      new Error('WebGL unavailable'),
    )

    act(() => {
      root!.render(
        <UnnumberedRoomStage
          {...stageProps({
            openedPointIds: ['book-that-opens', 'two-orders'],
            onPointActivate,
          })}
        />,
      )
    })
    await settleRoomImport()

    const stage = host.querySelector<HTMLElement>('.unnumbered-room-stage')!
    const points = host.querySelectorAll<HTMLButtonElement>(
      '.unnumbered-room-point',
    )
    const button = host.querySelector<HTMLButtonElement>(
      '[data-point-id="unpressed-promise"]',
    )!

    expect(stage.dataset.renderer).toBe('fallback')
    expect(stage.dataset.roomLoop).toBe('idle')
    expect(points).toHaveLength(unnumberedReadingRoom.readingPoints.length)
    points.forEach((point) => {
      expect(point.disabled).toBe(false)
      expect(point.style.pointerEvents).toBe('auto')
    })

    act(() => button.click())
    expect(onPointActivate).toHaveBeenCalledWith('unpressed-promise', button)
  })

  it('falls back without losing its DOM controls after context loss', async () => {
    const handle = roomHandle()
    roomModule.createUnnumberedRoom.mockResolvedValue(handle)

    act(() => {
      root!.render(<UnnumberedRoomStage {...stageProps()} />)
    })
    await settleRoomImport()

    const rendererOptions = roomModule.createUnnumberedRoom.mock.calls[0][0] as {
      onContextLost: () => void
      onLoopChange: (running: boolean) => void
    }

    act(() => {
      rendererOptions.onLoopChange(true)
    })
    expect(
      host.querySelector<HTMLElement>('.unnumbered-room-stage')!.dataset.roomLoop,
    ).toBe('running')

    act(() => {
      rendererOptions.onContextLost()
    })

    const stage = host.querySelector<HTMLElement>('.unnumbered-room-stage')!
    expect(stage.dataset.renderer).toBe('fallback')
    expect(stage.dataset.roomLoop).toBe('idle')
    expect(
      host.querySelectorAll<HTMLButtonElement>('.unnumbered-room-point'),
    ).toHaveLength(unnumberedReadingRoom.readingPoints.length)
  })
})
