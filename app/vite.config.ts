import { createReadStream, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * Serves ../web-audio at /media during `dev` and `preview`.
 *
 * The library is deliberately kept outside the project: `vite build` would
 * otherwise copy hundreds of megabytes of audio into dist/ on every build.
 * Range requests are handled here because seeking with <audio> needs 206s.
 */
function localMedia(): Plugin {
  const root = resolve(process.cwd(), '..', 'web-audio')

  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? ''
    if (!url.startsWith('/media/')) return next()

    const rel = decodeURIComponent(url.slice('/media/'.length).split('?')[0])
    const file = resolve(root, rel)
    if (!file.startsWith(root)) {
      res.statusCode = 403
      res.end()
      return
    }

    let size: number
    try {
      const stat = statSync(file)
      if (!stat.isFile()) throw new Error('not a file')
      size = stat.size
    } catch {
      res.statusCode = 404
      res.end()
      return
    }

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Type', extname(file) === '.m4a' ? 'audio/mp4' : 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')

    const range = req.headers.range
    if (!range) {
      res.statusCode = 200
      res.setHeader('Content-Length', size)
      createReadStream(file).pipe(res)
      return
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match) {
      res.statusCode = 416
      res.setHeader('Content-Range', `bytes */${size}`)
      res.end()
      return
    }

    const start = match[1] ? Number(match[1]) : 0
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1

    if (Number.isNaN(start) || start > end || start >= size) {
      res.statusCode = 416
      res.setHeader('Content-Range', `bytes */${size}`)
      res.end()
      return
    }

    res.statusCode = 206
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
    res.setHeader('Content-Length', end - start + 1)
    createReadStream(file, { start, end }).pipe(res)
  }

  return {
    name: 'local-media',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig({
  plugins: [react(), localMedia()],
  server: { port: 5180 },
  preview: { port: 5180 },
  build: { outDir: 'dist' },
})
