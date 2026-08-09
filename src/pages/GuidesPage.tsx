import { ArrowRight, BookOpenText, Clock } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { GUIDES } from '../content/guides'

export function GuidesPage() {
  return <main className="container editorial-page guides-index"><nav className="breadcrumbs" aria-label="Navegação estrutural"><Link to="/">Início</Link> / Guias</nav><header className="editorial-hero"><p className="eyebrow">Conteúdo para escolher melhor</p><h1>Guias de miniaturas, RPG e colecionismo</h1><p>Referências práticas sobre escala, pintura, conservação e montagem de grupos. Depois de aprender, compare produtos reais e finalize no anúncio oficial do marketplace.</p></header><section className="guides-grid" aria-label="Guias publicados">{GUIDES.map((guide) => <article className="guide-card" key={guide.slug}><BookOpenText/><small><Clock/> {guide.readingMinutes} min de leitura</small><h2>{guide.title}</h2><p>{guide.seoDescription}</p><Link to={`/guias/${guide.slug}`}>Ler guia completo <ArrowRight/></Link></article>)}</section></main>
}
