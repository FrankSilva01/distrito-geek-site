import { Copy, MagnifyingGlass, PencilSimple, X } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import type { Product } from '../domain/product'
import { displayTitle, isPublicProduct, showsOnHome } from '../domain/storefront-presentation'
import { guideMatchText } from '../content/guides-index'
import {
  CHANNEL_FEE_PRESETS, catalogCategories, emptyFilters, estimateNet, filterProducts,
  productGuides, productHealth, type CatalogFilters, type HealthState,
} from './catalog-manager'
import { catalogActionQueue, catalogExecutiveSummary } from './catalog-operations'
import { CURATED_PRODUCT_FAMILIES, familyForProduct, type ProductRelation } from '../domain/product-family'

const SITE_ORIGIN = 'https://distritogeek.com.br'
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const CHANNEL_LABEL: Record<string, string> = { 'mercado-livre': 'ML', shopee: 'Shopee', tiktok: 'TikTok', other: 'Outro' }

type EditorialChanges = Partial<Pick<Product, 'storefrontTitle' | 'storefrontDescription' | 'descriptionImages' | 'seoTitle' | 'seoDescription' | 'seoTags' | 'showOnStorefront' | 'showOnHome' | 'featured' | 'familyId' | 'relatedProducts' | 'homePriority'>>

/** Override completo a partir do produto atual + mudanças — evita perder campos editoriais. */
function overridePayload(product: Product, changes: EditorialChanges) {
  return {
    id: product.id,
    storefrontTitle: product.storefrontTitle || undefined,
    storefrontDescription: product.storefrontDescription || undefined,
    descriptionImages: product.descriptionImages || [],
    seoTitle: product.seoTitle || undefined,
    seoDescription: product.seoDescription || undefined,
    seoTags: product.seoTags || [],
    familyId: product.familyId || undefined,
    relatedProducts: product.relatedProducts || [],
    homePriority: product.homePriority,
    showOnStorefront: product.showOnStorefront !== false,
    showOnHome: product.showOnHome !== false,
    featured: product.featured,
    ...changes,
  }
}

