/**
 * Scans ../web-audio and writes src/data/tracks.json.
 *
 * Run after transcoding:  npm run manifest
 *
 * The output is committed rather than generated in CI, because durations come
 * from ffprobe and Cloudflare's build image does not ship ffmpeg.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const MEDIA_ROOT = resolve(process.cwd(), '..', 'web-audio')
const OUT_FILE = resolve(process.cwd(), 'src/data/tracks.json')

const SERIES = [
  {
    id: 'take20',
    title: 'Take 20',
    blurb: 'Twenty sessions of about twenty minutes, made to be done one day at a time.',
  },
  {
    id: 'focus',
    title: 'Focus',
    blurb: 'Thirty sessions of practising attention that lasts longer than the timer.',
  },
  {
    id: 'stress',
    title: 'Stress',
    blurb: 'Thirty sessions for the days that feel like too much.',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    blurb: 'Thirty sessions to end the day with, lights already off.',
  },
] as const

const FILE_RE = /^day-(\d+)(?:-part-(\d+))?\.m4a$/

function probeDuration(file: string): number {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  )
  return Math.round(Number(out.trim()))
}

const manifest: {
  series: {
    id: string
    title: string
    blurb: string
    tracks: {
      id: string
      series: string
      day: number
      part?: number
      title: string
      durationSec: number
      path: string
    }[]
  }[]
} = { series: [] }

for (const series of SERIES) {
  const dir = join(MEDIA_ROOT, series.id)
  if (!existsSync(dir)) {
    console.log(`skip ${series.id} (no directory at ${dir})`)
    continue
  }

  const files = readdirSync(dir)
    .filter((f) => FILE_RE.test(f))
    .sort((a, b) => {
      const [, da, pa] = FILE_RE.exec(a)!
      const [, db, pb] = FILE_RE.exec(b)!
      return Number(da) - Number(db) || Number(pa ?? 0) - Number(pb ?? 0)
    })

  if (files.length === 0) {
    console.log(`skip ${series.id} (no day-*.m4a files)`)
    continue
  }

  const tracks = files.map((file) => {
    const [, day, part] = FILE_RE.exec(file)!
    const dayNum = Number(day)
    const partNum = part ? Number(part) : undefined
    return {
      id: `${series.id}-${String(dayNum).padStart(2, '0')}${partNum ? `-p${partNum}` : ''}`,
      series: series.id,
      day: dayNum,
      ...(partNum ? { part: partNum } : {}),
      title: partNum ? `Day ${dayNum}, part ${partNum}` : `Day ${dayNum}`,
      durationSec: probeDuration(join(dir, file)),
      path: `${series.id}/${file}`,
    }
  })

  // A source rip may label its only audio file "part 2" because the
  // introduction was a separate video. With nothing to distinguish it
  // from, the part suffix is noise in the player.
  const perDay = new Map<number, number>()
  for (const track of tracks) perDay.set(track.day, (perDay.get(track.day) ?? 0) + 1)
  for (const track of tracks) {
    if (track.part && perDay.get(track.day) === 1) {
      delete (track as { part?: number }).part
      track.title = `Day ${track.day}`
    }
  }

  const days = new Set(tracks.map((t) => t.day)).size
  console.log(`${series.id}: ${tracks.length} tracks across ${days} days`)

  manifest.series.push({ ...series, tracks })
}

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote ${OUT_FILE}`)
