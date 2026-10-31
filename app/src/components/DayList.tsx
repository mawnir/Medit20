import type { CSSProperties } from 'react'
import { clock, minutes } from '../lib/manifest'
import { dayState, seriesCompletion, toggleFavorite, useFavorites, useProgress } from '../lib/progress'
import { usePlayerActions, usePlayerState } from '../player/context'
import type { Series, Track } from '../types'
import { CheckIcon, PauseIcon, PlayIcon, StarIcon } from './Icon'

export function DayList({
  series,
  filter = 'all',
}: {
  series: Series
  filter?: 'all' | 'todo' | 'done' | 'fav'
}) {
  const progress = useProgress()
  const favorites = useFavorites()
  const { track: current, playing, position } = usePlayerState()
  const actions = usePlayerActions()

  const fill = seriesCompletion(progress, series.tracks)

  const filteredTracks = series.tracks.filter((track: Track) => {
    const { state } = dayState(progress, track)
    if (filter === 'todo') return state !== 'done'
    if (filter === 'done') return state === 'done'
    if (filter === 'fav') return favorites.has(track.id)
    return true
  })

  if (filteredTracks.length === 0) {
    return (
      <div className="filter-empty" data-ui="true">
        <p>No sessions match this filter.</p>
      </div>
    )
  }

  return (
    <ol className="session-grid" style={{ '--fill': fill } as CSSProperties}>
      {filteredTracks.map((track) => {
        const { entry, state } = dayState(progress, track)
        const active = current?.id === track.id
        const isFav = favorites.has(track.id)

        let note = minutes(track.durationSec)
        if (state === 'done') note = 'Completed'
        else if (active) note = `${clock(position)} / ${clock(track.durationSec)}`
        else if (entry && entry.position > 0) note = `${clock(entry.position)} in`

        return (
          <li key={track.id} className="session-item">
            <div
              className="session-row"
              data-state={state}
              data-active={active || undefined}
              data-playing={(active && playing) || undefined}
              data-ui="true"
            >
              <button
                type="button"
                className="session-play-toggle"
                onClick={() => actions.play(track)}
                aria-label={active && playing ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {active && playing ? (
                  <PauseIcon />
                ) : state === 'done' ? (
                  <CheckIcon />
                ) : (
                  <PlayIcon />
                )}
              </button>

              <div className="session-info" onClick={() => actions.play(track)}>
                <div className="session-title-line">
                  <span className="session-name">{track.title}</span>
                  {active && <span className="now-playing-indicator">Now playing</span>}
                </div>
                <span className="session-note">{note}</span>
              </div>

              <div className="session-actions">
                <button
                  type="button"
                  className={`btn-fav ${isFav ? 'btn-fav-active' : ''}`}
                  onClick={() => toggleFavorite(track.id)}
                  title={isFav ? 'Remove from saved' : 'Save session'}
                  aria-label={isFav ? `Remove ${track.title} from saved` : `Save ${track.title}`}
                >
                  <StarIcon filled={isFav} />
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
