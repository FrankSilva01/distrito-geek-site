import { Link, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { CatalogPage } from "../pages/CatalogPage";
import { ContactPage } from "../pages/ContactPage";
import { FaqPage } from "../pages/FaqPage";
import { HomePage } from "../pages/HomePage";
import { ProductPage } from "../pages/ProductPage";
import { SeoLandingPage } from "../pages/SeoLandingPage";
import { SEO_LANDINGS } from "../seo/landing-pages";
import { resetConsent } from "../analytics/events";
import { Seo } from "../components/Seo";
import { EngagementProvider } from "../data/product-engagement";
import { ComparisonTray } from "../components/ComparisonTray";
import { BackToTop } from "../components/BackToTop";
import { ConsentBanner } from "../analytics/ConsentBanner";
import { FavoritesPage } from "../pages/FavoritesPage";
import { ComparePage } from "../pages/ComparePage";
import { GuidesPage } from "../pages/GuidesPage";
import "../styles/product-engagement.css";
import "../styles/editorial.css";
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!navigator.userAgent.toLowerCase().includes("jsdom"))
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}
function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const privacy = kind === "privacy";
  return (
    <main className="container page narrow legal-page">
      <p className="eyebrow">Distrito Geek</p>
      <h1>{privacy ? "Política de Privacidade" : "Termos de uso"}</h1>
      <p>
        {privacy
          ? "Usamos os dados necessários para responder contatos e operar o catálogo. Com sua autorização, ferramentas de medição ajudam a entender o uso do site. A compra é concluída diretamente no marketplace escolhido."
          : "A Distrito Geek apresenta produtos e direciona a compra para anúncios oficiais de marketplaces. Preço, disponibilidade, pagamento, entrega e garantias seguem as condições exibidas no anúncio de destino."}
      </p>
      {privacy && (
        <button
          className="button secondary"
          type="button"
          onClick={resetConsent}
        >
          Revisar preferências de privacidade
        </button>
      )}
      <p>
        Em caso de dúvida, escreva para{" "}
        <a href="mailto:contato@distritogeek.com.br">
          contato@distritogeek.com.br
        </a>
        .
      </p>
    </main>
  );
}
/**
 * O corpo dos artigos vive em src/content/guides.ts, importado só por esta página. Carregar
 * sob demanda mantém a prosa de todos os guias fora do bundle inicial — home, catálogo e
 * produto não baixam nada disso. O hub /guias usa apenas o índice leve e segue estático.
 */
const GuidePage = lazy(() =>
  import("../pages/GuidePage").then((module) => ({
    default: module.GuidePage,
  })),
);

const AdminPage = lazy(() =>
  import("../admin/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);
export function AppRoutes() {
  const admin = useLocation().pathname.startsWith("/admin");
  return (
    <EngagementProvider>
      <ScrollToTop />
      <Seo />
      {!admin && <SiteHeader />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        {SEO_LANDINGS.map((landing) => (
          <Route
            key={landing.path}
            path={landing.path}
            element={<SeoLandingPage />}
          />
        ))}
        <Route path="/categoria/:slug" element={<CatalogPage />} />
        <Route path="/produto/:slug" element={<ProductPage />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
        <Route path="/comparar" element={<ComparePage />} />
        <Route path="/guias" element={<GuidesPage />} />
        <Route
          path="/guias/:slug"
          element={
            <Suspense fallback={<main className="container page"><div className="catalog-state" role="status">Carregando guia…</div></main>}>
              <GuidePage />
            </Suspense>
          }
        />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route
          path="/politica-de-privacidade"
          element={<LegalPage kind="privacy" />}
        />
        <Route path="/termos" element={<LegalPage kind="terms" />} />
        <Route
          path="/admin/*"
          element={
            <Suspense
              fallback={
                <main className="admin-login">
                  <p>Carregando painel…</p>
                </main>
              }
            >
              <AdminPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <main className="container page not-found">
              <p className="eyebrow">404</p>
              <h1>Essa aventura levou você para um lugar desconhecido.</h1>
              <Link className="button primary" to="/categoria/todos">
                Voltar ao catálogo
              </Link>
            </main>
          }
        />
      </Routes>
      {!admin && <SiteFooter />}
      {!admin && <ComparisonTray />}
      {!admin && <BackToTop />}
      {/* Fora do admin de propósito: o painel não é conteúdo público e não deve carregar GTM
          nem Clarity. Sem o banner, `loadTagManager` nunca é chamado nessas rotas, então a
          navegação administrativa para de poluir as métricas do site. */}
      {!admin && <ConsentBanner />}
    </EngagementProvider>
  );
}
