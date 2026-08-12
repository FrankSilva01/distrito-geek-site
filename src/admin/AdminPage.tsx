import { ChartBar, SignOut, UploadSimple } from "@phosphor-icons/react";
import { FormEvent, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import type { Marketplace, Product } from "../domain/product";
import { displayTitle } from "../domain/storefront-presentation";
import { normalizeMarketplaceRow } from "../import/normalize-row";
import "../styles/admin-analytics.css";

const messageOf = (value: unknown) =>
  typeof value === "string"
    ? value
    : value &&
        typeof value === "object" &&
        "message" in value &&
        typeof value.message === "string"
      ? value.message
      : "Não foi possível concluir. Tente novamente.";
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const LANDING_KIND_LABEL: Record<string, string> = { guide: "Guia", product: "Produto", category: "Categoria", other: "Outro" };
// R\u00f3tulo da varia\u00e7\u00e3o. changeRatio null = sem base anterior (n\u00e3o mostra infinito).
function TrendCell({ metric }: { metric?: { current: number; previous: number; delta: number; changeRatio: number | null } }) {
  if (!metric) return <b>0</b>;
  const arrow = metric.delta > 0 ? "\u25b2" : metric.delta < 0 ? "\u25bc" : "\u2022";
  const tone = metric.delta > 0 ? "up" : metric.delta < 0 ? "down" : "flat";
  const pct = metric.changeRatio === null ? (metric.current > 0 ? "novo" : "\u2014") : `${metric.changeRatio >= 0 ? "+" : ""}${(metric.changeRatio * 100).toFixed(0)}%`;
  return <span className={`trend-cell ${tone}`}><b>{metric.current}</b><small>{arrow} {pct} <span>ant. {metric.previous}</span></small></span>;
}

type AnalyticsReport = {
  configured: boolean;
  missing?: string[];
  period?: number;
  generatedAt?: string;
  totals?: { users: number; sessions: number; pageViews: number; productViews: number; mercadoLivreClicks: number; shopeeClicks: number; ctr: number };
  channels?: Array<{ channel: string; sourceMedium: string; users: number; sessions: number; share: number }>;
  products?: Array<{ path: string; title: string; views: number; users: number; mercadoLivreClicks: number; shopeeClicks: number; externalCtr: number }>;
  health?: Array<{ provider: string; status: "active" | "waiting" | "missing" | "error"; detail: string }>;
  guideFunnel?: Array<{ slug: string; title: string; cluster: string; views: number; productClicks: number; categoryClicks: number; relatedClicks: number; productCtr: number }>;
  clusterView?: Array<{ cluster: string; label: string; guideViews: number; organicEntrances: number; impressions: number; clicks: number; productClicks: number }>;
  organicLandings?: Array<{ path: string; kind: string; users: number; sessions: number; clicks: number; impressions: number; ctr: number; position: number }>;
  trends?: Record<"organicClicks" | "impressions" | "organicUsers" | "organicSessions" | "guideViews" | "productClicks", { current: number; previous: number; delta: number; changeRatio: number | null }>;
  recentEvents?: Array<{ name: string; count: number; minutesAgo: number; lastSeenAt: string }>;
  clarity?: { configured: boolean; available: boolean; periodDays: number; sessions: number; users: number; pagesPerSession: number; scrollDepth: number; engagementTimeSeconds: number; deadClicks: number; rageClicks: number; quickbacks: number; scriptErrors: number; message?: string };
  searchConsole?: {
    available?: boolean;
    status?: "ok" | "empty" | "error";
    message?: string;
    totals: { clicks: number; impressions: number; ctr: number; position: number };
    rows: Array<{ query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topQueries: Array<{ label: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topPages: Array<{ label: string; clicks: number; impressions: number; ctr: number; position: number }>;
    opportunities: Array<{ kind: string; label: string; clicks: number; impressions: number; ctr: number; position: number; previousClicks?: number }>;
    guidePerformance?: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
    searchTerms?: Array<{ query: string; landingPage: string; clicks: number; impressions: number; ctr: number; position: number }>;
    seoBands?: Array<{ id: string; label: string; hint: string; queries: Array<{ query: string; landingPage: string; clicks: number; impressions: number; ctr: number; position: number }> }>;
    lowCtr?: Array<{ query: string; landingPage: string; clicks: number; impressions: number; ctr: number; position: number; suggestion: string }>;
    contentGaps?: Array<{ query: string; landingPage: string; impressions: number; clicks: number; position: number; note: string }>;
  };
};

type CatalogHealthReport = {
  status: "healthy" | "warning" | "attention";
  checkedAt: string;
  totals: { products: number; published: number; errors: number; warnings: number };
  issues: Array<{ productId: string; title: string; severity: "error" | "warning"; kind: string; message: string }>;
};

function CurationRow({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: (product: Product) => void;
}) {
  const [storefrontTitle, setStorefrontTitle] = useState(
    product.storefrontTitle || "",
  );
  const [storefrontDescription, setStorefrontDescription] = useState(product.storefrontDescription || "");
  const [descriptionImages, setDescriptionImages] = useState((product.descriptionImages || []).join("\n"));
  const [seoTitle, setSeoTitle] = useState(product.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(product.seoDescription || "");
  const [seoTags, setSeoTags] = useState((product.seoTags || []).join(", "));
  const [showOnStorefront, setShowOnStorefront] = useState(
    product.showOnStorefront,
  );
  const [featured, setFeatured] = useState(product.featured);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin-products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          storefrontTitle: storefrontTitle.trim() || undefined,
          storefrontDescription: storefrontDescription.trim() || undefined,
          descriptionImages: descriptionImages.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean),
          seoTitle: seoTitle.trim() || undefined,
          seoDescription: seoDescription.trim() || undefined,
          seoTags: seoTags.split(",").map((tag) => tag.trim()).filter(Boolean),
          showOnStorefront,
          featured,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw data;
      onSaved({
        ...product,
        storefrontTitle: storefrontTitle.trim() || undefined,
        storefrontDescription: storefrontDescription.trim() || undefined,
        descriptionImages: descriptionImages.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        seoTags: seoTags.split(",").map((tag) => tag.trim()).filter(Boolean),
        showOnStorefront,
        featured,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="curation-row">
      <div>
        <b>{displayTitle(product)}</b>
        <small>{product.marketplaceTitle || product.title}</small>
      </div>
      <label>
        Título na vitrine
        <input
          value={storefrontTitle}
          placeholder="Usar título normalizado"
          onChange={(event) => setStorefrontTitle(event.target.value)}
        />
      </label>
      <label>
        Descrição na vitrine
        <textarea value={storefrontDescription} placeholder="Usar descrição do anúncio" onChange={(event) => setStorefrontDescription(event.target.value)} />
      </label>
      <label>
        Título SEO
        <input value={seoTitle} maxLength={180} placeholder="Usar título da vitrine" onChange={(event) => setSeoTitle(event.target.value)} />
      </label>
      <label>
        Descrição SEO
        <textarea value={seoDescription} maxLength={500} placeholder="Resumo para mecanismos de busca" onChange={(event) => setSeoDescription(event.target.value)} />
      </label>
      <label>
        Termos internos / busca
        <input value={seoTags} placeholder="miniatura, rpg, resina" onChange={(event) => setSeoTags(event.target.value)} />
      </label>
      <label>
        Imagens da descrição (uma URL por linha)
        <textarea value={descriptionImages} placeholder="https://.../detalhe.jpg" onChange={(event) => setDescriptionImages(event.target.value)} />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={showOnStorefront}
          onChange={(event) => setShowOnStorefront(event.target.checked)}
        />{" "}
        Mostrar na vitrine
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={featured}
          onChange={(event) => setFeatured(event.target.checked)}
        />{" "}
        Produto em destaque
      </label>
      <button
        type="button"
        className="button ghost"
        disabled={saving}
        onClick={save}
      >
        {saving ? "Salvando…" : "Salvar curadoria"}
      </button>
    </article>
  );
}

export function AdminPage() {
  const [auth, setAuth] = useState<"loading" | "yes" | "no">("loading");
  const [activeSection, setActiveSection] = useState<"overview" | "analytics" | "health">("overview");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]),
    [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState(28);
  const [analyticsError, setAnalyticsError] = useState("");
  const [catalogHealthReport, setCatalogHealthReport] = useState<CatalogHealthReport | null>(null);
  const [healthError, setHealthError] = useState("");
  const loadProducts = async () => {
    const response = await fetch("/api/admin-products");
    if (response.ok) setProducts((await response.json()).products || []);
  };
  const loadAnalytics = async (period = analyticsPeriod) => {
    setAnalytics(null);
    setAnalyticsError("");
    try {
      const response = await fetch(`/api/admin-analytics?period=${period}&refresh=${Date.now()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw data;
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(messageOf(err));
    }
  };
  const loadHealth = async () => {
    setHealthError("");
    try {
      const response = await fetch(`/api/admin-health?refresh=${Date.now()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw data;
      setCatalogHealthReport(data);
    } catch (err) { setHealthError(messageOf(err)); }
  };
  useEffect(() => {
    fetch("/api/admin-session")
      .then((response) => {
        setAuth(response.ok ? "yes" : "no");
        if (response.ok) {
          void loadProducts();
          void loadAnalytics(28);
          void loadHealth();
        }
      })
      .catch(() => setAuth("no"));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw data;
      setAuth("yes");
      await loadProducts();
      await loadAnalytics(analyticsPeriod);
      await loadHealth();
    } catch (err) {
      setError(messageOf(err));
    }
  }
  async function logout() {
    await fetch("/api/admin-session", { method: "DELETE" });
    setAuth("no");
  }
  async function readFile(file: File) {
    const book = XLSX.read(await file.arrayBuffer());
    setPreview(
      XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" }),
    );
  }
  async function confirmImport() {
    setError("");
    const imported = preview
      .map((row, index) => normalizeMarketplaceRow(row, index + 2))
      .filter(
        (result) => !result.ignored && result.product && !result.errors.length,
      )
      .map((result) => result.product!);
    try {
      const response = await fetch("/api/admin-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ products: imported }),
      });
      const data = await response.json();
      if (!response.ok) throw data;
      setNotice(`${data.accepted} anúncios importados como rascunho.`);
      setPreview([]);
      await loadProducts();
    } catch (err) {
      setError(messageOf(err));
    }
  }
  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget),
      title = String(form.get("title")),
      marketplace = String(form.get("marketplace")) as Marketplace,
      url = String(form.get("url")),
      image = String(form.get("image")),
      now = new Date().toISOString();
    const product: Product = {
      id: `manual-${crypto.randomUUID()}`,
      slug: `${slugify(title)}-${Date.now()}`,
      title,
      description: String(form.get("description")),
      price: Number(form.get("price")),
      currency: "BRL",
      stock: Number(form.get("stock") || 0),
      status: "draft",
      category: "colecionaveis",
      images: image ? [image] : [],
      attributes: {},
      featured: false,
      showOnStorefront: true,
      listings: [
        { marketplace, externalId: `manual-${Date.now()}`, url, active: true },
      ],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const response = await fetch("/api/admin-products", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(product),
      });
      const data = await response.json();
      if (!response.ok) throw data;
      setNotice("Anúncio salvo como rascunho.");
      event.currentTarget.reset();
      await loadProducts();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  if (auth === "loading")
    return (
      <main className="admin-login">
        <p>Validando acesso…</p>
      </main>
    );
  if (auth === "no")
    return (
      <main className="admin-login">
        <form onSubmit={login}>
          <div className="brand">
            <span>DISTRITO</span>
            <strong>GEEK</strong>
          </div>
          <p className="eyebrow">Painel exclusivo</p>
          <h1>Administrar catálogo</h1>
          <label>
            E-mail
            <input type="email" name="email" required autoComplete="username" />
          </label>
          <label>
            Senha
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary">Entrar</button>
          <a href="/">Voltar ao site</a>
        </form>
      </main>
    );
  return (
    <main className="admin-shell">
      <aside>
        <div className="brand small">
          <span>DISTRITO</span>
          <strong>GEEK</strong>
        </div>
        <b>Catálogo</b>
        <button className={activeSection === "overview" ? "active" : ""} onClick={() => setActiveSection("overview")}>
          <ChartBar /> Visão geral
        </button>
        <button className={activeSection === "analytics" ? "active" : ""} onClick={() => { setActiveSection("analytics"); void loadAnalytics(analyticsPeriod); }}>
          <ChartBar /> Análises
        </button>
        <button className={activeSection === "health" ? "active" : ""} onClick={() => { setActiveSection("health"); void loadHealth(); }}>
          <ChartBar /> Saúde do catálogo
        </button>
        <button onClick={logout}>
          <SignOut /> Sair
        </button>
      </aside>
      <section>
        <header>
          <div>
            <p className="eyebrow">Administração</p>
            <h1>{activeSection === "analytics" ? "Análises" : activeSection === "health" ? "Saúde do catálogo" : "Visão geral"}</h1>
          </div>
          <a className="button ghost" href="/">
            Abrir site
          </a>
        </header>
        {notice && (
          <div className="form-success" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {activeSection === "health" && <div className="admin-card analytics-card">
          <div className="analytics-heading"><div><p className="eyebrow">Monitoramento automático</p><h2>Produtos e conversão</h2></div><button className="button ghost" type="button" onClick={() => void loadHealth()}>Verificar agora</button></div>
          {healthError ? <div className="form-error" role="alert">{healthError}</div> : !catalogHealthReport ? <p>Verificando catálogo…</p> : <>
            <div className="integration-health"><article className={`health-card health-${catalogHealthReport.status === "healthy" ? "active" : catalogHealthReport.status === "warning" ? "waiting" : "error"}`}><span className="health-dot" aria-hidden="true"/><div><b>{catalogHealthReport.status === "healthy" ? "Catálogo saudável" : "Catálogo exige atenção"}</b><small>Imagem, preço, anúncio e sincronização</small></div></article></div>
            <div className="stats analytics-stats"><div><span>Produtos</span><b>{catalogHealthReport.totals.products}</b></div><div><span>Publicados</span><b>{catalogHealthReport.totals.published}</b></div><div><span>Erros</span><b>{catalogHealthReport.totals.errors}</b></div><div><span>Avisos</span><b>{catalogHealthReport.totals.warnings}</b></div></div>
            {catalogHealthReport.issues.length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Tipo</th><th>Severidade</th><th>Diagnóstico</th></tr></thead><tbody>{catalogHealthReport.issues.map((issue, index) => <tr key={`${issue.productId}-${issue.kind}-${index}`}><td>{issue.title}</td><td>{issue.kind}</td><td>{issue.severity === "error" ? "Erro" : "Aviso"}</td><td>{issue.message}</td></tr>)}</tbody></table></div> : <div className="form-success" role="status">Nenhum problema estrutural encontrado nos produtos publicados.</div>}
            <small>Última verificação em {new Date(catalogHealthReport.checkedAt).toLocaleString("pt-BR")}. O monitor externo também valida páginas, imagens e links diariamente.</small>
          </>}
        </div>}
        {activeSection === "overview" && <>
        <div className="stats">
          <div>
            <span>Publicados</span>
            <b>{products.filter((p) => p.status === "published").length}</b>
          </div>
          <div>
            <span>Pausados</span>
            <b>{products.filter((p) => p.status === "paused").length}</b>
          </div>
          <div>
            <span>Rascunhos</span>
            <b>{products.filter((p) => p.status === "draft").length}</b>
          </div>
        </div>
        </>}
        {activeSection === "analytics" && <div className="admin-card analytics-card">
          <div className="analytics-heading">
            <div><p className="eyebrow">Dados reais</p><h2>Aquisição e SEO</h2></div>
            <label>Período
              <select value={analyticsPeriod} onChange={(event) => { const period = Number(event.target.value); setAnalyticsPeriod(period); void loadAnalytics(period); }}>
                <option value={7}>7 dias</option><option value={28}>28 dias</option><option value={90}>90 dias</option>
              </select>
            </label>
          </div>
          {analyticsError ? <div className="form-error" role="alert">{analyticsError}</div> : !analytics ? <p>Carregando dados de aquisição…</p> : !analytics.configured || !analytics.totals ? <p>Integrações analíticas ainda não configuradas{analytics.missing?.length ? `: ${analytics.missing.join(", ")}` : "."}</p> : <>
            <h3>Saúde das integrações</h3>
            <div className="integration-health">
              {(analytics.health || []).map((item) => <article key={item.provider} className={`health-card health-${item.status}`}><span className="health-dot" aria-hidden="true" /><div><b>{item.provider}</b><small>{item.detail}</small></div></article>)}
            </div>
            <h3>Eventos recentes</h3>
            {(analytics.recentEvents || []).length ? <div className="table-wrap"><table><thead><tr><th>Evento</th><th>Quantidade</th><th>Último recebimento</th></tr></thead><tbody>{analytics.recentEvents!.map((event) => <tr key={`${event.name}-${event.minutesAgo}`}><td>{event.name}</td><td>{event.count}</td><td>{event.minutesAgo === 0 ? "Agora" : `há ${event.minutesAgo} min`}</td></tr>)}</tbody></table></div> : <p>Nenhum evento foi recebido nos últimos 30 minutos.</p>}
            <div className="stats analytics-stats">
              <div><span>Usuários</span><b>{analytics.totals.users}</b></div><div><span>Sessões</span><b>{analytics.totals.sessions}</b></div><div><span>Visualizações</span><b>{analytics.totals.pageViews}</b></div><div><span>Produtos vistos</span><b>{analytics.totals.productViews}</b></div><div><span>Cliques ML</span><b>{analytics.totals.mercadoLivreClicks}</b></div><div><span>Cliques Shopee</span><b>{analytics.totals.shopeeClicks}</b></div><div><span>CTR marketplace</span><b>{(analytics.totals.ctr * 100).toFixed(1)}%</b></div>
            </div>
            <section className="analytics-section"><p className="analytics-kicker">Aquisição</p><h3>Canais de aquisição</h3>
            <div className="table-wrap"><table><thead><tr><th>Canal</th><th>Origem / mídia</th><th>Usuários</th><th>Sessões</th><th>% do total</th><th>Distribuição</th></tr></thead><tbody>{(analytics.channels || []).map((row) => <tr key={`${row.channel}-${row.sourceMedium}`}><td>{row.channel}</td><td>{row.sourceMedium}</td><td>{row.users}</td><td>{row.sessions}</td><td>{(row.share * 100).toFixed(1)}%</td><td><span className="channel-bar"><i style={{ width: `${Math.max(2, row.share * 100)}%` }} /></span></td></tr>)}</tbody></table></div></section>
            <section className="analytics-section"><p className="analytics-kicker">Conversão para marketplace</p><h3>Produtos mais vistos</h3>
            {(analytics.products || []).length ? <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Views</th><th>Cliques ML</th><th>Cliques Shopee</th><th>CTR externo</th></tr></thead><tbody>{analytics.products!.map((row) => <tr key={row.path}><td><a href={row.path}>{row.title}</a></td><td>{row.views}</td><td>{row.mercadoLivreClicks}</td><td>{row.shopeeClicks}</td><td>{(row.externalCtr * 100).toFixed(1)}%</td></tr>)}</tbody></table></div> : <p>A coleta começou agora; ainda não há visualizações de produto consolidadas.</p>}</section>
            <section className="analytics-section"><p className="analytics-kicker">SEO</p><h3>Pesquisa Google</h3>
            {!!analytics.searchConsole?.message && <div className="form-notice" role="status">{analytics.searchConsole.message}</div>}
            <div className="stats"><div><span>Cliques orgânicos</span><b>{analytics.searchConsole?.totals.clicks || 0}</b></div><div><span>Impressões</span><b>{analytics.searchConsole?.totals.impressions || 0}</b></div><div><span>CTR</span><b>{((analytics.searchConsole?.totals.ctr || 0) * 100).toFixed(1)}%</b></div><div><span>Posição média</span><b>{(analytics.searchConsole?.totals.position || 0).toFixed(1)}</b></div></div>
            {!!analytics.searchConsole?.guidePerformance?.length && <><h4>Desempenho dos guias no Google</h4><div className="table-wrap"><table><thead><tr><th>Guia</th><th>Cliques</th><th>Impressões</th><th>CTR</th><th>Posição</th></tr></thead><tbody>{analytics.searchConsole.guidePerformance.map((row) => <tr key={row.page}><td><a href={row.page}>{row.page.replace("/guias/", "")}</a></td><td>{row.clicks}</td><td>{row.impressions}</td><td>{(row.ctr * 100).toFixed(1)}%</td><td>{row.position.toFixed(1)}</td></tr>)}</tbody></table></div></>}
            {!!analytics.searchConsole?.searchTerms?.length && <><h4>Termos de pesquisa</h4><div className="table-wrap"><table><thead><tr><th>Consulta</th><th>Landing</th><th>Cliques</th><th>Impressões</th><th>CTR</th><th>Posição</th></tr></thead><tbody>{analytics.searchConsole.searchTerms.map((row) => <tr key={row.query}><td>{row.query}</td><td>{row.landingPage ? <a href={row.landingPage}>{row.landingPage}</a> : "—"}</td><td>{row.clicks}</td><td>{row.impressions}</td><td>{(row.ctr * 100).toFixed(1)}%</td><td>{row.position.toFixed(1)}</td></tr>)}</tbody></table></div></>}
            {!analytics.searchConsole?.searchTerms?.length && !!analytics.searchConsole?.topPages.length && <><h4>Top páginas</h4><div className="table-wrap"><table><thead><tr><th>Página</th><th>Cliques</th><th>Impressões</th><th>CTR</th><th>Posição</th></tr></thead><tbody>{analytics.searchConsole.topPages.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.clicks}</td><td>{row.impressions}</td><td>{(row.ctr * 100).toFixed(1)}%</td><td>{row.position.toFixed(1)}</td></tr>)}</tbody></table></div></>}
            {!!analytics.searchConsole?.seoBands?.some((band) => band.queries.length) && <><h3>Oportunidades de SEO</h3><p className="analytics-hint">Faixas por posição média. Dentro de cada faixa, priorize as consultas com mais impressões.</p>{analytics.searchConsole.seoBands.filter((band) => band.queries.length).map((band) => <div className="seo-band" key={band.id}><h4>{band.label}</h4><p className="analytics-hint">{band.hint}</p><div className="table-wrap"><table><thead><tr><th>Consulta</th><th>Landing</th><th>Impressões</th><th>CTR</th><th>Posição</th></tr></thead><tbody>{band.queries.map((row) => <tr key={row.query}><td>{row.query}</td><td>{row.landingPage ? <a href={row.landingPage}>{row.landingPage}</a> : "—"}</td><td>{row.impressions}</td><td>{(row.ctr * 100).toFixed(1)}%</td><td>{row.position.toFixed(1)}</td></tr>)}</tbody></table></div></div>)}</>}
            {!!analytics.searchConsole?.lowCtr?.length && <><h3>CTR abaixo do esperado</h3><p className="analytics-hint">Boa posição e volume, mas poucos cliques. Revise title, meta description e a intenção — sem alterar nada automaticamente.</p><div className="table-wrap"><table><thead><tr><th>Consulta</th><th>Landing</th><th>Impressões</th><th>CTR</th><th>Posição</th></tr></thead><tbody>{analytics.searchConsole.lowCtr.map((row) => <tr key={row.query}><td>{row.query}</td><td>{row.landingPage ? <a href={row.landingPage}>{row.landingPage}</a> : "—"}</td><td>{row.impressions}</td><td>{(row.ctr * 100).toFixed(1)}%</td><td>{row.position.toFixed(1)}</td></tr>)}</tbody></table></div></>}
            {!!analytics.searchConsole?.contentGaps?.length && <><h3>Gaps de conteúdo</h3><p className="analytics-hint">Buscas com impressões que caem na home, sem página dedicada. Uma possível oportunidade de guia ou produto — avalie caso a caso, não é criação automática.</p><div className="table-wrap"><table><thead><tr><th>Consulta</th><th>Entrada atual</th><th>Impressões</th><th>Posição</th></tr></thead><tbody>{analytics.searchConsole.contentGaps.map((row) => <tr key={row.query}><td>{row.query}</td><td>{row.landingPage}</td><td>{row.impressions}</td><td>{row.position.toFixed(1)}</td></tr>)}</tbody></table></div></>}</section>
            <section className="analytics-section"><p className="analytics-kicker">Conteúdo</p><h3>Tendências</h3>
            <p className="analytics-hint">Período atual comparado ao período anterior de mesmo tamanho. "novo" quando não havia base anterior.</p>
            <div className="stats analytics-stats trend-stats">
              <div><span>Cliques orgânicos</span><TrendCell metric={analytics.trends?.organicClicks} /></div>
              <div><span>Impressões</span><TrendCell metric={analytics.trends?.impressions} /></div>
              <div><span>Usuários orgânicos</span><TrendCell metric={analytics.trends?.organicUsers} /></div>
              <div><span>Sessões orgânicas</span><TrendCell metric={analytics.trends?.organicSessions} /></div>
              <div><span>Views de guias</span><TrendCell metric={analytics.trends?.guideViews} /></div>
              <div><span>Cliques em produto (guia)</span><TrendCell metric={analytics.trends?.productClicks} /></div>
            </div>
            <h3>Funil editorial dos guias</h3>
            {analytics.guideFunnel?.length ? <div className="table-wrap"><table><thead><tr><th>Guia</th><th>Views</th><th>Cliques produto</th><th>Cliques categoria</th><th>Cliques guia relacionado</th><th>CTR guia→produto</th></tr></thead><tbody>{analytics.guideFunnel.map((row) => <tr key={row.slug}><td><a href={`/guias/${row.slug}`}>{row.title}</a></td><td>{row.views}</td><td>{row.productClicks}</td><td>{row.categoryClicks}</td><td>{row.relatedClicks}</td><td>{(row.productCtr * 100).toFixed(1)}%</td></tr>)}</tbody></table></div> : <p>Sem eventos de guia no período. O funil aparece quando os eventos <code>guide_*</code> e a dimensão personalizada <code>guide_slug</code> estiverem ativos no GA4.</p>}
            <h3>Visão por cluster</h3>
            <div className="table-wrap"><table><thead><tr><th>Cluster</th><th>Views de guias</th><th>Entradas orgânicas</th><th>Impressões</th><th>Cliques</th><th>Cliques produto</th></tr></thead><tbody>{(analytics.clusterView || []).map((row) => <tr key={row.cluster}><td>{row.label}</td><td>{row.guideViews}</td><td>{row.organicEntrances}</td><td>{row.impressions}</td><td>{row.clicks}</td><td>{row.productClicks}</td></tr>)}</tbody></table></div>
            <h3>Landing pages orgânicas</h3>
            {analytics.organicLandings?.length ? <div className="table-wrap"><table><thead><tr><th>Landing</th><th>Tipo</th><th>Usuários</th><th>Sessões</th><th>Cliques</th><th>Impressões</th><th>CTR</th><th>Posição</th></tr></thead><tbody>{analytics.organicLandings.map((row) => <tr key={row.path}><td><a href={row.path}>{row.path}</a></td><td>{LANDING_KIND_LABEL[row.kind] || row.kind}</td><td>{row.users}</td><td>{row.sessions}</td><td>{row.clicks}</td><td>{row.impressions}</td><td>{(row.ctr * 100).toFixed(1)}%</td><td>{row.position ? row.position.toFixed(1) : "—"}</td></tr>)}</tbody></table></div> : <p>Sem entradas por busca orgânica no período.</p>}</section>
            <section className="analytics-section"><p className="analytics-kicker">Comportamento</p><h3>Comportamento no Clarity</h3>
            {analytics.clarity?.message && <div className="form-notice" role="status">{analytics.clarity.message}</div>}
            {analytics.clarity?.available ? <div className="stats analytics-stats clarity-stats"><div><span>Sessões</span><b>{analytics.clarity.sessions}</b></div><div><span>Usuários</span><b>{analytics.clarity.users}</b></div><div><span>Páginas por sessão</span><b>{analytics.clarity.pagesPerSession.toFixed(1)}</b></div><div><span>Rolagem média</span><b>{analytics.clarity.scrollDepth.toFixed(0)}%</b></div><div><span>Engajamento</span><b>{analytics.clarity.engagementTimeSeconds.toFixed(0)}s</b></div><div><span>Cliques mortos</span><b>{analytics.clarity.deadClicks}</b></div><div><span>Rage clicks</span><b>{analytics.clarity.rageClicks}</b></div><div><span>Retornos rápidos</span><b>{analytics.clarity.quickbacks}</b></div><div><span>Erros de script</span><b>{analytics.clarity.scriptErrors}</b></div></div> : <p>Os dados comportamentais aparecerão quando a integração do Clarity estiver disponível.</p>}</section>
            <small>Atualizado em {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleString("pt-BR") : "agora"}. Dados podem levar até 24–48 h para consolidar.</small>
          </>}
        </div>}
        {activeSection === "overview" && <>
        <div className="admin-card curation-card">
          <h2>Curadoria da vitrine</h2>
          <p>
            Personalize a apresentação sem alterar preço, estoque ou anúncio do
            marketplace.
          </p>
          <div className="curation-list">
            {products.map((product) => (
              <CurationRow
                key={product.id}
                product={product}
                onSaved={(saved) => {
                  setProducts((current) =>
                    current.map((item) =>
                      item.id === saved.id ? saved : item,
                    ),
                  );
                  setNotice("Curadoria salva.");
                }}
              />
            ))}
          </div>
        </div>
        <div className="admin-grid">
          <div className="admin-card">
            <h2>Importar anúncios em lote</h2>
            <p>
              Envie CSV ou XLS exportado do Mercado Livre, Shopee ou outro
              marketplace. Revise antes de confirmar.
            </p>
            <label className="upload">
              <UploadSimple /> Selecionar planilha
              <input
                hidden
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={(event) =>
                  event.target.files?.[0] && readFile(event.target.files[0])
                }
              />
            </label>
            {preview.length > 0 && (
              <>
                <p>
                  <b>{preview.length} linhas prontas para revisão</b>
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(preview[0])
                          .slice(0, 5)
                          .map((key) => (
                            <th key={key}>{key}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 8).map((row, index) => (
                        <tr key={index}>
                          {Object.values(row)
                            .slice(0, 5)
                            .map((value, cell) => (
                              <td key={cell}>{String(value)}</td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="button primary" onClick={confirmImport}>
                  Confirmar importação
                </button>
              </>
            )}
          </div>
          <form className="admin-card manual-form" onSubmit={createProduct}>
            <h2>Cadastrar anúncio manualmente</h2>
            <label>
              Título
              <input name="title" required minLength={8} />
            </label>
            <label>
              Descrição
              <textarea name="description" required minLength={20} />
            </label>
            <div>
              <label>
                Preço
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Estoque
                <input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue="0"
                  required
                />
              </label>
            </div>
            <label>
              Marketplace
              <select name="marketplace">
                <option value="mercado-livre">Mercado Livre</option>
                <option value="shopee">Shopee</option>
              </select>
            </label>
            <label>
              Link do anúncio
              <input name="url" type="url" required placeholder="https://..." />
            </label>
            <label>
              URL da imagem
              <input name="image" type="url" placeholder="https://..." />
            </label>
            <button className="button primary">Salvar rascunho</button>
          </form>
        </div>
        </>}
      </section>
    </main>
  );
}
