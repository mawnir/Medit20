import { useSyncExternalStore } from 'react'
import type { Series, Track } from '../types'

export interface ProgressEntry {
  /** Seconds listened. */
  position: number
  /** Last known duration in seconds. */
  duration: number
  completed: boolean
  updatedAt: number
}

type ProgressMap = Record<string, ProgressEntry>

const PROGRESS_KEY = 'headspace.progress.v1'
const FAVORITES_KEY = 'meditaiton20.favorites.v1'

/** A track counts as finished once this much of it has been heard. */
const COMPLETE_AT = 0.95

let cache: ProgressMap | null = null

function load(): ProgressMap {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    cache = parsed && typeof parsed === 'object' ? (parsed as ProgressMap) : {}
  } catch {
    cache = {}
  }
  return cache
}

let snapshot: ProgressMap = { ...load() }
const listeners = new Set<() => void>()

function commit() {
  snapshot = { ...load() }
  for (const listener of listeners) listener()
}

function persist() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(load()))
  } catch {
    // Private browsing or full quota
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): ProgressMap {
  return snapshot
}

/** Records a position without marking the track complete unless over 95%. */
export function savePosition(trackId: string, position: number, duration: number): void {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return
  const map = load()
  const completed = position / duration >= COMPLETE_AT
  map[trackId] = {
    position: completed ? duration : position,
    duration,
    completed,
    updatedAt: Date.now(),
  }
  persist()
  commit()
}

export function resetTrack(trackId: string): void {
  const map = load()
  delete map[trackId]
  persist()
  commit()
}

export function resetAllProgress(): void {
  cache = {}
  try {
    localStorage.removeItem(PROGRESS_KEY)
  } catch {
    // ignore
  }
  commit()
}

/** Where to resume from, or 0 when the track is finished or barely started. */
export function resumePosition(trackId: string): number {
  const entry = load()[trackId]
  if (!entry || entry.completed) return 0
  if (entry.position < 3) return 0
  if (entry.duration > 0 && entry.position > entry.duration - 5) return 0
  return entry.position
}

export interface DayState {
  entry?: ProgressEntry
  state: 'done' | 'current' | 'todo'
}

