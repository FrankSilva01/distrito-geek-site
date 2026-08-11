import { ArrowRight, BookOpenText, Clock } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { GUIDE_INDEX, guidesByCluster, pillarGuide, type GuideSummary } from '../content/guides-index'

const GuideCard = ({ guide }: { guide: GuideSummary }) => (
  <article className="guide-card">
    <BookOpenText/>
    <small><Clock/> {guide.readingMinutes} min de leitura</small>
    <h3>{guide.title}</h3>
    <p>{guide.seoDescription}</p>
    <Link to={`/guias/${guide.slug}`}>Ler guia completo <ArrowRight/></Link>
  </article>
)

export function GuidesPage() {
  const pillar = pillarGuide()
  const clusters = guidesByCluster()
  return <main className="container editorial-page guides-index">
    <nav className="breadcrumbs" aria-label="Navegação estrutural"><Link to="/">Início</Link> / Guias</nav>
    <header className="editorial-hero">
      <p className="eyebrow">Conteúdo para escolher melhor</p>
      <h1>Guias de miniaturas, RPG e colecionismo</h1>
      <p>Referências práticas sobre escala, pintura, conservação e montagem de grupos. Depois de aprender, compare produtos reais e finalize no anúncio oficial do marketplace.</p>
    </header>
    {pillar && <section className="guides-pillar" aria-labelledby="guia-pilar">
      <article>
        <small><BookOpenText/> Comece por aqui</small>
        <h2 id="guia-pilar">{pillar.title}</h2>
        <p>{pillar.seoDescription}</p>
        <Link className="button primary" to={`/guias/${pillar.slug}`}>Ler o guia completo <ArrowRight/></Link>
      </article>
    </section>}
    {clusters.map(({ cluster, guides }) => (
      <section className="guides-cluster" key={cluster.id} aria-labelledby={`cluster-${cluster.id}`}>
        <header className="section-title left">
          <p>{guides.length} {guides.length === 1 ? 'guia' : 'guias'}</p>
          <h2 id={`cluster-${cluster.id}`}>{cluster.label}</h2>
          <span>{cluster.description}</span>
        </header>
        <div className="guides-grid">{guides.map((guide) => <GuideCard guide={guide} key={guide.slug}/>)}</div>
      </section>
    ))}
    {!GUIDE_INDEX.length && <div className="catalog-state" role="status">Nenhum guia publicado por enquanto.</div>}
  </main>
}
