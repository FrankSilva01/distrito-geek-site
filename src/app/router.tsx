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
const AdminPage = lazy(() =>
  import("../admin/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);
export function AppRoutes() {
  const admin = useLocation().pathname.startsWith("/admin");
  return (
    <>
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
    </>
  );
}
