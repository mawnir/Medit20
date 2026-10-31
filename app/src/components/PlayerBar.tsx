import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { clock, getSeries } from '../lib/manifest'
import { usePlayerActions, usePlayerState } from '../player/context'
import { ExpandIcon, PauseIcon, PlayIcon } from './Icon'

const RATES = [0.75, 1, 1.25, 1.5]

const SLEEP_OPTIONS: { label: string; value: number | 'track' | null }[] = [
  { label: 'Off', value: null },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '20 minutes', value: 20 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: 'End of session', value: 'track' },
]

export function PlayerBar({ onOpenSanctuary }: { onOpenSanctuary?: () => void }) {
  const {
    track,
    playing,
    buffering,
    position,
    duration,
    rate,
    sleepEndsAt,
    sleepAtTrackEnd,
    error,
  } = usePlayerState()
  const actions = usePlayerActions()

  const [drag, setDrag] = useState<number | null>(null)
  const [sleepOpen, setSleepOpen] = useState(false)
  const commitRef = useRef<number | null>(null)
  const sleepWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!sleepWrapRef.current?.contains(event.target as Node)) setSleepOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSleepOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(
    () => () => {
      if (commitRef.current) window.clearTimeout(commitRef.current)
    },
    []
  )

  const total = duration || track?.durationSec || 0
  const shown = drag ?? position

  const scrub = (value: number) => {
    setDrag(value)
    if (commitRef.current) window.clearTimeout(commitRef.current)
    commitRef.current = window.setTimeout(() => {
      actions.seek(value)
      setDrag(null)
    }, 200)
  }

  if (!track) return null

  const seriesTitle = getSeries(track.series)?.title ?? ''
  const nextRate = RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1
  const sleepMinutes = sleepEndsAt
    ? Math.max(1, Math.round((sleepEndsAt - Date.now()) / 60_000))
    : 0

  let sleepHint = ''
  if (sleepAtTrackEnd) sleepHint = 'Stops at end of session'
  else if (sleepEndsAt) sleepHint = `Stops in ${sleepMinutes} min`

  return (
    <aside className="player-bar-dock" role="region" aria-label="Now playing player" data-ui="true">
      <div className="player-container">
        {/* Track Title Info */}
        <div className="player-track-info">
          <span className="player-title">{track.title}</span>
          <Link className="player-series-link" to={`/series/${track.series}`}>
            {seriesTitle}
          </Link>
        </div>

        {/* Scrub Slider */}
        <div className="player-scrub-box">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.round(total))}
            step={1}
            value={Math.round(shown)}
            onChange={(event) => scrub(Number(event.target.value))}
            aria-label="Seek track"
            aria-valuetext={`${clock(shown)} of ${clock(total)}`}
            style={{ '--p': total > 0 ? Math.min(1, shown / total) : 0 } as CSSProperties}
          />
          <div className="scrub-times">
            <span>{clock(shown)}</span>
            <span>{clock(total)}</span>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="player-transport">
          <button
            className="transport-skip-btn"
            type="button"
            onClick={() => actions.skip(-15)}
            aria-label="Rewind 15 seconds"
          >
            &#8722;15s
          </button>
          <button
            className="transport-play-btn"
            type="button"
            onClick={actions.toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            data-buffering={buffering || undefined}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            className="transport-skip-btn"
            type="button"
            onClick={() => actions.skip(15)}
            aria-label="Skip forward 15 seconds"
          >
            +15s
          </button>
        </div>

        {/* Extra controls (speed, sleep, zen sanctuary) */}
        <div className="player-extras" ref={sleepWrapRef}>
          <button
            className="extra-btn"
            type="button"
            onClick={() => actions.setRate(nextRate)}
            aria-label={`Playback speed ${rate} times, change to ${nextRate} times`}
          >
            {rate}&#215;
          </button>

          <button
            className={`extra-btn ${sleepEndsAt || sleepAtTrackEnd ? 'extra-btn-active' : ''}`}
            type="button"
            onClick={() => setSleepOpen((open) => !open)}
            aria-expanded={sleepOpen}
            aria-controls="sleep-popover"
            aria-label={sleepHint ? `Sleep timer: ${sleepHint}` : 'Sleep timer'}
          >
            Timer
          </button>

          {onOpenSanctuary && (
            <button
              className="extra-btn sanctuary-pill-btn"
              type="button"
              onClick={onOpenSanctuary}
              title="Open full Zen Sanctuary (Key: Z)"
              aria-label="Open full Zen Sanctuary"
            >
              <ExpandIcon />
              <span className="sanctuary-pill-text">Focus</span>
            </button>
          )}

          {sleepOpen && (
            <div id="sleep-popover" className="sleep-popover" role="menu" aria-label="Sleep timer">
              {SLEEP_OPTIONS.map((option) => {
                const selected =
                  option.value === null
                    ? !sleepEndsAt && !sleepAtTrackEnd
                    : option.value === 'track'
                      ? sleepAtTrackEnd
                      : false
                return (
                  <button
                    key={option.label}
                    type="button"
                    role="menuitem"
                    className={`sleep-item ${selected ? 'sleep-item-selected' : ''}`}
                    onClick={() => {
                      actions.setSleepTimer(option.value)
                      setSleepOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {(error || sleepHint) && (
        <div className="player-dock-status" role={error ? 'alert' : undefined}>
          <span>{error ?? sleepHint}</span>
        </div>
      )}
    </aside>
  )
}
