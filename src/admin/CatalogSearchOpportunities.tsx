import { useEffect, useMemo, useState } from 'react'
import type { Opportunity } from '../domain/opportunity'
import type { Product } from '../domain/product'
import { classifyCatalogSearches, type ClassifiedSearch } from './catalog-search-opportunities'

type SearchReport = { configured: boolean; missing?: string[]; period?: number; generatedAt?: string; searchSignals: ClassifiedSearch[] }

export function CatalogSearchOpportunities({ products, openCatalog, openRadar }: { products: Product[]; openCatalog: () => void; openRadar: () => void }) {
  const [report, setReport] = useState<SearchReport | null>(null), [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [radarState, setRadarState] = useState<'ok' | 'error'>('ok'), [error, setError] = useState('')
  const load = async () => {
    setError('')
    try {
      const [searchResponse, radarResponse] = await Promise.all([fetch(`/api/admin-searches?period=90&refresh=${Date.now()}`, { cache: 'no-store' }), fetch('/api/admin-opportunities', { cache: 'no-store' })])
      const searchData = await searchResponse.json()
      if (!searchResponse.ok) throw searchData
      setReport(searchData)
      if (radarResponse.ok) { setOpportunities((await radarResponse.json()).opportunities || []); setRadarState('ok') }
      else { setOpportunities([]); setRadarState('error') }
    } catch (value) { setError(value instanceof Error ? value.message : 'Não foi possível consultar as buscas internas.') }
  }
  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => classifyCatalogSearches(report?.searchSignals || [], products, opportunities, radarState), [report, products, opportunities, radarState])
  return <div className="admin-card analytics-card">
    <div className="analytics-heading"><div><p className="eyebrow">Demanda observada</p><h2>Buscas sem resultado</h2></div><button className="button ghost" type="button" onClick={() => void load()}>Atualizar</button></div>
    <p>Histórico real do GA4, reavaliado contra o catálogo de hoje. Nenhum item é criado ou alterado automaticamente.</p>
    {error ? <div className="form-error" role="alert">{error}</div> : !report ? <p>Consultando buscas…</p> : !report.configured ? <p>GA4 não configurado{report.missing?.length ? `: ${report.missing.join(', ')}` : '.'}</p> : !rows.length ? <div className="form-success" role="status">Nenhuma busca comercial foi registrada nos últimos 90 dias.</div> : <div className="table-wrap"><table><thead><tr><th>Busca</th><th>Ocorrências</th><th>Usuários</th><th>Última ocorrência</th><th>Estado atual</th><th>Diagnóstico</th><th>Ação</th></tr></thead><tbody>{rows.map((row) => <tr key={row.normalizedTerm}><td><b>{row.variants[0]}</b>{row.variants.length > 1 && <small> +{row.variants.length - 1} variação(ões)</small>}</td><td>{row.searches}</td><td>{row.users}</td><td>{row.lastOccurredAt ? new Date(row.lastOccurredAt).toLocaleString('pt-BR') : 'Não informado pelo GA4'}</td><td><span className={`search-state state-${row.classification.toLowerCase().replace(/\s+/g, '-')}`}>{row.classification}</span></td><td>{row.reason}</td><td>{row.product && row.product.showOnStorefront !== false ? <a className="button ghost" href={`/produto/${row.product.slug}`}>Ver produto</a> : row.product ? <button className="button ghost" type="button" onClick={openCatalog}>Abrir catálogo</button> : row.opportunity ? <button className="button ghost" type="button" onClick={openRadar}>Abrir Radar</button> : 'Revisar'}</td></tr>)}</tbody></table></div>}
    {report?.generatedAt && <small>Atualizado em {new Date(report.generatedAt).toLocaleString('pt-BR')}.</small>}
  </div>
}
