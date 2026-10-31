export type SeriesId = 'take20' | 'focus' | 'stress' | 'sleep'

export interface Track {
  id: string
  series: SeriesId
  day: number
  part?: number
  /** "Day 7" or "Day 7, part 2" */
  title: string
  durationSec: number
  /** Path relative to the audio base URL, e.g. "take20/day-07.m4a" */
  path: string
}

export interface Series {
  id: SeriesId
  title: string
  blurb: string
  tracks: Track[]
}

export interface Manifest {
  series: Series[]
}
