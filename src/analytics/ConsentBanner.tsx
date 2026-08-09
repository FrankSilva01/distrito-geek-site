import { useEffect, useState } from 'react'
import { getConsent, loadTagManager, setConsent, type ConsentChoice } from './events'

export function ConsentBanner({ gtmId = import.meta.env.VITE_GTM_ID }: { gtmId?: string }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(() => getConsent())
  useEffect(() => { loadTagManager(gtmId); const sync = () => setChoice(getConsent()); window.addEventListener('dg:analytics-consent', sync); return () => window.removeEventListener('dg:analytics-consent', sync) }, [choice, gtmId])
  const choose = (value: ConsentChoice) => { setConsent(value); setChoice(value); if (value === 'granted') loadTagManager(gtmId) }
  if (choice) return null
  return <div className="consent-banner" role="dialog" aria-label="Privacidade e Analytics" aria-live="polite"><div><b>Privacidade e Analytics</b><p>Com sua autorização, usamos Analytics para entender buscas, produtos visitados e cliques nos marketplaces. Não enviamos nome, e-mail ou telefone.</p></div><div className="consent-actions"><button type="button" className="button ghost" onClick={() => choose('denied')}>Recusar Analytics</button><button type="button" className="button primary" onClick={() => choose('granted')}>Aceitar Analytics</button></div></div>
}
