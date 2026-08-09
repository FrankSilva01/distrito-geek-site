export type ConsentChoice = 'granted' | 'denied'
export type AnalyticsEventName = 'view_product' | 'view_category' | 'view_guide' | 'search_product' | 'filter_catalog' | 'view_item_list' | 'select_item' | 'click_mercado_livre' | 'click_shopee'
export type AnalyticsEvent = { event: AnalyticsEventName; product_id?: string; external_id?: string; product_name?: string; category?: string; price?: number; marketplace?: string; marketplace_url?: string; search_term?: string; filter_type?: string; filter_value?: string; result_count?: number; list_name?: string; position?: number }
const STORAGE_KEY = 'distrito-geek:analytics-consent'
const ALLOWED_KEYS = new Set(['event', 'product_id', 'external_id', 'product_name', 'category', 'price', 'marketplace', 'marketplace_url', 'search_term', 'filter_type', 'filter_value', 'result_count', 'list_name', 'position'])

export function getConsent(): ConsentChoice | null { const value = window.localStorage.getItem(STORAGE_KEY); return value === 'granted' || value === 'denied' ? value : null }
export function setConsent(choice: ConsentChoice) { window.localStorage.setItem(STORAGE_KEY, choice); window.dispatchEvent(new CustomEvent('dg:analytics-consent', { detail: choice })) }
export function resetConsent() { window.localStorage.removeItem(STORAGE_KEY); window.dispatchEvent(new CustomEvent('dg:analytics-consent', { detail: null })) }
function pushConsent(command: 'default' | 'update', choice: ConsentChoice | null) {
  window.dataLayer ||= []
  function gtag(..._args: unknown[]) { window.dataLayer!.push(arguments) }
  const granted = choice === 'granted' ? 'granted' : 'denied'
  gtag('consent', command, { analytics_storage: granted, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', functionality_storage: 'granted', security_storage: 'granted', wait_for_update: command === 'default' ? 500 : undefined })
}
export function loadTagManager(gtmId = import.meta.env.VITE_GTM_ID): boolean {
  const validId = gtmId || ''
  if (!/^GTM-[A-Z0-9]+$/.test(validId)) return false
  window.dataLayer ||= []
  if (!document.querySelector('script[data-dg-gtm]')) {
    pushConsent('default', getConsent())
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
    const script = document.createElement('script'); script.async = true; script.dataset.dgGtm = 'true'; script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(validId)}`; document.head.appendChild(script)
  }
  else pushConsent('update', getConsent())
  return true
}
export function track(event: AnalyticsEvent): boolean {
  if (getConsent() !== 'granted') return false
  try { window.dataLayer ||= []; const safe = Object.fromEntries(Object.entries(event).filter(([key, value]) => ALLOWED_KEYS.has(key) && value !== undefined)) as Record<string, unknown>; if (typeof safe.search_term === 'string') safe.search_term = safe.search_term.replace(/\s+/g, ' ').trim().slice(0, 100); window.dataLayer.push(safe); return true } catch { return false }
}