async function patchOverride(product: Product, changes: EditorialChanges): Promise<Product> {
  const response = await fetch('/api/admin-products', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(overridePayload(product, changes)) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw data
  return { ...product, ...changes }
}

function StateBadge({ state }: { state: HealthState }) {
  const label = state === 'ok' ? 'OK' : state === 'atencao' ? 'Atenção' : 'Pendente'
  return <span className={`health-pill ${state}`}>{label}</span>
}

function copy(text: string, notify: (message: string) => void) {
  navigator.clipboard?.writeText(text).then(() => notify(`SKU ${text} copiado.`)).catch(() => notify('Não foi possível copiar.'))
}

export function CatalogManager({ products, onSaved, notify }: { products: Product[]; onSaved: (product: Product) => void; notify: (message: string) => void }) {
  const [filters, setFilters] = useState<CatalogFilters>(emptyFilters)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Product | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query), 250); return () => window.clearTimeout(timer) }, [query])
  const haystacks = useMemo(() => products.filter(isPublicProduct).map(guideMatchText), [products])
  const categories = useMemo(() => catalogCategories(products), [products])
  const visible = useMemo(() => filterProducts(products, { ...filters, query: debounced }, haystacks), [products, filters, debounced, haystacks])
  const guideIds = useMemo(() => new Set(products.filter((product) => Boolean(productGuides(product, haystacks).specific)).map((product) => product.id)), [products, haystacks])
  const summary = useMemo(() => catalogExecutiveSummary(products, CURATED_PRODUCT_FAMILIES, guideIds), [products, guideIds])
  const actions = useMemo(() => catalogActionQueue(products, CURATED_PRODUCT_FAMILIES, guideIds), [products, guideIds])
  // Mantém o produto em edição sincronizado com a lista após salvar.
  useEffect(() => { if (editing) { const fresh = products.find((item) => item.id === editing.id); if (fresh && fresh !== editing) setEditing(fresh) } }, [products]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProducts = products.filter((product) => selected.has(product.id))
  const toggle = (id: string) => setSelected((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const allVisibleSelected = visible.length > 0 && visible.every((product) => selected.has(product.id))

  async function applyBulk(changes: EditorialChanges, verb: string) {
    if (!selectedProducts.length || bulkBusy) return
    if (!window.confirm(`${verb} ${selectedProducts.length} produto(s)?`)) return
    setBulkBusy(true)
    let done = 0
    try {
      for (const product of selectedProducts) { onSaved(await patchOverride(product, changes)); done++ }
      notify(`${verb}: ${done} produto(s) atualizados.`)
      setSelected(new Set())
    } catch { notify(`Falha após ${done} de ${selectedProducts.length}. Recarregue e tente de novo.`) } finally { setBulkBusy(false) }
  }

  return (
    <div className="catalog-manager">
      <section className="catalog-operations" aria-label="Resumo operacional do catálogo">
        <div className="catalog-kpis">
          <article><span>Públicos</span><b>{summary.public}</b></article><article><span>Ocultos</span><b>{summary.hidden}</b></article>
          <article><span>Sem guia</span><b>{summary.withoutGuide}</b></article><article><span>Sem família</span><b>{summary.withoutFamily}</b></article>
          <article><span>Sem canal</span><b>{summary.withoutChannel}</b></article><article><span>Preços divergentes</span><b>{summary.priceDivergences}</b></article>
        </div>
        {!!actions.length && <div className="catalog-actions"><h3>Ações necessárias</h3>{actions.map((action) => <button type="button" key={action.kind} onClick={() => {
          if (action.filter === 'sem-canal') setFilters((current) => ({ ...current, channel: 'sem-canal' }))
          else if (action.filter !== 'precos-divergentes') setFilters((current) => ({ ...current, content: action.filter as CatalogFilters['content'] }))
        }}><b>{action.count}</b><span>{action.label}</span></button>)}</div>}
      </section>
      <div className="catalog-toolbar-admin">
        <label className="catalog-search">
          <MagnifyingGlass aria-hidden="true" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, SKU, ID ou categoria" aria-label="Buscar produtos no catálogo" />
        </label>
        <div className="catalog-filters">
          <label>Visibilidade
            <select value={filters.visibility} onChange={(event) => setFilters((f) => ({ ...f, visibility: event.target.value as CatalogFilters['visibility'] }))}>
              <option value="todos">Todos</option><option value="publicados">Publicados</option><option value="ocultos">Ocultos</option><option value="na-home">Na Home</option><option value="fora-home">Fora da Home</option><option value="destaques">Destaques</option>
            </select>
          </label>
          <label>Conteúdo
            <select value={filters.content} onChange={(event) => setFilters((f) => ({ ...f, content: event.target.value as CatalogFilters['content'] }))}>
              <option value="todos">Todos</option><option value="sem-descricao">Sem descrição própria</option><option value="sem-guia">Sem guia específico</option><option value="sem-familia">Sem família</option><option value="sem-imagem">Sem imagem</option><option value="sem-categoria">Sem categoria</option>
            </select>
          </label>
          <label>Canal
            <select value={filters.channel} onChange={(event) => setFilters((f) => ({ ...f, channel: event.target.value as CatalogFilters['channel'] }))}>
              <option value="todos">Todos</option><option value="mercado-livre">Mercado Livre</option><option value="shopee">Shopee</option><option value="tiktok">TikTok</option><option value="multicanal">Multicanal</option><option value="sem-canal">Sem canal</option>
            </select>
          </label>
          <label>Categoria
            <select value={filters.category} onChange={(event) => setFilters((f) => ({ ...f, category: event.target.value }))}>
              <option value="todas">Todas</option>{categories.map((category) => <option key={category} value={category}>{category.replaceAll('-', ' ')}</option>)}
            </select>
          </label>
        </div>
      </div>

      {selectedProducts.length > 0 && (
        <div className="catalog-bulk" role="region" aria-label="Ações em lote">
          <b>{selectedProducts.length} selecionado(s)</b>
          <button type="button" disabled={bulkBusy} onClick={() => applyBulk({ showOnStorefront: true }, 'Publicar')}>Publicar</button>
          <button type="button" disabled={bulkBusy} onClick={() => applyBulk({ showOnStorefront: false }, 'Ocultar')}>Ocultar</button>
          <button type="button" disabled={bulkBusy} onClick={() => applyBulk({ showOnHome: true }, 'Mostrar na Home')}>Na Home</button>
          <button type="button" disabled={bulkBusy} onClick={() => applyBulk({ showOnHome: false }, 'Remover da Home')}>Fora da Home</button>
          <button type="button" disabled={bulkBusy} onClick={() => applyBulk({ featured: true }, 'Destacar')}>Destacar</button>
          <button type="button" disabled={bulkBusy} onClick={() => applyBulk({ featured: false }, 'Remover destaque')}>Sem destaque</button>
          <button type="button" className="ghost" onClick={() => setSelected(new Set())}>Limpar</button>
        </div>
      )}

      <p className="catalog-count">{visible.length} de {products.length} produtos</p>
      <div className="table-wrap catalog-table-wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th><input type="checkbox" aria-label="Selecionar todos os visíveis" checked={allVisibleSelected} onChange={(event) => setSelected((current) => { const next = new Set(current); visible.forEach((product) => event.target.checked ? next.add(product.id) : next.delete(product.id)); return next })} /></th>
              <th>Produto</th><th>Preço</th><th>Visibilidade</th><th>Canais</th><th>Guias</th><th>Atualizado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((product) => {
              const guides = productGuides(product, haystacks)
              return (
                <tr key={product.id} className={selected.has(product.id) ? 'selected' : ''}>
                  <td><input type="checkbox" aria-label={`Selecionar ${displayTitle(product)}`} checked={selected.has(product.id)} onChange={() => toggle(product.id)} /></td>
                  <td data-label="Produto">
                    <div className="catalog-product-cell">
                      <img src={product.images[0] || '/assets/product-placeholder.webp'} alt="" width="40" height="40" loading="lazy" />
                      <div>
                        <b>{displayTitle(product)}</b>
                        <small className="sku">{product.sku || 'SKU pendente'} · {product.category.replaceAll('-', ' ')}</small>
                      </div>
                    </div>
                  </td>
                  <td data-label="Preço">{money(product.price)}</td>
                  <td data-label="Visibilidade">
                    <div className="catalog-flags">
                      <span className={`flag ${isPublicProduct(product) ? 'on' : 'off'}`}>{isPublicProduct(product) ? 'Publicado' : 'Oculto'}</span>
                      {showsOnHome(product) && <span className="flag home">Home</span>}
                      {isPublicProduct(product) && product.featured && <span className="flag star">Destaque</span>}
                    </div>
                  </td>
                  <td data-label="Canais">
                    <div className="catalog-channels">{product.listings.length ? product.listings.map((listing) => <span key={listing.marketplace + listing.externalId} className={`chan ${listing.active ? 'on' : 'off'}`}>{CHANNEL_LABEL[listing.marketplace] || listing.marketplace}</span>) : <span className="chan none">—</span>}</div>
                  </td>
                  <td data-label="Guias">{guides.specific ? <span title={guides.specific.title}>{guides.related.length} guia(s)</span> : <span className="muted">Sem guia</span>}</td>
                  <td data-label="Atualizado">{new Date(product.updatedAt).toLocaleDateString('pt-BR')}</td>
                  <td><button type="button" className="button ghost small" onClick={() => setEditing(product)}><PencilSimple aria-hidden="true" /> Editar</button></td>
                </tr>
              )
            })}
            {!visible.length && <tr><td colSpan={8} className="catalog-empty">Nenhum produto corresponde aos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <ProductDrawer key={editing.id} product={editing} haystacks={haystacks} onClose={() => setEditing(null)} onSaved={onSaved} notify={notify} />}
    </div>
  )
}

const TABS = ['produto', 'visibilidade', 'conteudo', 'comercial', 'seo', 'canais', 'saude'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = { produto: 'Produto', visibilidade: 'Visibilidade', conteudo: 'Conteúdo', comercial: 'Comercial', seo: 'SEO', canais: 'Canais', saude: 'Saúde' }

function ProductDrawer({ product, haystacks, onClose, onSaved, notify }: { product: Product; haystacks: string[]; onClose: () => void; onSaved: (product: Product) => void; notify: (message: string) => void }) {
  const [tab, setTab] = useState<Tab>('produto')
  const [saving, setSaving] = useState(false)
  const [showOnStorefront, setShowOnStorefront] = useState(product.showOnStorefront !== false)
  const [showOnHome, setShowOnHome] = useState(product.showOnHome !== false)
  const [featured, setFeatured] = useState(product.featured)
  const [storefrontTitle, setStorefrontTitle] = useState(product.storefrontTitle || '')
  const [storefrontDescription, setStorefrontDescription] = useState(product.storefrontDescription || '')
  const [descriptionImages, setDescriptionImages] = useState((product.descriptionImages || []).join('\n'))
  const [seoTitle, setSeoTitle] = useState(product.seoTitle || '')
  const [seoDescription, setSeoDescription] = useState(product.seoDescription || '')
  const [seoTags, setSeoTags] = useState((product.seoTags || []).join(', '))
  const [familyId, setFamilyId] = useState(product.familyId || familyForProduct(product.id, CURATED_PRODUCT_FAMILIES)?.id || '')
  const [relatedIds, setRelatedIds] = useState((product.relatedProducts || []).map((relation) => relation.productId).join(', '))
  const [relationType, setRelationType] = useState<ProductRelation['type']>(product.relatedProducts?.[0]?.type || 'combina-com')
  const [homePriority, setHomePriority] = useState(product.homePriority ?? 100)

  useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])

  const guides = productGuides(product, haystacks)
  const canonical = `${SITE_ORIGIN}/produto/${product.slug}`
  const serpTitle = `${(seoTitle.trim() || storefrontTitle.trim() || displayTitle(product))} | Distrito Geek`
  const serpDescription = seoDescription.trim() || storefrontDescription.trim() || product.description
  const health = productHealth({ ...product, showOnStorefront, showOnHome, featured, storefrontDescription: storefrontDescription.trim() || undefined, seoTitle: seoTitle.trim() || undefined, seoDescription: seoDescription.trim() || undefined }, Boolean(guides.specific))

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const changes: EditorialChanges = {
        storefrontTitle: storefrontTitle.trim() || undefined,
        storefrontDescription: storefrontDescription.trim() || undefined,
        descriptionImages: descriptionImages.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        seoTags: seoTags.split(',').map((tag) => tag.trim()).filter(Boolean),
        showOnStorefront, showOnHome, featured, familyId: familyId || undefined, homePriority,
        relatedProducts: relatedIds.split(',').map((id) => id.trim()).filter((id) => id && id !== product.id).map((productId, priority) => ({ productId, type: relationType, priority })),
      }
      onSaved(await patchOverride(product, changes))
      notify('Produto salvo. Pode levar até ~1 minuto para refletir publicamente.')
      onClose()
    } catch { notify('Não foi possível salvar. Verifique os dados e tente de novo.') } finally { setSaving(false) }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={`Editar ${displayTitle(product)}`} onClick={(event) => event.stopPropagation()}>
        <header className="drawer-head">
          <div><b>{displayTitle(product)}</b><small className="sku">{product.sku || 'SKU pendente'}</small></div>
          <button type="button" className="drawer-close" aria-label="Fechar" onClick={onClose}><X /></button>
        </header>
        <nav className="drawer-tabs" aria-label="Seções do produto">
          {TABS.map((item) => <button key={item} type="button" className={tab === item ? 'active' : ''} aria-current={tab === item} onClick={() => setTab(item)}>{TAB_LABEL[item]}</button>)}
        </nav>
        <div className="drawer-body">
          {tab === 'produto' && <div className="drawer-grid">
            <img className="drawer-image" src={product.images[0] || '/assets/product-placeholder.webp'} alt={displayTitle(product)} width="120" height="120" />
            <dl className="drawer-facts">
              <div><dt>SKU DG</dt><dd className="sku-row"><code>{product.sku || 'pendente (gerado na sincronização)'}</code>{product.sku && <button type="button" className="icon-button" aria-label="Copiar SKU" onClick={() => copy(product.sku!, notify)}><Copy /></button>}</dd></div>
              <div><dt>ID interno</dt><dd><code>{product.id}</code></dd></div>
              <div><dt>Categoria</dt><dd>{product.category.replaceAll('-', ' ')}</dd></div>
              <div><dt>Preço</dt><dd>{money(product.price)} <small>(sincronizado do anúncio)</small></dd></div>
              <div><dt>Status</dt><dd>{product.status}</dd></div>
            </dl>
          </div>}

          {tab === 'visibilidade' && <div className="drawer-fields">
            <label className="switch"><input type="checkbox" checked={showOnStorefront} onChange={(event) => setShowOnStorefront(event.target.checked)} /> <span><b>Publicado</b><em>O produto pode aparecer publicamente no catálogo, busca, categorias e páginas relacionadas.</em></span></label>
            <label className="switch"><input type="checkbox" checked={showOnHome} disabled={!showOnStorefront} onChange={(event) => setShowOnHome(event.target.checked)} /> <span><b>Mostrar na Home</b><em>Exibe o produto nas vitrines da página inicial.</em></span></label>
            <label className="switch"><input type="checkbox" checked={featured} disabled={!showOnStorefront || !showOnHome} onChange={(event) => setFeatured(event.target.checked)} /> <span><b>Destaque na Home</b><em>Dá prioridade visual ao produto na Home.</em></span></label>
            {!showOnStorefront && <p className="drawer-hint">Com o produto oculto, "Mostrar na Home" e "Destaque" não têm efeito público.</p>}
          </div>}

          {tab === 'conteudo' && <div className="drawer-fields">
            <label>Título na vitrine<input value={storefrontTitle} placeholder="Usar título normalizado" onChange={(event) => setStorefrontTitle(event.target.value)} /></label>
            <label>Descrição na vitrine<textarea value={storefrontDescription} rows={4} placeholder="Descrição própria da loja (fallback: descrição do anúncio)" onChange={(event) => setStorefrontDescription(event.target.value)} /></label>
            <label>Imagens da descrição (uma URL por linha)<textarea value={descriptionImages} rows={2} placeholder="https://.../detalhe.jpg" onChange={(event) => setDescriptionImages(event.target.value)} /></label>
            <div className="drawer-info">
              <span><b>Guia específico:</b> {guides.specific ? guides.specific.title : 'Sem guia específico.'}</span>
              <span><b>Guias relacionados:</b> {guides.related.length}</span>
              <span><b>Categoria:</b> {product.category.replaceAll('-', ' ')}</span>
            </div>
          </div>}

          {tab === 'comercial' && <div className="drawer-fields">
            <label>Família editorial<select value={familyId} onChange={(event) => setFamilyId(event.target.value)}><option value="">Sem família</option>{CURATED_PRODUCT_FAMILIES.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select><em className="field-hint">Associação manual. O sistema não classifica produtos por palavra-chave.</em></label>
            <label>Prioridade na Home<input type="number" min="0" value={homePriority} onChange={(event) => setHomePriority(Number(event.target.value))} /></label>
            <label>Tipo da relação<select value={relationType} onChange={(event) => setRelationType(event.target.value as ProductRelation['type'])}><option value="combina-com">Combina com</option><option value="compre-junto">Compre junto</option><option value="complete-o-encontro">Complete o encontro</option><option value="alternativa">Alternativa</option><option value="mesma-familia">Mesma família</option></select></label>
            <label>IDs de produtos relacionados<input value={relatedIds} onChange={(event) => setRelatedIds(event.target.value)} placeholder="MLB123, MLB456" /><em className="field-hint">Separe por vírgula. Produtos ocultos ou inválidos nunca aparecem publicamente.</em></label>
          </div>}

          {tab === 'seo' && <div className="drawer-fields">
            <label>Título SEO<input value={seoTitle} maxLength={180} placeholder="Usar título da vitrine" onChange={(event) => setSeoTitle(event.target.value)} /></label>
            <label>Descrição SEO<textarea value={seoDescription} rows={3} maxLength={500} placeholder="Resumo para mecanismos de busca" onChange={(event) => setSeoDescription(event.target.value)} /></label>
            <label>Termos internos / busca<input value={seoTags} placeholder="miniatura, rpg, resina" onChange={(event) => setSeoTags(event.target.value)} /><em className="field-hint">Usados internamente para busca e associação. Não são enviados como meta keywords ao Google.</em></label>
            <label>Canonical<input value={canonical} readOnly /></label>
            <div className="serp-preview" aria-label="Prévia no Google">
              <span className="serp-title">{serpTitle}</span>
              <span className="serp-url">{canonical}</span>
              <span className="serp-desc">{serpDescription.slice(0, 160)}</span>
            </div>
          </div>}

          {tab === 'canais' && <div className="drawer-fields">
            <div className="channels-list">
              {(['mercado-livre', 'shopee', 'tiktok'] as const).map((marketplace) => {
                const listing = product.listings.find((item) => item.marketplace === marketplace)
                return <div key={marketplace} className={`channel-card ${listing ? (listing.active ? 'on' : 'off') : 'none'}`}>
                  <b>{CHANNEL_FEE_PRESETS[marketplace]?.label || marketplace}</b>
                  {listing ? <>
                    <span className="channel-state">{listing.active ? 'Ativo' : 'Inativo'}</span>
                    <small>ID {listing.externalId}</small>
                    <a href={listing.url} target="_blank" rel="noopener noreferrer">Abrir anúncio</a>
                  </> : <span className="channel-state">Não configurado</span>}
                </div>
              })}
            </div>
            <PriceSimulator price={product.price} channels={product.listings.map((listing) => listing.marketplace)} />
          </div>}

          {tab === 'saude' && <div className="drawer-fields health-groups">
            {health.map((group) => <div key={group.group} className="health-group"><h4>{group.group}</h4><ul>{group.items.map((item) => <li key={item.label}><span>{item.label}</span><StateBadge state={item.state} /></li>)}</ul></div>)}
          </div>}
        </div>

        <footer className="drawer-foot">
          <StorefrontPreview product={product} title={storefrontTitle.trim() || displayTitle(product)} description={storefrontDescription} showOnStorefront={showOnStorefront} />
          <button type="button" className="button primary" disabled={saving} onClick={save}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
        </footer>
      </aside>
    </div>
  )
}

