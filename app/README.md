# Meditaiton20

A quiet, tactile, local-first player and daily practice sanctuary for the twenty-minute meditation library.

Built with React 19 + TypeScript + Vite, art-directed according to `design-taste-frontend` craftsmanship principles.

## Features

- **Meditaiton20 Brand & Sanctuary Identity**: Serene, distraction-free environment.
- **Active Practice Shelf**: Automatically resumes your active session and tracks mindful streak days & total practice minutes.
- **Interactive Breath Cadence**: A gentle 4-4-6-2 rhythmic breathing circle for grounding before or during sits.
- **Tibetan Singing Bowl Chime**: Synthesized acoustic mindful bell using the Web Audio API with natural harmonics (432 Hz).
- **Four Practice Pathways**: Take 20, Focus, Stress, and Sleep.
- **Curriculum Filters & Favorites**: View all sessions, remaining, completed, or bookmark favorite sits.
- **Zen Sanctuary Mode**: Fullscreen, distraction-free meditation room with rotating mindfulness prompts and mandala progress ring.
- **Docked Audio Engine**: Persistent scrub bar, &plusmn;15s skip, playback speed (0.75&times; &ndash; 1.5&times;), and sleep timer.
- **Theme Support**: Seamless Light / Dark / System mode switching.
- **Keyboard Shortcuts**: `Space` (Play/Pause), `Z` (Zen Sanctuary), `B` (Sound Chime), `Left/Right Arrow` (&plusmn;15s seek), `Escape` (Close Sanctuary).

## Running it

```bash
npm install
npm run dev          # http://localhost:5180
```

Audio is served from `../web-audio` by a dev-only middleware in `vite.config.ts`, so the library never ends up in the build output.
