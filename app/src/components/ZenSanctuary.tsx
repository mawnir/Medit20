import { useEffect, useState, type CSSProperties } from 'react'
import { clock, getSeries } from '../lib/manifest'
import { playMindfulChime } from '../lib/chime'
import { usePlayerActions, usePlayerState } from '../player/context'
import { BellIcon, CloseIcon, PauseIcon, PlayIcon } from './Icon'

const PROMPTS = [
  'Feel the steady weight of the body resting on the ground.',
  'Notice where attention drifts, and gently bring it back to the breath.',
  'Allow thoughts to pass like clouds across an open sky.',
  'Observe tension without judgment, and invite it to soften.',
  'Twenty minutes of presence: nowhere to go, nothing to fix.',
  'Listen to the silence between the sounds.',
]

export function ZenSanctuary({ onClose }: { onClose: () => void }) {
  const { track, playing, position, duration, rate, sleepEndsAt, sleepAtTrackEnd } = usePlayerState()
  const actions = usePlayerActions()
  const [promptIndex, setPromptIndex] = useState(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'b' || e.key === 'B') playMindfulChime()
      if (e.key === ' ') {
        e.preventDefault()
        actions.toggle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, actions])

  // Cycle prompt gently every 45s
  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % PROMPTS.length)
    }, 45000)
    return () => clearInterval(timer)
  }, [])

  const total = duration || track?.durationSec || 0
  const progressRatio = total > 0 ? Math.min(1, position / total) : 0
  const remaining = Math.max(0, total - position)
  const seriesTitle = track ? getSeries(track.series)?.title ?? 'Practice' : 'Mindful Sitting'

  return (
    <div className="sanctuary-overlay" role="dialog" aria-modal="true" aria-label="Zen Meditation Sanctuary">
      <div className="sanctuary-shell">
        <header className="sanctuary-head">
          <div className="sanctuary-brand">
            <span className="sanctuary-mark" aria-hidden="true" />
            <span>Meditaiton20 · Sanctuary</span>
          </div>
          <button
            type="button"
            className="sanctuary-close-btn"
            onClick={onClose}
            aria-label="Return to course view (Escape)"
            title="Return to course view (Escape)"
          >
            <CloseIcon />
            <span>Leave sanctuary</span>
          </button>
        </header>

        <main className="sanctuary-body">
          <div className="sanctuary-info">
            <span className="sanctuary-series">{seriesTitle}</span>
            <h1 className="sanctuary-title">{track?.title ?? 'Quiet Meditation'}</h1>
          </div>

          <div
            className="sanctuary-mandala-wrap"
            style={{ '--prog': progressRatio } as CSSProperties}
            data-playing={playing ? 'true' : undefined}
          >
            <svg className="sanctuary-mandala-svg" viewBox="0 0 240 240" aria-hidden="true">
              <circle className="mandala-track" cx="120" cy="120" r="102" />
              <circle
                className="mandala-fill"
                cx="120"
                cy="120"
                r="102"
                strokeDasharray="640"
                strokeDashoffset={640 * (1 - progressRatio)}
              />
            </svg>
            <div className="sanctuary-mandala-inner">
              <div className="sanctuary-time-box">
                <span className="sanctuary-clock">{clock(remaining)}</span>
                <span className="sanctuary-sub">{total > 0 ? 'remaining' : 'elapsed'}</span>
              </div>
            </div>
          </div>

          <div className="sanctuary-controls">
            <button
              type="button"
              className="sanctuary-skip-btn"
              onClick={() => actions.skip(-15)}
              aria-label="Back 15 seconds"
            >
              &#8722;15s
            </button>
            <button
              type="button"
              className="sanctuary-play-btn"
              onClick={actions.toggle}
              aria-label={playing ? 'Pause session' : 'Play session'}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              className="sanctuary-skip-btn"
              onClick={() => actions.skip(15)}
              aria-label="Forward 15 seconds"
            >
              +15s
            </button>
          </div>

          <div className="sanctuary-meta-bar">
            <button
              type="button"
              className="sanctuary-tool-btn"
              onClick={playMindfulChime}
              title="Ring singing bowl (Key: B)"
            >
              <BellIcon />
              <span>Singing chime</span>
            </button>
            {rate !== 1 && (
              <span className="sanctuary-badge">{rate}&#215; speed</span>
            )}
            {(sleepEndsAt || sleepAtTrackEnd) && (
              <span className="sanctuary-badge">Timer active</span>
            )}
          </div>

          <p className="sanctuary-prompt" aria-live="polite">
            &ldquo;{PROMPTS[promptIndex]}&rdquo;
          </p>
        </main>
      </div>
    </div>
  )
}

