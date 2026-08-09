export type EngagementState = {
  favoriteIds: string[]
  compareIds: string[]
  recentIds: string[]
}

export const emptyEngagement: EngagementState = {
  favoriteIds: [],
  compareIds: [],
  recentIds: [],
}

const cleanIds = (value: unknown, limit: number) => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))].slice(0, limit)
}

export function normalizeEngagement(value: unknown): EngagementState {
  if (!value || typeof value !== 'object') return { ...emptyEngagement }
  const candidate = value as Partial<EngagementState>
  return {
    favoriteIds: cleanIds(candidate.favoriteIds, 100),
    compareIds: cleanIds(candidate.compareIds, 3),
    recentIds: cleanIds(candidate.recentIds, 8),
  }
}

const toggleId = (ids: string[], id: string, limit: number) => {
  if (ids.includes(id)) return ids.filter((item) => item !== id)
  return ids.length >= limit ? ids : [...ids, id]
}

export function toggleFavoriteState(state: EngagementState, id: string): EngagementState {
  return { ...state, favoriteIds: toggleId(state.favoriteIds, id, 100) }
}

export function toggleCompareState(state: EngagementState, id: string): EngagementState {
  return { ...state, compareIds: toggleId(state.compareIds, id, 3) }
}

export function recordRecentState(state: EngagementState, id: string): EngagementState {
  return { ...state, recentIds: [id, ...state.recentIds.filter((item) => item !== id)].slice(0, 8) }
}
