import { createContext, useContext } from 'react'
import type { PlayerActions, PlayerState } from './types'

export const PlayerStateContext = createContext<PlayerState | null>(null)
export const PlayerActionsContext = createContext<PlayerActions | null>(null)

export function usePlayerState(): PlayerState {
  const value = useContext(PlayerStateContext)
  if (!value) throw new Error('usePlayerState must be used inside <PlayerProvider>')
  return value
}

export function usePlayerActions(): PlayerActions {
  const value = useContext(PlayerActionsContext)
  if (!value) throw new Error('usePlayerActions must be used inside <PlayerProvider>')
  return value
}
