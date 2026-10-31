import { useEffect, useState } from 'react'
import { playMindfulChime } from '../lib/chime'
import { BellIcon } from './Icon'

type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'settle'

const PHASES: { phase: BreathPhase; label: string; duration: number }[] = [
  { phase: 'inhale', label: 'Inhale gently', duration: 4 },
  { phase: 'hold', label: 'Hold softly', duration: 4 },
  { phase: 'exhale', label: 'Exhale slowly', duration: 6 },
  { phase: 'settle', label: 'Rest and notice', duration: 2 },
]

export function BreathGuide({ standalone = false }: { standalone?: boolean }) {
  const [active, setActive] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(4)

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0)
      setSecondsLeft(4)
      return
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1
        // Advance phase
        setPhaseIndex((currIdx) => {
          const nextIdx = (currIdx + 1) % PHASES.length
          return nextIdx
        })
        return PHASES[(phaseIndex + 1) % PHASES.length].duration
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [active, phaseIndex])

  const currentPhase = PHASES[phaseIndex]

  return (
    <div className={`breath-card ${standalone ? 'breath-card-standalone' : ''}`} data-ui="true">
      <div className="breath-card-header">
        <div className="breath-meta">
          <h2 className="breath-title">Mindful breath & cadence</h2>
          <p className="breath-desc">
            Settle your nervous system before or alongside your twenty-minute sitting.
          </p>
        </div>
        <div className="breath-actions">
          <button
            type="button"
            className="chime-btn"
            onClick={playMindfulChime}
            title="Sound Tibetan singing bowl (Key: B)"
            aria-label="Sound Tibetan singing bowl"
          >
            <BellIcon />
            <span>Sound chime</span>
          </button>
          <button
            type="button"
            className={active ? 'btn-breath-stop' : 'btn-breath-start'}
            onClick={() => setActive(!active)}
            aria-pressed={active}
          >
            {active ? 'Pause cadence' : 'Begin breath guide'}
          </button>
        </div>
      </div>

      {active && (
        <div className="breath-viewport" aria-live="polite">
          <div className="breath-orb-wrap" data-phase={currentPhase.phase}>
            <div className="breath-orb-outer" />
            <div className="breath-orb-core" />
            <div className="breath-orb-text">
              <span className="breath-phase-label">{currentPhase.label}</span>
              <span className="breath-phase-seconds">{secondsLeft}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

