export type ConsentChoice = 'granted' | 'denied'
// `view_product` saiu: a página de produto passou a emitir o evento recomendado do GA4,
// `view_item`, no mesmo esquema de ecommerce de view_item_list e select_item.
export type AnalyticsEventName = 'view_category' | 'search_product' | 'filter_catalog' | 'click_mercado_livre' | 'click_shopee' | 'click_tiktok_shop'
  // Funil editorial: uma visualização de guia e três saídas possíveis dele.
  | 'guide_view' | 'guide_product_click' | 'guide_related_click' | 'guide_category_click'
  // Sentido inverso do funil editorial: da página de produto ou de categoria para o guia.
  | 'product_guide_click' | 'category_guide_click'
export type AnalyticsEvent = { event: AnalyticsEventName; product_id?: string; external_id?: string; product_name?: string; category?: string; price?: number; marketplace?: string; marketplace_url?: string; search_term?: string; filter_type?: string; filter_value?: string; result_count?: number; zero_results?: boolean; list_name?: string; position?: number; guide_slug?: string; guide_title?: string; guide_cluster?: string; destination_slug?: string }
/** Eventos de ecommerce do GA4: vão aninhados em `ecommerce`, não como parâmetros planos. */
export type EcommerceEventName = 'view_item_list' | 'select_item' | 'view_item'
export type EcommerceItem = { item_id: string; item_name: string; item_category?: string; item_list_id?: string; item_list_name?: string; index?: number; price?: number; currency?: string }
/** `view_item` não pertence a lista nenhuma, então os campos de lista são opcionais. */
export type EcommercePayload = { item_list_id?: string; item_list_name?: string; items: EcommerceItem[] }
const STORAGE_KEY = 'distrito-geek:analytics-consent'
const ALLOWED_KEYS = new Set(['event', 'product_id', 'external_id', 'product_name', 'category', 'price', 'marketplace', 'marketplace_url', 'search_term', 'filter_type', 'filter_value', 'result_count', 'zero_results', 'list_name', 'position', 'guide_slug', 'guide_title', 'guide_cluster', 'destination_slug'])
const ALLOWED_ITEM_KEYS = new Set(['item_id', 'item_name', 'item_category', 'item_list_id', 'item_list_name', 'index', 'price', 'currency'])

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
/**
 * Publica um evento de ecommerce no formato que o GA4 espera via GTM. O `ecommerce: null`
 * antes do evento é obrigatório: sem ele o GTM mescla o objeto da lista anterior e as
 * posições de duas listas diferentes se misturam no relatório.
 */
export function trackEcommerce(event: EcommerceEventName, payload: EcommercePayload): boolean {
  if (getConsent() !== 'granted') return false
  try {
    window.dataLayer ||= []
    const items = payload.items.map((item) => Object.fromEntries(Object.entries(item).filter(([key, value]) => ALLOWED_ITEM_KEYS.has(key) && value !== undefined)))
    const ecommerce: Record<string, unknown> = { items }
    if (payload.item_list_id) ecommerce.item_list_id = payload.item_list_id
    if (payload.item_list_name) ecommerce.item_list_name = payload.item_list_name
    window.dataLayer.push({ ecommerce: null })
    window.dataLayer.push({ event, ecommerce })
    return true
  } catch { return false }
}
export function track(event: AnalyticsEvent): boolean {
  if (getConsent() !== 'granted') return false
  try {
    if (event.event.startsWith('guide_') && ![event.guide_slug, event.guide_title, event.guide_cluster].every((value) => typeof value === 'string' && value.trim())) return false
    window.dataLayer ||= []
    const safe = Object.fromEntries(Object.entries(event).filter(([key, value]) => ALLOWED_KEYS.has(key) && value !== undefined)) as Record<string, unknown>
    if (typeof safe.search_term === 'string') safe.search_term = safe.search_term.replace(/\s+/g, ' ').trim().slice(0, 100)
    window.dataLayer.push(safe)
    return true
  } catch { return false }
}
