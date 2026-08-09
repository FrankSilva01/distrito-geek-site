import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ConsentBanner } from './ConsentBanner'
import { getConsent } from './events'

describe('Analytics consent banner', () => {
  it('allows visitors to decline while keeping collection denied', async () => {
    render(<ConsentBanner gtmId="GTM-KLJMDZ25" />)
    expect(screen.getByRole('dialog', { name: /privacidade e analytics/i })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /recusar analytics/i }))
    expect(getConsent()).toBe('denied')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull()
  })

  it('grants analytics only after acceptance', async () => {
    render(<ConsentBanner gtmId="GTM-KLJMDZ25" />)
    await userEvent.click(screen.getByRole('button', { name: /aceitar analytics/i }))
    expect(getConsent()).toBe('granted')
    expect(document.querySelector('script[src*="GTM-KLJMDZ25"]')).not.toBeNull()
  })
})
