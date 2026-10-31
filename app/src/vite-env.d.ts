/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for audio files. Defaults to /media (served from ../web-audio in dev). */
  readonly VITE_AUDIO_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
