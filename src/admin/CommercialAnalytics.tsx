import { useMemo, useState } from 'react'
import type { Product } from '../domain/product'
import { buildCommercialInsights, COMMERCIAL_MIN_PRODUCT_VIEWS, type CommercialMetricRow, type CommercialProductStatus } from './commercial-insights'

const money = (value?: number) => typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
const pct = (value: number) => `${(value * 100).toFixed(1)}%`
const slugStatus = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-')
const STATUS_OPTIONS: Array<CommercialProductStatus | 'TODOS'> = ['TODOS', 'POUCOS DADOS', 'BOM INTERESSE', 'BAIXO CLIQUE', 'SEM CTA', 'SEM DADOS', 'ATENÇÃO']

export function CommercialAnalytics({ products, metricRows }: { products: Product[]; metricRows: CommercialMetricRow[] }) {
  const insights = useMemo(() => buildCommercialInsights(products, metricRows), [products, metricRows])
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('TODOS')
  const visibleProducts = status === 'TODOS' ? insights.products : insights.products.filter((product) => product.status === status)
  return <>
    <section className="analytics-section commercial-funnel" aria-labelledby="commercial-funnel-title">
      <p className="analytics-kicker">Conversão para marketplace</p>
      <h3 id="commercial-funnel-title">Funil comercial</h3>
      <p className="analytics-hint">Mede intenção de compra, não vendas. CTR comercial = cliques em ML, Shopee, TikTok Shop e WhatsApp ÷ visualizações de ProductPage.</p>
      <div className="funnel-flow">
        <div><span>ProductPage views</span><b>{insights.funnel.productViews}</b></div><i aria-hidden="true">→</i>
        <div><span>Cliques comerciais</span><b>{insights.funnel.commercialClicks}</b></div><i aria-hidden="true">→</i>
        <div><span>CTR comercial</span><b>{pct(insights.funnel.commercialCtr)}</b></div>
      </div>
      <small>Amostra mínima centralizada: {COMMERCIAL_MIN_PRODUCT_VIEWS} views por produto. Abaixo disso, o status é “POUCOS DADOS”.</small>
    </section>

    <section className="analytics-section" aria-labelledby="products-commercial-title">
      <div className="analytics-heading"><div><p className="analytics-kicker">Produtos</p><h3 id="products-commercial-title">Interesse e clique para compra</h3></div>
        <label>Status<select aria-label="Filtrar status comercial" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>
      {visibleProducts.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Views</th><th>Usuários</th><th>ML</th><th>Shopee</th><th>TikTok</th><th>WhatsApp</th><th>Cliques comerciais</th><th>CTR comercial</th><th>Status</th><th>Diagnóstico</th></tr></thead><tbody>{visibleProducts.map((row) => <tr key={row.id}><td><a href={row.path}>{row.title}</a><small className="table-subline">{row.sku}</small></td><td>{row.views}</td><td>{row.users}</td><td>{row.mercadoLivreClicks}</td><td>{row.shopeeClicks}</td><td>{row.tiktokClicks}</td><td>{row.whatsappClicks}</td><td>{row.totalCommercialClicks}</td><td>{pct(row.commercialCtr)}</td><td><span className={`commercial-status status-${slugStatus(row.status)}`}>{row.status}</span></td><td title={row.diagnostics.join(' ')}>{row.diagnostics[0] || 'Sem alerta objetivo.'}</td></tr>)}</tbody></table></div> : <p>Nenhum produto corresponde ao filtro.</p>}
    </section>

    <section className="analytics-section" aria-labelledby="channel-performance-title">
      <p className="analytics-kicker">Canais</p><h3 id="channel-performance-title">Desempenho e cobertura por canal</h3>
      <div className="table-wrap"><table><thead><tr><th>Canal</th><th>Tipo</th><th>Cliques</th><th>Produtos com link</th><th>Sem cobertura</th><th>Views cobertas</th><th>CTR do canal</th></tr></thead><tbody>{insights.channels.map((channel) => <tr key={channel.channel}><td>{channel.label}</td><td>{channel.kind === 'marketplace' ? 'Marketplace' : 'CTA auxiliar'}</td><td>{channel.clicks}</td><td>{channel.productsWithLink}</td><td>{channel.productsWithoutCoverage}</td><td>{channel.viewsWithCoverage}</td><td>{pct(channel.ctr)}</td></tr>)}</tbody></table></div>
      <p className="analytics-hint">Ausência de Shopee ou TikTok não é erro: significa apenas que o produto ainda não possui anúncio ativo nesse canal. WhatsApp não é marketplace.</p>
    </section>

    <section className="analytics-section" aria-labelledby="commercial-coverage-title">
      <p className="analytics-kicker">Operação</p><h3 id="commercial-coverage-title">Cobertura comercial e prontidão</h3>
      <div className="stats compact-stats"><div><span>Públicos sem canal de compra</span><b>{insights.uncoveredProducts.length}</b></div><div><span>Prontos para marketplace</span><b>{insights.readyProducts.length}</b></div><div><span>Exigem atenção comercial</span><b>{insights.attentionProducts.length}</b></div></div>
      <div className="table-wrap"><table><thead><tr><th>Produto</th><th>DG</th><th>Mercado Livre</th><th>Shopee</th><th>TikTok</th><th>Preço ML</th><th>Preço Shopee</th><th>Preço TikTok</th><th>Prontidão</th></tr></thead><tbody>{insights.products.map((row) => <tr key={row.id}><td><a href={row.path}>{row.title}</a></td><td>{row.coverage.distritoGeek}</td><td>{row.coverage.mercadoLivre.status}</td><td>{row.coverage.shopee.status}</td><td>{row.coverage.tiktok.status}</td><td>{money(row.coverage.mercadoLivre.price)}</td><td>{money(row.coverage.shopee.price)}</td><td>{money(row.coverage.tiktok.price)}</td><td>{row.readyForMarketplace ? 'PRONTO' : `PENDENTE: ${row.missingRequirements.join(', ')}`}</td></tr>)}</tbody></table></div>
    </section>

    {!!insights.families.length && <section className="analytics-section" aria-labelledby="family-interest-title">
      <p className="analytics-kicker">Famílias</p><h3 id="family-interest-title">Interesse por família curada</h3>
      <p className="analytics-hint">Agregação de views e cliques comerciais. Não representa demanda nem vendas.</p>
      <div className="table-wrap"><table><thead><tr><th>Família</th><th>Produtos</th><th>Views</th><th>Cliques comerciais</th><th>CTR comercial</th></tr></thead><tbody>{insights.families.map((family) => <tr key={family.family}><td>{family.family}</td><td>{family.products}</td><td>{family.views}</td><td>{family.commercialClicks}</td><td>{pct(family.commercialCtr)}</td></tr>)}</tbody></table></div>
    </section>}
  </>
}
