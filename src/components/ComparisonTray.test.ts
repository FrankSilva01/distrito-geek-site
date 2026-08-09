import { describe, expect, it } from 'vitest'
import { shouldShowComparisonTray } from './ComparisonTray'

describe('shouldShowComparisonTray', () => {
  it('hides the tray on the comparison page and without selected products', () => {
    expect(shouldShowComparisonTray('/comparar', 2)).toBe(false)
    expect(shouldShowComparisonTray('/categoria/todos', 0)).toBe(false)
    expect(shouldShowComparisonTray('/categoria/todos', 2)).toBe(true)
  })
})