export function useProgress(): ProgressMap {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function dayState(progress: ProgressMap, track: Track): DayState {
  const entry = progress[track.id]
  if (entry?.completed) return { entry, state: 'done' }
  if (entry && entry.position > 0) return { entry, state: 'current' }
  return { entry, state: 'todo' }
}

/**
 * The session to put in front of the person: whatever they were part-way
 * through, otherwise the first unfinished one, otherwise the last one.
 */
export function nextUp(progress: ProgressMap, tracks: Track[]): Track | null {
  if (tracks.length === 0) return null

  const inProgress = tracks
    .filter((t) => {
      const e = progress[t.id]
      return e && !e.completed && e.position > 0
    })
    .sort((a, b) => (progress[b.id]?.updatedAt ?? 0) - (progress[a.id]?.updatedAt ?? 0))

  if (inProgress.length > 0) return inProgress[0]

  const firstTodo = tracks.find((t) => !progress[t.id]?.completed)
  if (firstTodo) return firstTodo

  return tracks[tracks.length - 1]
}

export function completedCount(progress: ProgressMap, tracks: Track[]): number {
  return tracks.filter((t) => progress[t.id]?.completed).length
}

/** How much of one session has been heard, from 0 to 1. */
export function trackFraction(progress: ProgressMap, track: Track): number {
  const entry = progress[track.id]
  if (!entry) return 0
  if (entry.completed) return 1
  const duration = entry.duration || track.durationSec
  if (duration <= 0) return 0
  return Math.min(1, Math.max(0, entry.position / duration))
}

/** Progress through a whole course, counting part-heard sessions. */
export function seriesCompletion(progress: ProgressMap, tracks: Track[]): number {
  if (tracks.length === 0) return 0
  const total = tracks.reduce((sum, track) => sum + trackFraction(progress, track), 0)
  return total / tracks.length
}

/** "7 of 20 complete" — the one line shown above a course progress bar. */
export function progressLabel(progress: ProgressMap, tracks: Track[]): string {
  if (tracks.length === 0) return 'No sessions'
  const done = completedCount(progress, tracks)
  if (done === 0) {
    const started = tracks.some((track) => trackFraction(progress, track) > 0)
    return started ? 'In progress' : 'Not started'
  }
  if (done === tracks.length) return `All ${tracks.length} completed`
  return `${done} of ${tracks.length} completed`
}

/** The next thing to do in a course. */
export function nextActionLabel(progress: ProgressMap, tracks: Track[]): string {
  const next = nextUp(progress, tracks)
  if (!next) return 'No sessions'

  const done = completedCount(progress, tracks)
  if (done === tracks.length) return 'Play again'

  const entry = progress[next.id]
  if (entry && !entry.completed && entry.position > 0) return `Resume ${next.title}`
  return done > 0 ? `Next: ${next.title}` : `Begin ${next.title}`
}

/**
 * Find the most recently active session across all courses to show on the Home view.
 */
export function findMostRecentTrack(
  progress: ProgressMap,
  allSeries: Series[]
): { track: Track; series: Series } | null {
  const activeEntries: { track: Track; series: Series; updatedAt: number }[] = []

  for (const s of allSeries) {
    for (const t of s.tracks) {
      const p = progress[t.id]
      if (p && p.updatedAt) {
        activeEntries.push({ track: t, series: s, updatedAt: p.updatedAt })
      }
    }
  }

  if (activeEntries.length > 0) {
    activeEntries.sort((a, b) => b.updatedAt - a.updatedAt)
    return { track: activeEntries[0].track, series: activeEntries[0].series }
  }

  // Fallback to the first track of the first series (usually Take 20 Day 1)
  if (allSeries.length > 0 && allSeries[0].tracks.length > 0) {
    return { track: allSeries[0].tracks[0], series: allSeries[0] }
  }

  return null
}

/**
 * Calculates total mindful minutes and consecutive active days.
 */
export function calculateMindfulStats(
  progress: ProgressMap,
  allTracks: Track[]
): {
  totalMinutes: number
  totalCompletedSessions: number
  activeStreakDays: number
} {
  let totalSeconds = 0
  let completedCount = 0
  const activeDates = new Set<string>()

  for (const track of allTracks) {
    const p = progress[track.id]
    if (p) {
      totalSeconds += Math.min(p.position, track.durationSec)
      if (p.completed) completedCount++
      if (p.updatedAt) {
        const d = new Date(p.updatedAt)
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        activeDates.add(dateKey)
      }
    }
  }

  // Calculate streak backwards from today
  let streak = 0
  const today = new Date()
  let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Check if today or yesterday was active
  const todayKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
  const yesterday = new Date(checkDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (activeDates.has(todayKey) || activeDates.has(yesterdayKey)) {
    if (!activeDates.has(todayKey)) {
      checkDate = yesterday
    }
    while (true) {
      const k = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      if (activeDates.has(k)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  return {
    totalMinutes: Math.floor(totalSeconds / 60),
    totalCompletedSessions: completedCount,
    activeStreakDays: streak,
  }
}

// ---------------------------------------------------------
// Favorites Store
// ---------------------------------------------------------

let favCache: Set<string> | null = null
const favListeners = new Set<() => void>()

function loadFavorites(): Set<string> {
  if (favCache) return favCache
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    favCache = raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    favCache = new Set()
  }
  return favCache
}

export function subscribeFavorites(cb: () => void): () => void {
  favListeners.add(cb)
  return () => favListeners.delete(cb)
}

export function getFavoritesSnapshot(): Set<string> {
  return loadFavorites()
}

export function useFavorites(): Set<string> {
  return useSyncExternalStore(subscribeFavorites, getFavoritesSnapshot, getFavoritesSnapshot)
}

export function toggleFavorite(trackId: string): void {
  const set = loadFavorites()
  if (set.has(trackId)) {
    set.delete(trackId)
  } else {
    set.add(trackId)
  }
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]))
  } catch {
    // Ignore storage issues
  }
  for (const listener of favListeners) listener()
}
