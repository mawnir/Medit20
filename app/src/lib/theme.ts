import { useSyncExternalStore } from 'react'

const PRIMARY_KEY = 'cm:theme'
const FALLBACK_KEY = 'meditaiton20-theme'

export type ThemePref = 'system' | 'light' | 'dark'
export type Resolved = 'light' | 'dark'

/** The order the toggle button cycles through. */
export const THEME_ORDER: ThemePref[] = ['light', 'dark', 'system']

const PAGE_COLORS: Record<Resolved, string> = {
  light: '#fafaf7',
  dark: '#0e0e12',
}

const listeners = new Set<() => void>()

function read(): ThemePref {
  try {
    const stored = localStorage.getItem(PRIMARY_KEY) || localStorage.getItem(FALLBACK_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Private mode or blocked storage
  }
  return 'light'
}

let pref: ThemePref = read()
const media: MediaQueryList | null =
  typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null

function resolved(p: ThemePref): Resolved {
  if (p !== 'system') return p
  return media?.matches ? 'dark' : 'light'
}

function paint() {
  const value = resolved(pref)
  document.documentElement.dataset.theme = value
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = PAGE_COLORS[value]
}

function notify() {
  for (const listener of listeners) listener()
}

if (media) {
  media.addEventListener('change', () => {
    if (pref === 'system') {
      paint()
      notify()
    }
  })
}

export function getThemePref(): ThemePref {
  return pref
}

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    localStorage.setItem(PRIMARY_KEY, next)
    localStorage.setItem(FALLBACK_KEY, next)
  } catch {
    // Unpersisted is fine
  }
  paint()
  notify()
}

export function useTheme(): ThemePref {
  return useSyncExternalStore(subscribe, getThemePref)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resolvedTheme(): Resolved {
  return resolved(pref)
}
