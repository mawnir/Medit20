import type { Track } from '../types'

export interface PlayerState {
  track: Track | null
  /** Tracks of the series the current track belongs to. */
  queue: Track[]
  index: number
  playing: boolean
  buffering: boolean
  position: number
  duration: number
  rate: number
  error: string | null
  /** Epoch ms when playback should stop, from the sleep timer. */
  sleepEndsAt: number | null
  sleepAtTrackEnd: boolean
}

export type SleepChoice = number | 'track' | null

export interface PlayerActions {
  play: (track: Track) => void
  toggle: () => void
  seek: (seconds: number) => void
  skip: (deltaSeconds: number) => void
  next: () => void
  previous: () => void
  setRate: (rate: number) => void
  setSleepTimer: (choice: SleepChoice) => void
}
