import { beforeEach, describe, expect, it } from 'vitest'
import { getConsent, loadTagManager, setConsent, track } from './events'

describe('consented analytics', () => {
  beforeEach(() => { document.head.querySelectorAll('[data-dg-gtm]').forEach((node) => node.remove()); delete window.dataLayer })

  it('loads GTM in denied consent mode but does not track before consent', () => {
    expect(getConsent()).toBeNull()
    expect(loadTagManager('GTM-KLJMDZ25')).toBe(true)
    expect(track({ event: 'view_category', category: 'miniaturas-rpg' })).toBe(false)
    expect(document.querySelector('script[src*="googletagmanager"]')).not.toBeNull()
    expect(window.dataLayer?.some((item) => Array.from(item as IArguments)[0] === 'consent' && Array.from(item as IArguments)[1] === 'default' && Array.from(item as IArguments)[2]?.analytics_storage === 'denied')).toBe(true)
  })

  it('loads one valid GTM container and pushes allow-listed events after consent', () => {
    setConsent('granted')
    expect(loadTagManager('GTM-KLJMDZ25')).toBe(true)
    expect(loadTagManager('GTM-KLJMDZ25')).toBe(true)
    expect(document.querySelectorAll('script[src*="GTM-KLJMDZ25"]')).toHaveLength(1)
    expect(track({ event: 'click_mercado_livre', product_id: 'p1', product_name: 'Mago', marketplace: 'mercado-livre', marketplace_url: 'https://produto.mercadolivre.com.br/MLB-1' })).toBe(true)
    expect(window.dataLayer).toContainEqual(expect.objectContaining({ event: 'click_mercado_livre', product_id: 'p1' }))
    expect(window.dataLayer?.some((item) => Array.from(item as IArguments)[0] === 'consent' && Array.from(item as IArguments)[1] === 'update' && Array.from(item as IArguments)[2]?.analytics_storage === 'granted')).toBe(true)
  })

  it('rejects invalid GTM identifiers', () => {
    setConsent('granted')
    expect(loadTagManager('G-MH9W3NFF5L')).toBe(false)
  })

  it('rejects incomplete guide events instead of sending (not set) dimensions', () => {
    setConsent('granted')
    expect(track({ event: 'guide_view', guide_slug: '', guide_title: 'Guia', guide_cluster: 'criaturas' })).toBe(false)
    expect(track({ event: 'guide_view', guide_slug: 'necromante-rpg', guide_title: 'Necromante no RPG', guide_cluster: 'criaturas' })).toBe(true)
  })
})
