import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { track } from "../analytics/events";
import { ProductCard } from "../components/ProductCard";
import { useCatalog, useCatalogStatus } from "../data/catalog-provider";
import {
  landingByPath,
  productsForLanding,
  SEO_LANDINGS,
} from "../seo/landing-pages";
// Índice leve: a landing precisa só do título e do tempo de leitura dos guias.
import { guideSummaryBySlug } from "../content/guides-index";

export function SeoLandingPage() {
  const { pathname } = useLocation(),
    catalog = useCatalog(),
    { loading, error } = useCatalogStatus();
  const landing = landingByPath(pathname);
  const products = landing ? productsForLanding(landing, catalog) : [];
  useEffect(() => {
    if (landing) track({ event: "view_category", category: landing.path, result_count: products.length });
  }, [landing, products.length]);
  if (!landing) return null;
  const related = SEO_LANDINGS.filter((item) =>
    landing.relatedPaths.includes(item.path),
  );
  const guides = landing.guideSlugs.map(guideSummaryBySlug).filter((guide) => guide !== undefined);
  return (
    <main className="container seo-landing">
      <nav className="breadcrumbs" aria-label="Navegação estrutural">
        <Link to="/">Início</Link> / {landing.h1}
      </nav>
      <header className="landing-intro">
        <p className="eyebrow">Guia de seleção</p>
        <h1>{landing.h1}</h1>
        <p>{landing.intro}</p>
      </header>
      <section className="section landing-products">
        <header className="section-title left">
          <p>Produtos relacionados</p>
          <h2>Explore a seleção</h2>
        </header>
        {loading ? (
          <div className="catalog-state" role="status">
            Atualizando catálogo…
          </div>
        ) : error ? (
          <div className="catalog-state error" role="alert">
            {error}
          </div>
        ) : products.length ? (
          <div className="product-grid">
            {products.slice(0, 12).map((product, index) => (
              <ProductCard key={product.id} product={product} listId="landing" position={index + 1} />
            ))}
          </div>
        ) : (
          <div className="catalog-state">
            Ainda não há produtos ativos nesta seleção.
          </div>
        )}
      </section>
      <section className="landing-content">
        {landing.sections.map((section) => (
          <article key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>
      {landing.faq.length > 0 && (
        <section className="landing-faq">
          <h2>Perguntas frequentes</h2>
          {landing.faq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      )}
      {guides.length > 0 && (
        <section className="landing-guides" aria-labelledby="guias-categoria">
          <header>
            <p className="eyebrow">Conteúdo Distrito Geek</p>
            <h2 id="guias-categoria">{landing.guidesHeading || "Aprenda mais sobre miniaturas"}</h2>
          </header>
          <div className="product-guide-links">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                to={`/guias/${guide.slug}`}
                onClick={() => track({ event: "category_guide_click", category: landing.path, destination_slug: guide.slug })}
              >
                <b>{guide.title}</b>
                <small>{guide.readingMinutes} min de leitura</small>
              </Link>
            ))}
          </div>
        </section>
      )}
      {related.length > 0 && (
        <nav className="landing-related" aria-label="Categorias relacionadas">
          <b>Continue explorando</b>
          {related.map((item) => (
            <Link key={item.path} to={item.path}>
              {item.h1}
            </Link>
          ))}
        </nav>
      )}
    </main>
  );
}
