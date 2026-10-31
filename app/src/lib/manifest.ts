import raw from '../data/tracks.json'
import type { Manifest, Series, Track } from '../types'

export const manifest = raw as Manifest

export const series: Series[] = manifest.series

export const allTracks: Track[] = series.flatMap((s) => s.tracks)

const tracksById = new Map(allTracks.map((t) => [t.id, t]))
const seriesById = new Map<string, Series>(series.map((s) => [s.id, s]))

export function getTrack(id: string): Track | undefined {
  return tracksById.get(id)
}

export function getSeries(id: string): Series | undefined {
  return seriesById.get(id)
}

export function siblingsOf(track: Track): Track[] {
  return getSeries(track.series)?.tracks ?? [track]
}

export function mediaUrl(path: string): string {
  const base = (import.meta.env.VITE_AUDIO_BASE ?? '/media').replace(/\/+$/, '')
  return `${base}/${path}`
}

/** "21 min" — durations in the UI are approximate by design. */
export function minutes(seconds: number): string {
  return `${Math.max(1, Math.floor(seconds / 60))} min`
}

/** "12:04" */
export function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
