/**
 * Mindful acoustic chime synthesized with Web Audio API.
 * Simulates a Tibetan singing bowl with fundamental at ~432 Hz and soft overtones.
 */
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

export function playMindfulChime(): void {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Frequencies: Fundamental (432Hz) + harmonic overtones
    const partials = [
      { freq: 432, gain: 0.35, decay: 4.8 },
      { freq: 864, gain: 0.18, decay: 3.6 },
      { freq: 1296, gain: 0.08, decay: 2.4 },
      { freq: 1728, gain: 0.03, decay: 1.6 },
    ]

    partials.forEach(({ freq, gain: peakGain, decay }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      // Slight detune for natural warmth
      osc.frequency.setValueAtTime(freq + (Math.random() * 1.2 - 0.6), now)

      gain.gain.setValueAtTime(0, now)
      // Soft gentle strike attack
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.03)
      // Exponential organic ring decay
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + decay + 0.1)
    })
  } catch {
    // AudioContext blocked or unsupported in this environment
  }
}

