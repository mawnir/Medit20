import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { getSeries, mediaUrl, siblingsOf } from '../lib/manifest'
import { resumePosition, savePosition } from '../lib/progress'
import type { Track } from '../types'
import { PlayerActionsContext, PlayerStateContext } from './context'
import type { PlayerActions, PlayerState, SleepChoice } from './types'

const initialState: PlayerState = {
  track: null,
  queue: [],
  index: -1,
  playing: false,
  buffering: false,
  position: 0,
  duration: 0,
  rate: 1,
  error: null,
  sleepEndsAt: null,
  sleepAtTrackEnd: false,
}

type Action =
  | { type: 'load'; track: Track; queue: Track[]; index: number }
  | { type: 'patch'; patch: Partial<PlayerState> }

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case 'load':
      return { ...state, track: action.track, queue: action.queue, index: action.index, position: 0, duration: 0, error: null }
    case 'patch':
      return { ...state, ...action.patch }
  }
}

/** Sleep fades out over this many ms before the timer expires. */
const FADE_MS = 30_000
/** How often a position is written to localStorage while playing. */
const SAVE_EVERY_MS = 4_000
const SKIPPED_ON_RESUME = 4

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, dispatch] = useReducer(reducer, initialState)

  // The audio element owns playback; stateRef lets stable callbacks read it.
  const stateRef = useRef(state)
  stateRef.current = state
  const savedAtRef = useRef(0)
  /** Metadata handler for the track being loaded, so a fast switch can cancel it. */
  const pendingMetaRef = useRef<(() => void) | null>(null)

  const flush = useCallback(() => {
    const audio = audioRef.current
    const track = stateRef.current.track
    if (!audio || !track || !(audio.duration > 0)) return
    savePosition(track.id, audio.currentTime, audio.duration)
  }, [])

  /* ---------------------------------------------------------------- *
   * Media element events (wired once)
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      const duration = audio.duration || stateRef.current.duration
      dispatch({ type: 'patch', patch: { position: audio.currentTime, duration } })

      const track = stateRef.current.track
      if (track && audio.duration > 0 && Date.now() - savedAtRef.current > SAVE_EVERY_MS) {
        savedAtRef.current = Date.now()
        savePosition(track.id, audio.currentTime, audio.duration)
      }
    }

    const onPlay = () => dispatch({ type: 'patch', patch: { playing: true, error: null } })

    const onPause = () => {
      dispatch({ type: 'patch', patch: { playing: false } })
      flush()
    }

    const onLoadedMetadata = () =>
      dispatch({ type: 'patch', patch: { duration: audio.duration || 0 } })

    const onWaiting = () => dispatch({ type: 'patch', patch: { buffering: true } })
    const onPlaying = () => dispatch({ type: 'patch', patch: { buffering: false } })

    const onEnded = () => {
      const track = stateRef.current.track
      const duration = audio.duration || track?.durationSec || 0
      if (track && duration > 0) savePosition(track.id, duration, duration)
      audio.volume = 1

      dispatch({
        type: 'patch',
        patch: {
          playing: false,
          buffering: false,
          position: duration,
          ...(stateRef.current.sleepAtTrackEnd ? { sleepAtTrackEnd: false, sleepEndsAt: null } : {}),
        },
      })
    }

    const onError = () =>
      dispatch({
        type: 'patch',
        patch: {
          playing: false,
          buffering: false,
          error: 'This session could not be played. Check that the file exists in web-audio.',
        },
      })

    // iOS suspends backgrounded tabs without firing anything reliable, so this
    // is the write that actually matters when the screen locks.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      document.removeEventListener('visibilitychange', onVisibility)
      audio.pause()
    }
  }, [flush])

  /* ---------------------------------------------------------------- *
   * Sleep timer
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const endsAt = state.sleepEndsAt
    if (!endsAt) return

    const id = window.setInterval(() => {
      const audio = audioRef.current
      if (!audio) return
      const remaining = endsAt - Date.now()

      if (remaining <= 0) {
        audio.pause()
        audio.volume = 1
        dispatch({ type: 'patch', patch: { sleepEndsAt: null, sleepAtTrackEnd: false } })
      } else if (remaining <= FADE_MS) {
        audio.volume = Math.max(0, remaining / FADE_MS)
      }
    }, 500)

    return () => window.clearInterval(id)
  }, [state.sleepEndsAt])

  /* ---------------------------------------------------------------- *
   * Loading. Done inside the click handler rather than an effect so
   * that play() still counts as a user gesture on iOS.
   * ---------------------------------------------------------------- */
  const load = useCallback((track: Track, autoplay: boolean) => {
    const queue = siblingsOf(track)
    dispatch({ type: 'load', track, queue, index: queue.findIndex((t) => t.id === track.id) })

    const audio = audioRef.current
    if (!audio) return

    const resumeAt = resumePosition(track.id)
    let gestureRejected = false

    const onMetadata = () => {
      if (pendingMetaRef.current === onMetadata) pendingMetaRef.current = null
      audio.volume = 1
      audio.playbackRate = stateRef.current.rate

      // currentTime is only honoured once metadata exists, never before.
      if (resumeAt > 0) {
        const limit = Math.max(0, (audio.duration || resumeAt) - SKIPPED_ON_RESUME)
        audio.currentTime = Math.min(resumeAt, limit)
      }
      // Retry only if the gesture-time play() was refused (iOS first-play).
      if (autoplay && gestureRejected && audio.paused) {
        void audio.play().catch(() => undefined)
      }
    }

    // A track switched mid-load would otherwise let the old handler seek the
    // new source to the previous track's position.
    if (pendingMetaRef.current) {
      audio.removeEventListener('loadedmetadata', pendingMetaRef.current)
    }
    pendingMetaRef.current = onMetadata

    audio.addEventListener('loadedmetadata', onMetadata, { once: true })
    audio.src = mediaUrl(track.path)
    audio.load()

    if (autoplay) {
      audio.play().catch(() => {
        gestureRejected = true
      })
    }
  }, [])

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */
  const actions = useMemo<PlayerActions>(() => {
    const seek = (seconds: number) => {
      const audio = audioRef.current
      if (!audio || !Number.isFinite(seconds)) return
      const max = audio.duration || 0
      audio.currentTime = Math.min(Math.max(0, seconds), max > 0 ? max - 0.5 : 0)
      dispatch({ type: 'patch', patch: { position: audio.currentTime } })
    }

    return {
      play(track) {
        const audio = audioRef.current
        const current = stateRef.current.track

        if (current && current.id === track.id && audio) {
          if (audio.paused) void audio.play().catch(() => undefined)
          else audio.pause()
          return
        }
        load(track, true)
      },

      toggle() {
        const audio = audioRef.current
        if (!audio || !stateRef.current.track) return
        if (audio.paused) void audio.play().catch(() => undefined)
        else audio.pause()
      },

      seek,

      skip(deltaSeconds) {
        const audio = audioRef.current
        if (!audio) return
        seek(audio.currentTime + deltaSeconds)
      },

      next() {
        const { queue, index } = stateRef.current
        const upcoming = queue[index + 1]
        if (upcoming) load(upcoming, true)
      },

      previous() {
        const { queue, index } = stateRef.current
        const earlier = queue[index - 1]
        if (earlier) load(earlier, true)
      },

      setRate(rate) {
        const audio = audioRef.current
        if (audio) audio.playbackRate = rate
        dispatch({ type: 'patch', patch: { rate } })
      },

      setSleepTimer(choice: SleepChoice) {
        const audio = audioRef.current
        if (audio && choice !== 'track') audio.volume = 1

        if (choice === null) {
          dispatch({ type: 'patch', patch: { sleepEndsAt: null, sleepAtTrackEnd: false } })
        } else if (choice === 'track') {
          dispatch({ type: 'patch', patch: { sleepEndsAt: null, sleepAtTrackEnd: true } })
        } else {
          dispatch({
            type: 'patch',
            patch: { sleepEndsAt: Date.now() + choice * 60_000, sleepAtTrackEnd: false },
          })
        }
      },
    }
  }, [load])

  /* ---------------------------------------------------------------- *
   * Lock screen / headphone controls
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!('mediaSession' in navigator) || !state.track) return
    const series = getSeries(state.track.series)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.track.title,
      artist: series?.title ?? '',
      album: series?.title ?? '',
    })
  }, [state.track])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused'
  }, [state.playing])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    session.setActionHandler('play', () => void audioRef.current?.play().catch(() => undefined))
    session.setActionHandler('pause', () => audioRef.current?.pause())
    session.setActionHandler('seekbackward', () => actions.skip(-15))
    session.setActionHandler('seekforward', () => actions.skip(15))
    session.setActionHandler('nexttrack', () => actions.next())
    session.setActionHandler('previoustrack', () => actions.previous())
    return () => {
      session.setActionHandler('play', null)
      session.setActionHandler('pause', null)
      session.setActionHandler('seekbackward', null)
      session.setActionHandler('seekforward', null)
      session.setActionHandler('nexttrack', null)
      session.setActionHandler('previoustrack', null)
    }
  }, [actions])

  return (
    <PlayerActionsContext.Provider value={actions}>
      <PlayerStateContext.Provider value={state}>
        {children}
        <audio ref={audioRef} preload="metadata" playsInline />
      </PlayerStateContext.Provider>
    </PlayerActionsContext.Provider>
  )
}
