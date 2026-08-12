import { MagnifyingGlass, Plus, Trash, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import type { Product } from '../domain/product'
import { displayTitle } from '../domain/storefront-presentation'
import {
  assessSession, latestSession, type Assessment, type Confidence, type Evidence, type Heat, type Opportunity, type ResearchSession,
} from '../domain/opportunity'
import { CHANNEL_FEE_PRESETS, estimateNet } from './catalog-manager'
import {
  assessOpportunity, emptyRadarFilters, fitContextFor, filterOpportunities, guidesWithoutProduct, radarCategories, type RadarFilters,
} from './radar-helpers'
import '../styles/admin-radar.css'

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const today = () => new Date().toISOString().slice(0, 10)
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.round(Math.random() * 1e9)}`)

const HEAT_LABEL: Record<Heat, string> = { quente: 'Quente', morno: 'Morno', frio: 'Frio', inconclusivo: 'Inconclusivo' }
const CONFIDENCE_LABEL: Record<Confidence, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa', inconclusiva: 'Inconclusiva' }
const STATUS_LABEL: Record<Opportunity['status'], string> = { ideia: 'Ideia', 'em-analise': 'Em análise', testar: 'Testar', aprovado: 'Aprovado', descartado: 'Descartado', cadastrado: 'Cadastrado' }
const TYPE_LABEL: Record<Opportunity['type'], string> = { miniatura: 'Miniatura', kit: 'Kit', acessorio: 'Acessório', cenario: 'Cenário', outro: 'Outro' }
const FORMAT_LABEL: Record<Opportunity['format'], string> = { avulso: 'Avulso', kit: 'Kit', bundle: 'Bundle', complemento: 'Complemento', premium: 'Premium', indefinido: 'Indefinido' }
const CHANNEL_OPTIONS: Array<{ id: Opportunity['channels'][number]; label: string }> = [
  { id: 'mercado-livre', label: 'Mercado Livre' }, { id: 'shopee', label: 'Shopee' }, { id: 'tiktok', label: 'TikTok Shop' }, { id: 'distrito-geek', label: 'Distrito Geek (futuro)' },
]
const SOURCE_LABEL: Record<Evidence['source'], string> = { 'mercado-livre': 'Mercado Livre', shopee: 'Shopee', tiktok: 'TikTok Shop', 'loja-especializada': 'Loja especializada', google: 'Google', outra: 'Outra' }
const COMPARABILITY_LABEL: Record<Evidence['comparability'], string> = { comparavel: 'Comparável', parcial: 'Parcialmente', 'nao-comparavel': 'Não comparável' }

/** Chip de heatmap/confiança: cor + TEXTO sempre (nunca depende só de cor — Parte 41). */
function HeatChip({ heat }: { heat: Heat }) { return <span className={`heat heat-${heat}`}>{HEAT_LABEL[heat]}</span> }
function ConfidenceChip({ confidence }: { confidence: Confidence }) { return <span className={`conf conf-${confidence}`}>{CONFIDENCE_LABEL[confidence]}</span> }
const numberOrUnknown = (value: Evidence['price']): string => (value === 'unknown' ? '' : String(value))

async function api(method: string, opportunity?: unknown, id?: string): Promise<Response> {
  const url = id ? `/api/admin-opportunities?id=${encodeURIComponent(id)}` : '/api/admin-opportunities'
  return fetch(url, { method, headers: opportunity ? { 'content-type': 'application/json' } : undefined, body: opportunity ? JSON.stringify(opportunity) : undefined })
}

export function RadarManager({ products, notify }: { products: Product[]; notify: (message: string) => void }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<RadarFilters>(emptyRadarFilters)
  const [editing, setEditing] = useState<Opportunity | null>(null)

  useEffect(() => { void reload() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  async function reload() {
    setLoading(true)
    try { const response = await api('GET'); if (response.ok) setOpportunities((await response.json()).opportunities || []) }
    catch { notify('Não foi possível carregar as oportunidades.') } finally { setLoading(false) }
  }

  const entries = useMemo(() => opportunities.map((opportunity) => ({ opportunity, assessment: assessOpportunity(opportunity, products) })), [opportunities, products])
  const visible = useMemo(() => filterOpportunities(entries, filters), [entries, filters])
  const categories = useMemo(() => radarCategories(opportunities), [opportunities])
  const guidesGap = useMemo(() => guidesWithoutProduct(products), [products])

  useEffect(() => { if (editing) { const fresh = opportunities.find((item) => item.id === editing.id); if (fresh && fresh !== editing) setEditing(fresh) } }, [opportunities]) // eslint-disable-line react-hooks/exhaustive-deps

  function draft(seed: Partial<Opportunity> = {}): Opportunity {
    const now = new Date().toISOString()
    return { id: '', name: '', category: '', type: 'outro', format: 'indefinido', status: 'ideia', potentialGuide: false, channels: [], sessions: [], createdAt: now, updatedAt: now, ...seed }
  }

  async function persist(opportunity: Opportunity): Promise<Opportunity | null> {
    const response = await api(opportunity.id ? 'PUT' : 'POST', opportunity)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) { notify(data?.message || 'Não foi possível salvar a oportunidade.'); return null }
    setOpportunities((current) => { const saved = data.opportunity as Opportunity; return current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved] })
    return data.opportunity as Opportunity
  }

  async function remove(opportunity: Opportunity) {
    if (!opportunity.id || !window.confirm(`Excluir a oportunidade "${opportunity.name}"?`)) return
    const response = await api('DELETE', undefined, opportunity.id)
    if (!response.ok) { notify('Não foi possível excluir.'); return }
    setOpportunities((current) => current.filter((item) => item.id !== opportunity.id))
    setEditing(null)
    notify('Oportunidade excluída.')
  }

  return (
    <div className="radar-manager">
      <div className="radar-toolbar">
        <label className="catalog-search">
          <MagnifyingGlass aria-hidden="true" />
          <input type="search" value={filters.query} onChange={(event) => setFilters((f) => ({ ...f, query: event.target.value }))} placeholder="Buscar por nome, categoria, termo ou nota" aria-label="Buscar oportunidades" />
        </label>
        <button type="button" className="button primary" onClick={() => setEditing(draft())}><Plus aria-hidden="true" /> Nova oportunidade</button>
      </div>
      <div className="catalog-filters">
        <label>Resultado
          <select value={filters.heat} onChange={(event) => setFilters((f) => ({ ...f, heat: event.target.value as RadarFilters['heat'] }))}>
            <option value="todos">Todos</option><option value="quente">Quente</option><option value="morno">Morno</option><option value="frio">Frio</option><option value="inconclusivo">Inconclusivo</option>
          </select>
        </label>
        <label>Status
          <select value={filters.status} onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value as RadarFilters['status'] }))}>
            <option value="todos">Todos</option>{(Object.keys(STATUS_LABEL) as Opportunity['status'][]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
          </select>
        </label>
        <label>Canal
          <select value={filters.channel} onChange={(event) => setFilters((f) => ({ ...f, channel: event.target.value as RadarFilters['channel'] }))}>
            <option value="todos">Todos</option>{CHANNEL_OPTIONS.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}<option value="sem-canal">Sem canal</option>
          </select>
        </label>
        <label>Categoria
          <select value={filters.category} onChange={(event) => setFilters((f) => ({ ...f, category: event.target.value }))}>
            <option value="todas">Todas</option>{categories.map((category) => <option key={category} value={category}>{category.replaceAll('-', ' ')}</option>)}
          </select>
        </label>
      </div>

      <p className="catalog-count">{visible.length} de {opportunities.length} oportunidades</p>
      {loading ? <p>Carregando oportunidades…</p> : (
        <div className="table-wrap">
          <table className="catalog-table radar-table">
            <thead><tr><th>Oportunidade</th><th>Status</th><th>Demanda</th><th>Concorr.</th><th>Preço</th><th>Aderência</th><th>Confiança</th><th>Resultado</th><th>Última pesquisa</th><th></th></tr></thead>
            <tbody>
              {visible.map(({ opportunity, assessment }) => (
                <tr key={opportunity.id}>
                  <td data-label="Oportunidade"><b>{opportunity.name || 'Sem nome'}</b><small className="muted"> · {TYPE_LABEL[opportunity.type]}{opportunity.category ? ` · ${opportunity.category.replaceAll('-', ' ')}` : ''}</small></td>
                  <td data-label="Status"><span className={`status-pill status-${opportunity.status}`}>{STATUS_LABEL[opportunity.status]}</span></td>
                  <td data-label="Demanda">{assessment.demand}</td>
                  <td data-label="Concorrência">{assessment.competition}</td>
                  <td data-label="Preço">{assessment.price}</td>
                  <td data-label="Aderência">{assessment.fit}</td>
                  <td data-label="Confiança"><ConfidenceChip confidence={assessment.confidence} /></td>
                  <td data-label="Resultado"><HeatChip heat={assessment.heat} /></td>
                  <td data-label="Última pesquisa">{latestSession(opportunity)?.date ?? '—'}</td>
                  <td><button type="button" className="button ghost small" onClick={() => setEditing(opportunity)}>Abrir</button></td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan={10} className="catalog-empty">Nenhuma oportunidade corresponde aos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <GuidesWithoutProduct guides={guidesGap} onCreate={(guide) => setEditing(draft({ name: guide.title, guideSlug: guide.slug, category: '', potentialGuide: false }))} />

      {editing && <OpportunityDrawer key={editing.id || 'new'} opportunity={editing} products={products} onClose={() => setEditing(null)} onPersist={persist} onDelete={remove} notify={notify} />}
    </div>
  )
}

function GuidesWithoutProduct({ guides, onCreate }: { guides: ReturnType<typeof guidesWithoutProduct>; onCreate: (guide: ReturnType<typeof guidesWithoutProduct>[number]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="radar-gap">
      <button type="button" className="radar-gap-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>Conteúdo sem produto ({guides.length}) {open ? '−' : '+'}</button>
      {open && <>
        <p className="field-hint">Guias publicados sem produto específico no catálogo. Cada um é uma pista para o Radar — crie uma oportunidade a partir dele quando fizer sentido. Não cria produto nem guia automaticamente.</p>
        <ul className="radar-gap-list">
          {guides.map((guide) => <li key={guide.slug}><a href={`/guias/${guide.slug}`} target="_blank" rel="noopener noreferrer">{guide.title}</a><button type="button" className="button ghost small" onClick={() => onCreate(guide)}>Criar oportunidade</button></li>)}
          {!guides.length && <li className="muted">Todos os guias têm produto relacionado.</li>}
        </ul>
      </>}
    </section>
  )
}

const TABS = ['resumo', 'mercado', 'evidencias', 'preco', 'conteudo', 'historico'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = { resumo: 'Resumo', mercado: 'Mercado', evidencias: 'Evidências', preco: 'Preço', conteudo: 'Conteúdo', historico: 'Histórico' }

function OpportunityDrawer({ opportunity, products, onClose, onPersist, onDelete, notify }: {
  opportunity: Opportunity; products: Product[]
  onClose: () => void; onPersist: (opportunity: Opportunity) => Promise<Opportunity | null>; onDelete: (opportunity: Opportunity) => void; notify: (message: string) => void
}) {
  const [tab, setTab] = useState<Tab>('resumo')
  const [saving, setSaving] = useState(false)
  const [model, setModel] = useState<Opportunity>(() => ensureSession(opportunity))

  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])

  const session = latestSession(model)!
  const fit = fitContextFor(model, products)
  const assessment = useMemo(() => assessSession(session.evidences, fit, { min: model.targetPriceMin, max: model.targetPriceMax }), [session.evidences, fit, model.targetPriceMin, model.targetPriceMax])
  const set = (patch: Partial<Opportunity>) => setModel((current) => ({ ...current, ...patch }))
  const setSession = (patch: Partial<ResearchSession>) => setModel((current) => ({ ...current, sessions: current.sessions.map((item) => item.id === session.id ? { ...item, ...patch } : item) }))

  async function save() {
    if (saving) return
    if (!model.name.trim()) { notify('Dê um nome para a oportunidade.'); setTab('resumo'); return }
    setSaving(true)
    try { const saved = await onPersist(model); if (saved) { notify('Oportunidade salva.'); onClose() } } finally { setSaving(false) }
  }

  function startNewSession() {
    if (!window.confirm('Iniciar uma nova sessão de pesquisa? A atual fica preservada no histórico.')) return
    setModel((current) => ({ ...current, sessions: [...current.sessions, { id: uid(), date: today(), terms: [...session.terms], sources: [], evidences: [] }] }))
    setTab('evidencias')
    notify('Nova sessão de pesquisa iniciada.')
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer radar-drawer" role="dialog" aria-label={`${model.id ? 'Editar' : 'Nova'} oportunidade${model.name ? `: ${model.name}` : ''}`} onClick={(event) => event.stopPropagation()}>
        <header className="drawer-head">
          <div><b>{model.name || 'Nova oportunidade'}</b><small className="sku">{HEAT_LABEL[assessment.heat]} · confiança {CONFIDENCE_LABEL[assessment.confidence].toLowerCase()}</small></div>
          <button type="button" className="drawer-close" aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <nav className="drawer-tabs" aria-label="Seções da oportunidade">
          {TABS.map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} aria-current={tab === item} onClick={() => setTab(item)}>{TAB_LABEL[item]}</button>)}
        </nav>
        <div className="drawer-body">
          {tab === 'resumo' && <SummaryTab model={model} assessment={assessment} products={products} set={set} />}
          {tab === 'mercado' && <MarketTab assessment={assessment} />}
          {tab === 'evidencias' && <EvidencesTab session={session} setSession={setSession} onNewSession={startNewSession} />}
          {tab === 'preco' && <PriceTab model={model} assessment={assessment} set={set} />}
          {tab === 'conteudo' && <ContentTab model={model} fit={fit} products={products} set={set} />}
          {tab === 'historico' && <HistoryTab model={model} fit={fit} />}
        </div>
        <footer className="drawer-foot radar-foot">
          {model.id && <button type="button" className="button ghost small danger" onClick={() => onDelete(model)}><Trash aria-hidden="true" /> Excluir</button>}
          <span className="drawer-foot-spacer" />
          <button type="button" className="button primary" disabled={saving} onClick={save}>{saving ? 'Salvando…' : 'Salvar oportunidade'}</button>
        </footer>
      </aside>
    </div>
  )
}

/** Garante ao menos uma sessão de pesquisa (a atual) para editar evidências. */
function ensureSession(opportunity: Opportunity): Opportunity {
  if (opportunity.sessions.length) return opportunity
  return { ...opportunity, sessions: [{ id: uid(), date: today(), terms: [], sources: [], evidences: [] }] }
}

function SummaryTab({ model, assessment, products, set }: { model: Opportunity; assessment: Assessment; products: Product[]; set: (patch: Partial<Opportunity>) => void }) {
  return (
    <div className="drawer-fields">
      <label>Nome<input value={model.name} onChange={(event) => set({ name: event.target.value })} placeholder="Ex.: Kit de moedas de RPG" /></label>
      <div className="radar-verdict" aria-label="Resultado da avaliação">
        <div><span>Resultado</span><HeatChip heat={assessment.heat} /></div>
        <div><span>Confiança</span><ConfidenceChip confidence={assessment.confidence} /></div>
      </div>
      <div className="radar-why"><b>Por quê?</b><ul>{assessment.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div>
      <div className="radar-two">
        <label>Tipo<select value={model.type} onChange={(event) => set({ type: event.target.value as Opportunity['type'] })}>{(Object.keys(TYPE_LABEL) as Opportunity['type'][]).map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}</select></label>
        <label>Formato comercial<select value={model.format} onChange={(event) => set({ format: event.target.value as Opportunity['format'] })}>{(Object.keys(FORMAT_LABEL) as Opportunity['format'][]).map((format) => <option key={format} value={format}>{FORMAT_LABEL[format]}</option>)}</select></label>
      </div>
      <div className="radar-two">
        <label>Status<select value={model.status} onChange={(event) => set({ status: event.target.value as Opportunity['status'] })}>{(Object.keys(STATUS_LABEL) as Opportunity['status'][]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
        <label>Categoria pretendida<input value={model.category} onChange={(event) => set({ category: event.target.value })} placeholder="Ex.: acessorios-rpg" list="radar-categories" /><datalist id="radar-categories">{[...new Set(products.map((product) => product.category))].map((category) => <option key={category} value={category} />)}</datalist></label>
      </div>
      <fieldset className="radar-channels"><legend>Canais candidatos</legend>{CHANNEL_OPTIONS.map((channel) => (
        <label key={channel.id} className="radar-check"><input type="checkbox" checked={model.channels.includes(channel.id)} onChange={(event) => set({ channels: event.target.checked ? [...model.channels, channel.id] : model.channels.filter((item) => item !== channel.id) })} /> {channel.label}</label>
      ))}<small className="field-hint">Recomendação cadastrada, não integração.</small></fieldset>
      <label>Referência visual (URL)<input value={model.imageRef ?? ''} onChange={(event) => set({ imageRef: event.target.value || undefined })} placeholder="https://..." /></label>
      <label>Observações<textarea value={model.notes ?? ''} rows={3} onChange={(event) => set({ notes: event.target.value || undefined })} /></label>
    </div>
  )
}

function MarketTab({ assessment }: { assessment: Assessment }) {
  const { metrics, signals } = assessment
  return (
    <div className="drawer-fields">
      <div className="radar-grid-stats">
        <div><span>Demanda</span><b>{assessment.demand}</b></div>
        <div><span>Concorrência</span><b>{assessment.competition}</b></div>
        <div><span>Amostras comparáveis</span><b>{signals.comparableCount}</b></div>
        <div><span>Fontes</span><b>{signals.sourcesCount}</b></div>
        <div><span>Com avaliações</span><b>{signals.withReviews}</b></div>
        <div><span>Com vendas públicas</span><b>{signals.withSales}</b></div>
      </div>
      {metrics.status === 'ok' ? <dl className="sim-result">
        <div><dt>Preço mínimo</dt><dd>{money(metrics.min)}</dd></div>
        <div><dt>Mediana</dt><dd>{money(metrics.median)}</dd></div>
        <div><dt>Média</dt><dd>{money(metrics.mean)}</dd></div>
        <div><dt>Preço máximo</dt><dd>{money(metrics.max)}</dd></div>
        {metrics.unitStatus === 'ok' && <><div><dt>Por unidade (mín.)</dt><dd>{money(metrics.unitMin)}</dd></div><div><dt>Por unidade (mediana)</dt><dd>{money(metrics.unitMedian)}</dd></div><div><dt>Por unidade (máx.)</dt><dd>{money(metrics.unitMax)}</dd></div></>}
      </dl> : <p className="radar-insufficient">Dados insuficientes ({metrics.sampleCount} amostra(s) comparável(is); mínimo 3). Adicione evidências comparáveis.</p>}
      <p className="field-hint">{Math.round(signals.unknownRatio * 100)}% dos campos avaliados estão como desconhecidos. Ausência de dado nunca é tratada como zero.</p>
    </div>
  )
}

function EvidencesTab({ session, setSession, onNewSession }: { session: ResearchSession; setSession: (patch: Partial<ResearchSession>) => void; onNewSession: () => void }) {
  const [form, setForm] = useState<Evidence>(() => blankEvidence())
  const [terms, setTerms] = useState(session.terms.join(', '))
  useEffect(() => { setTerms(session.terms.join(', ')) }, [session.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function addEvidence() {
    if (!form.title.trim() && !form.url.trim()) return
    setSession({ evidences: [...session.evidences, { ...form, id: uid() }] })
    setForm(blankEvidence())
  }
  const removeEvidence = (id: string) => setSession({ evidences: session.evidences.filter((item) => item.id !== id) })

  return (
    <div className="drawer-fields">
      <div className="radar-session-head">
        <span>Sessão de pesquisa · {session.date}</span>
        <button type="button" className="button ghost small" onClick={onNewSession}>Nova sessão</button>
      </div>
      <label>Termos pesquisados (separados por vírgula)
        <input value={terms} onChange={(event) => setTerms(event.target.value)} onBlur={() => setSession({ terms: terms.split(',').map((term) => term.trim()).filter(Boolean) })} placeholder="moedas rpg, moedas fantasia, fantasy coins" />
      </label>

      <div className="radar-evidence-form">
        <b>Adicionar referência de mercado</b>
        <p className="field-hint">Deixe em branco o que o anúncio não informar — campo vazio vira "desconhecido", nunca zero.</p>
        <div className="radar-two">
          <label>Fonte<select value={form.source} onChange={(event) => setForm((f) => ({ ...f, source: event.target.value as Evidence['source'] }))}>{(Object.keys(SOURCE_LABEL) as Evidence['source'][]).map((source) => <option key={source} value={source}>{SOURCE_LABEL[source]}</option>)}</select></label>
          <label>Comparabilidade<select value={form.comparability} onChange={(event) => setForm((f) => ({ ...f, comparability: event.target.value as Evidence['comparability'] }))}>{(Object.keys(COMPARABILITY_LABEL) as Evidence['comparability'][]).map((value) => <option key={value} value={value}>{COMPARABILITY_LABEL[value]}</option>)}</select></label>
        </div>
        <label>Título do anúncio<input value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} /></label>
        <label>URL<input value={form.url} onChange={(event) => setForm((f) => ({ ...f, url: event.target.value }))} placeholder="https://..." /></label>
        <div className="radar-two">
          <label>Preço (R$)<input type="number" min="0" step="0.01" value={numberOrUnknown(form.price)} onChange={(event) => setForm((f) => ({ ...f, price: event.target.value === '' ? 'unknown' : Number(event.target.value) }))} placeholder="desconhecido" /></label>
          <label>Qtd. no kit<input type="number" min="1" step="1" value={numberOrUnknown(form.kitQuantity)} onChange={(event) => setForm((f) => ({ ...f, kitQuantity: event.target.value === '' ? 'unknown' : Number(event.target.value) }))} placeholder="desconhecido" /></label>
        </div>
        <div className="radar-two">
          <label>Vendidos<input type="number" min="0" step="1" value={numberOrUnknown(form.sold)} onChange={(event) => setForm((f) => ({ ...f, sold: event.target.value === '' ? 'unknown' : Number(event.target.value) }))} placeholder="desconhecido" /></label>
          <label>Avaliações<input type="number" min="0" step="1" value={numberOrUnknown(form.reviews)} onChange={(event) => setForm((f) => ({ ...f, reviews: event.target.value === '' ? 'unknown' : Number(event.target.value) }))} placeholder="desconhecido" /></label>
        </div>
        <button type="button" className="button ghost small" onClick={addEvidence}><Plus aria-hidden="true" /> Adicionar evidência</button>
      </div>

      <div className="table-wrap">
        <table className="catalog-table radar-evidence-table">
          <thead><tr><th>Fonte</th><th>Anúncio</th><th>Preço</th><th>Qtd</th><th>Vendidos</th><th>Aval.</th><th>Comp.</th><th></th></tr></thead>
          <tbody>
            {session.evidences.map((evidence) => (
              <tr key={evidence.id}>
                <td data-label="Fonte">{SOURCE_LABEL[evidence.source]}</td>
                <td data-label="Anúncio">{evidence.url ? <a href={evidence.url} target="_blank" rel="noopener noreferrer">{evidence.title || 'link'}</a> : evidence.title || '—'}</td>
                <td data-label="Preço">{evidence.price === 'unknown' ? '—' : money(evidence.price)}</td>
                <td data-label="Qtd">{evidence.kitQuantity === 'unknown' ? '?' : evidence.kitQuantity}</td>
                <td data-label="Vendidos">{evidence.sold === 'unknown' ? '?' : evidence.sold}</td>
                <td data-label="Avaliações">{evidence.reviews === 'unknown' ? '?' : evidence.reviews}</td>
                <td data-label="Comparabilidade">{COMPARABILITY_LABEL[evidence.comparability]}</td>
                <td><button type="button" className="icon-button" aria-label="Remover evidência" onClick={() => removeEvidence(evidence.id)}><Trash /></button></td>
              </tr>
            ))}
            {!session.evidences.length && <tr><td colSpan={8} className="catalog-empty">Nenhuma evidência nesta sessão.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PriceTab({ model, assessment, set }: { model: Opportunity; assessment: Assessment; set: (patch: Partial<Opportunity>) => void }) {
  const { metrics } = assessment
  const preset = CHANNEL_FEE_PRESETS[model.channels[0] === 'mercado-livre' ? 'mercado-livre' : model.channels[0] === 'shopee' ? 'shopee' : model.channels[0] === 'tiktok' ? 'tiktok' : 'mercado-livre']
  const target = model.targetPriceMax ?? model.targetPriceMin ?? (metrics.status === 'ok' ? metrics.median : 0)
  const [sim, setSim] = useState({ price: target, percentFee: preset.percentFee, fixedFee: preset.fixedFee, otherCosts: 0 })
  const result = estimateNet(sim)
  return (
    <div className="drawer-fields">
      <div className="radar-two">
        <label>Preço pretendido — mín.<input type="number" min="0" step="0.01" value={model.targetPriceMin ?? ''} onChange={(event) => set({ targetPriceMin: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
        <label>Preço pretendido — máx.<input type="number" min="0" step="0.01" value={model.targetPriceMax ?? ''} onChange={(event) => set({ targetPriceMax: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
      </div>
      {metrics.status === 'ok' ? <div className="radar-price-compare">
        <div><span>Mercado</span><b>{money(metrics.min)}–{money(metrics.max)}</b></div>
        <div><span>Mediana</span><b>{money(metrics.median)}</b></div>
        <div><span>Seu teste</span><b>{model.targetPriceMin || model.targetPriceMax ? `${money(model.targetPriceMin ?? model.targetPriceMax!)}${model.targetPriceMax && model.targetPriceMin ? `–${money(model.targetPriceMax)}` : ''}` : '—'}</b></div>
        <div><span>Leitura</span><b>{assessment.price}</b></div>
      </div> : <p className="radar-insufficient">Sem mediana de mercado ainda (dados insuficientes). Adicione evidências comparáveis para comparar preço.</p>}
      <div className="price-simulator">
        <h4>Simulador de preço</h4>
        <p className="field-hint">Taxas por canal são sugestão editável — ajuste conforme canal e momento. Sem custo de produção automático.</p>
        <div className="sim-inputs">
          <label>Preço testado<input type="number" min="0" step="0.01" value={sim.price} onChange={(event) => setSim((c) => ({ ...c, price: Number(event.target.value) }))} /></label>
          <label>Taxa %<input type="number" min="0" step="0.1" value={sim.percentFee} onChange={(event) => setSim((c) => ({ ...c, percentFee: Number(event.target.value) }))} /></label>
          <label>Taxa fixa<input type="number" min="0" step="0.01" value={sim.fixedFee} onChange={(event) => setSim((c) => ({ ...c, fixedFee: Number(event.target.value) }))} /></label>
          <label>Outros custos<input type="number" min="0" step="0.01" value={sim.otherCosts} onChange={(event) => setSim((c) => ({ ...c, otherCosts: Number(event.target.value) }))} /></label>
        </div>
        <dl className="sim-result">
          <div><dt>Bruto</dt><dd>{money(result.gross)}</dd></div>
          <div><dt>Taxa %</dt><dd>-{money(result.percentAmount)}</dd></div>
          <div><dt>Taxa fixa</dt><dd>-{money(result.fixedFee)}</dd></div>
          <div><dt>Outros</dt><dd>-{money(result.otherCosts)}</dd></div>
          <div className="net"><dt>Líquido estimado</dt><dd>{money(result.net)}</dd></div>
        </dl>
      </div>
    </div>
  )
}

function ContentTab({ model, fit, products, set }: { model: Opportunity; fit: ReturnType<typeof fitContextFor>; products: Product[]; set: (patch: Partial<Opportunity>) => void }) {
  return (
    <div className="drawer-fields">
      <div className="drawer-info">
        <span><b>Categoria compatível:</b> {fit.categoryExists ? 'sim' : 'não'}</span>
        <span><b>Guia relacionado:</b> {fit.guideExists ? (model.guideSlug || 'por palavra-chave') : 'não'}</span>
        <span><b>Produto complementar no catálogo:</b> {fit.complementaryProduct ? 'sim' : 'não'}</span>
        <span><b>Foco RPG atual:</b> {fit.rpgFocus ? 'sim' : 'não'}</span>
      </div>
      <label>Guia relacionado (slug)<input value={model.guideSlug ?? ''} onChange={(event) => set({ guideSlug: event.target.value || undefined })} placeholder="ex.: tokens-rpg" /></label>
      <label className="radar-check"><input type="checkbox" checked={model.potentialGuide} onChange={(event) => set({ potentialGuide: event.target.checked })} /> Novo guia em potencial</label>
      {model.status === 'cadastrado' && <label>Produto DG vinculado<select value={model.linkedProductId ?? ''} onChange={(event) => set({ linkedProductId: event.target.value || undefined })}>
        <option value="">— selecionar —</option>{products.map((product) => <option key={product.id} value={product.id}>{displayTitle(product)}{product.sku ? ` (${product.sku})` : ''}</option>)}
      </select></label>}
      {model.status !== 'cadastrado' && model.linkedProductId && <p className="field-hint">Vínculo com produto DG: {model.linkedProductId}</p>}
      <p className="field-hint">Não cria guia nem produto automaticamente. O vínculo com o produto DG habilita quando o status for "Cadastrado".</p>
    </div>
  )
}

function HistoryTab({ model, fit }: { model: Opportunity; fit: ReturnType<typeof fitContextFor> }) {
  const sessions = [...model.sessions].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="drawer-fields">
      <p className="field-hint">Cada sessão de pesquisa é preservada — dá para comparar o mercado ao longo do tempo. Pesquisas antigas nunca são sobrescritas.</p>
      <div className="table-wrap">
        <table className="catalog-table"><thead><tr><th>Data</th><th>Amostras</th><th>Mediana</th><th>Resultado</th><th>Confiança</th></tr></thead>
          <tbody>{sessions.map((item) => {
            const snapshot = assessSession(item.evidences, fit, { min: model.targetPriceMin, max: model.targetPriceMax })
            return <tr key={item.id}><td data-label="Data">{item.date}</td><td data-label="Amostras">{snapshot.signals.comparableCount}</td><td data-label="Mediana">{snapshot.metrics.status === 'ok' ? money(snapshot.metrics.median) : '—'}</td><td data-label="Resultado"><HeatChip heat={snapshot.heat} /></td><td data-label="Confiança"><ConfidenceChip confidence={snapshot.confidence} /></td></tr>
          })}</tbody>
        </table>
      </div>
    </div>
  )
}

function blankEvidence(): Evidence {
  return { id: '', source: 'mercado-livre', url: '', title: '', price: 'unknown', kitQuantity: 'unknown', painted: 'desconhecido', reviews: 'unknown', sold: 'unknown', comparability: 'comparavel', collectedAt: today() }
}

export default RadarManager
