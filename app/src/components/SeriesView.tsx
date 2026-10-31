import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { clock, minutes } from '../lib/manifest'
import {
  nextUp,
  progressLabel,
  resetTrack,
  seriesCompletion,
  useProgress,
  type ProgressEntry,
} from '../lib/progress'
import { usePlayerActions, usePlayerState } from '../player/context'
import type { Series } from '../types'
import { ArrowLeftIcon, PlayIcon, PauseIcon, ZenIcon } from './Icon'
import { DayList } from './DayList'

function ctaLabel(entry: ProgressEntry | undefined, active: boolean, playing: boolean) {
  if (active && playing) return 'Pause'
  if (entry?.completed) return 'Play again'
  if (entry && entry.position > 0) return 'Resume'
  return 'Begin session'
}

export function SeriesView({
  series,
  onOpenSanctuary,
}: {
  series: Series
  onOpenSanctuary?: () => void
}) {
  const progress = useProgress()
  const { track: current, playing } = usePlayerState()
  const actions = usePlayerActions()
  const [filter, setFilter] = useState<'all' | 'todo' | 'done' | 'fav'>('all')

  const next = nextUp(progress, series.tracks)
  const fill = seriesCompletion(progress, series.tracks)

  if (!next) {
    return (
      <section className="empty">
        <h1>No sessions found</h1>
        <p>
          Add transcoded audio files to <code>web-audio/{series.id}</code>, then regenerate
          the manifest.
        </p>
      </section>
    )
  }

  const active = current?.id === next.id
  const entry = progress[next.id]
  const inProgress = Boolean(entry && entry.position > 0 && !entry.completed)
  const at = series.tracks.findIndex((t) => t.id === next.id)
  const dayNumber = next.title.match(/^Day\s+(\d+)/)?.[1] ?? String(next.day)

  const startOver = () => {
    resetTrack(next.id)
    if (active) actions.seek(0)
    else actions.play(next)
  }

  return (
    <div className="series-view">
      <nav className="series-back-nav" aria-label="Breadcrumb">
        <Link to="/" className="back-link">
          <ArrowLeftIcon />
          <span>All pathways</span>
        </Link>
      </nav>

      <header className="topic-head">
        <div className="topic-title-row">
          <h1 className="topic-title">{series.title}</h1>
          <span className="topic-total-badge">{series.tracks.length} sessions</span>
        </div>
        <p className="topic-blurb">{series.blurb}</p>

        <div className="topic-progress-box" data-ui="true">
          <div className="topic-progress-meta">
            <span className="progress-summary">{progressLabel(progress, series.tracks)}</span>
            <span className="progress-pct">{Math.round(fill * 100)}%</span>
          </div>
          <div
            className="topic-track"
            style={{ '--p': fill } as CSSProperties}
            aria-hidden="true"
          >
            <div className="topic-track-fill" style={{ width: `${Math.round(fill * 100)}%` }} />
          </div>
        </div>
      </header>

      {/* Up Next Card */}
      <section className="next-hero" aria-labelledby="next-session-heading">
        <div className="next-card" data-ui="true">
          <div className="next-badge">Up next</div>
          <div className="next-row">
            <div className="next-text-group">
              <h2 id="next-session-heading" className="next-day">
                <span className="next-day-word">Day</span>{' '}
                <span className="next-day-num">{dayNumber}</span>
              </h2>
              <p className="next-meta">
                <span>{minutes(next.durationSec)}</span>
                <span>Session {at + 1} of {series.tracks.length}</span>
                {inProgress && entry && <span>{clock(entry.position)} in</span>}
              </p>
            </div>

            <div className="next-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => actions.play(next)}
                aria-label={`${ctaLabel(entry, active, playing)} for Day ${dayNumber}`}
              >
                {active && playing ? <PauseIcon /> : <PlayIcon />}
                <span>{ctaLabel(entry, active, playing)}</span>
              </button>
              {inProgress && (
                <button type="button" className="btn-quiet" onClick={startOver}>
                  Start over
                </button>
              )}
              {onOpenSanctuary && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onOpenSanctuary}
                  title="Open Zen Sanctuary"
                >
                  <ZenIcon />
                  <span>Sanctuary</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Session Filter Tabs */}
      <section className="days-section" aria-labelledby="sessions-heading">
        <div className="days-header-row">
          <h2 id="sessions-heading" className="days-heading">
            Course curriculum
          </h2>

          <div className="filter-group" role="tablist" aria-label="Session filter">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`filter-btn ${filter === 'all' ? 'filter-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({series.tracks.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'todo'}
              className={`filter-btn ${filter === 'todo' ? 'filter-active' : ''}`}
              onClick={() => setFilter('todo')}
            >
              Remaining
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'done'}
              className={`filter-btn ${filter === 'done' ? 'filter-active' : ''}`}
              onClick={() => setFilter('done')}
            >
              Completed
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'fav'}
              className={`filter-btn ${filter === 'fav' ? 'filter-active' : ''}`}
              onClick={() => setFilter('fav')}
            >
              Saved
            </button>
          </div>
        </div>

        <DayList series={series} filter={filter} />
      </section>
    </div>
  )
}
