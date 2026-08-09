import { describe, expect, it } from 'vitest'
import {
  emptyEngagement,
  normalizeEngagement,
  recordRecentState,
  toggleCompareState,
  toggleFavoriteState,
} from './product-engagement'

describe('product engagement state', () => {
  it('normalizes invalid persisted data without trusting unknown values', () => {
    expect(normalizeEngagement({ favoriteIds: ['a', 4, 'a'], compareIds: 'bad' })).toEqual({
      favoriteIds: ['a'],
      compareIds: [],
      recentIds: [],
    })
  })

  it('adds and removes favorites', () => {
    const added = toggleFavoriteState(emptyEngagement, 'product-1')
    expect(added.favoriteIds).toEqual(['product-1'])
    expect(toggleFavoriteState(added, 'product-1').favoriteIds).toEqual([])
  })

  it('limits comparison to three unique products', () => {
    const three = ['one', 'two', 'three'].reduce(toggleCompareState, emptyEngagement)
    expect(toggleCompareState(three, 'four').compareIds).toEqual(['one', 'two', 'three'])
  })

  it('keeps the eight most recently viewed unique products newest first', () => {
    const viewed = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'five']
      .reduce(recordRecentState, emptyEngagement)
    expect(viewed.recentIds).toEqual(['five', 'nine', 'eight', 'seven', 'six', 'four', 'three', 'two'])
  })
})
