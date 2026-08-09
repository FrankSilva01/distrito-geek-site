import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import {
  emptyEngagement,
  normalizeEngagement,
  recordRecentState,
  toggleCompareState,
  toggleFavoriteState,
  type EngagementState,
} from '../domain/product-engagement'

const STORAGE_KEY = 'dg-product-engagement'

type EngagementContextValue = EngagementState & {
  toggleFavorite: (id: string) => void
  toggleCompare: (id: string) => void
  recordRecent: (id: string) => void
}

const fallback: EngagementContextValue = {
  ...emptyEngagement,
  toggleFavorite: () => undefined,
  toggleCompare: () => undefined,
  recordRecent: () => undefined,
}

const EngagementContext = createContext<EngagementContextValue>(fallback)

const loadState = () => {
  if (typeof window === 'undefined') return { ...emptyEngagement }
  try {
    return normalizeEngagement(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return { ...emptyEngagement }
  }
}

export function EngagementProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EngagementState>(loadState)
  const update = useCallback((transform: (current: EngagementState) => EngagementState) => {
    setState((current) => {
      const next = transform(current)
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* storage is optional */ }
      return next
    })
  }, [])
  const toggleFavorite = useCallback((id: string) => update((current) => toggleFavoriteState(current, id)), [update])
  const toggleCompare = useCallback((id: string) => update((current) => toggleCompareState(current, id)), [update])
  const recordRecent = useCallback((id: string) => update((current) => recordRecentState(current, id)), [update])
  const value = useMemo(() => ({ ...state, toggleFavorite, toggleCompare, recordRecent }), [state, toggleFavorite, toggleCompare, recordRecent])
  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>
}

export const useProductEngagement = () => useContext(EngagementContext)
