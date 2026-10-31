import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import {
  calculateMindfulStats,
  findMostRecentTrack,
  nextActionLabel,
  progressLabel,
  seriesCompletion,
  useProgress,
} from '../lib/progress'
import { allTracks, minutes } from '../lib/manifest'
import { usePlayerActions, usePlayerState } from '../player/context'
import type { Series } from '../types'
import { BreathGuide } from './BreathGuide'
import { PlayIcon, PauseIcon, ZenIcon } from './Icon'

export function Library({
  series,
  onOpenSanctuary,
}: {
  series: Series[]
  onOpenSanctuary?: () => void
}) {
  const progress = useProgress()
  const { track: currentPlaying, playing } = usePlayerState()
  const actions = usePlayerActions()

  const stats = calculateMindfulStats(progress, allTracks)
  const recent = findMostRecentTrack(progress, series)

  return (
    <div className="library-view">
      {/* Hero Header */}
      <header className="library-head">
        <h1 className="hero-title">
          Twenty minutes of daily stillness.
        </h1>
        <p className="library-lede">
          A quiet sanctuary for daily meditation. Four sequential courses, each session
          timed to twenty minutes, cultivating non-reactive attention one day at a time.
        </p>
      </header>

      {/* Continuity / Active Session Stage */}
      {recent && (
        <section className="resume-shelf" aria-labelledby="resume-heading">
          <div className="resume-card" data-ui="true">
            <div className="resume-content">
              <span className="shelf-label">Current practice</span>
              <h2 id="resume-heading" className="resume-title">
                {recent.series.title} &middot; {recent.track.title}
              </h2>
              <p className="resume-meta">
                <span>{minutes(recent.track.durationSec)}</span>
                {stats.activeStreakDays > 0 && (
                  <span>{stats.activeStreakDays} day streak</span>
                )}
                {stats.totalMinutes > 0 && (
                  <span>{stats.totalMinutes} total minutes sat</span>
                )}
              </p>
            </div>
            <div className="resume-controls">
              <button
                type="button"
                className="btn-primary"
                onClick={() => actions.play(recent.track)}
                aria-label={`Play ${recent.track.title} from ${recent.series.title}`}
              >
                {currentPlaying?.id === recent.track.id && playing ? (
                  <>
                    <PauseIcon />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <PlayIcon />
                    <span>{nextActionLabel(progress, [recent.track])}</span>
                  </>
                )}
              </button>
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
        </section>
      )}

      {/* Interactive Breath & Chime Anchor */}
      <section className="breath-section" aria-label="Mindful breath cadence">
        <BreathGuide />
      </section>

      {/* Practice Pathways */}
      <section className="topics-section" aria-labelledby="pathways-heading">
        <div className="section-header">
          <h2 id="pathways-heading" className="section-title">
            Practice pathways
          </h2>
          <span className="section-note">Sequential daily sits</span>
        </div>

        <ol className="pathway-grid">
          {series.map((entry) => {
            const fill = seriesCompletion(progress, entry.tracks)
            const label = progressLabel(progress, entry.tracks)
            const nextAction = nextActionLabel(progress, entry.tracks)

            return (
              <li key={entry.id} className="pathway-item">
                <article
                  className="pathway-card"
                  style={{ '--p': fill } as CSSProperties}
                  data-ui="true"
                >
                  <div className="pathway-top">
                    <span className="pathway-count-badge">
                      {entry.tracks.length} sessions
                    </span>
                    <span className="pathway-completion-text">{label}</span>
                  </div>

                  <h3 className="pathway-name">
                    <Link to={`/series/${entry.id}`} className="pathway-link">
                      {entry.title}
                    </Link>
                  </h3>
                  <p className="pathway-blurb">{entry.blurb}</p>

                  <div className="pathway-progress-bar" aria-hidden="true">
                    <div
                      className="pathway-progress-fill"
                      style={{ width: `${Math.round(fill * 100)}%` }}
                    />
                  </div>

                  <div className="pathway-footer">
                    <Link to={`/series/${entry.id}`} className="pathway-btn-action">
                      <span>{nextAction}</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </article>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