function StorefrontPreview({ product, title, description, showOnStorefront }: { product: Product; title: string; description: string; showOnStorefront: boolean }) {
  return (
    <div className="storefront-preview" aria-label="Prévia da vitrine">
      <img src={product.images[0] || '/assets/product-placeholder.webp'} alt="" width="48" height="48" />
      <div>
        <b>{title}</b>
        <span className="preview-price">{money(product.price)}</span>
        {description.trim() && <small>{description.trim().slice(0, 80)}</small>}
      </div>
      <span className={`flag ${showOnStorefront ? 'on' : 'off'}`}>{showOnStorefront ? 'Público' : 'Oculto'}</span>
    </div>
  )
}

function PriceSimulator({ price, channels }: { price: number; channels: string[] }) {
  const preset = channels.map((channel) => CHANNEL_FEE_PRESETS[channel]).find(Boolean) || CHANNEL_FEE_PRESETS['mercado-livre']
  const [inputs, setInputs] = useState({ price, percentFee: preset.percentFee, fixedFee: preset.fixedFee, otherCosts: 0 })
  const result = estimateNet(inputs)
  const field = (key: keyof typeof inputs, label: string, step = '0.01') => (
    <label>{label}<input type="number" min="0" step={step} value={inputs[key]} onChange={(event) => setInputs((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>
  )
  return (
    <div className="price-simulator">
      <h4>Simulador de preço</h4>
      <p className="field-hint">Taxas iniciais por canal são apenas sugestão editável — ajuste conforme o canal e o momento.</p>
      <div className="sim-inputs">
        <label>Preset<select onChange={(event) => { const p = CHANNEL_FEE_PRESETS[event.target.value]; if (p) setInputs((c) => ({ ...c, percentFee: p.percentFee, fixedFee: p.fixedFee })) }} defaultValue="">
          <option value="" disabled>Canal…</option>{Object.entries(CHANNEL_FEE_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </select></label>
        {field('price', 'Preço anunciado')}
        {field('percentFee', 'Taxa %', '0.1')}
        {field('fixedFee', 'Taxa fixa')}
        {field('otherCosts', 'Outros custos')}
      </div>
      <dl className="sim-result">
        <div><dt>Bruto</dt><dd>{money(result.gross)}</dd></div>
        <div><dt>Taxa %</dt><dd>-{money(result.percentAmount)}</dd></div>
        <div><dt>Taxa fixa</dt><dd>-{money(result.fixedFee)}</dd></div>
        <div><dt>Outros</dt><dd>-{money(result.otherCosts)}</dd></div>
        <div className="net"><dt>Líquido estimado</dt><dd>{money(result.net)}</dd></div>
      </dl>
    </div>
  )
}
